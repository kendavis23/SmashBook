"""
Court utilisation computation + read service (Sprint 7 / G7).

Two layers live here:

1. A **pure** computation core (``compute_court_day_snapshots``) that turns a
   day's bookings, operating hours, pricing rules and calendar reservations into
   ``court_utilisation_snapshots`` rows. It touches no database, so it is unit
   testable without fixtures.

2. ``CourtUtilisationService`` — an async wrapper that fetches the inputs from
   the **read replica**, calls the pure core, and exposes read queries for the
   API. Writes (the snapshot upsert) are owned by the worker, not this service.

Design notes
------------
* **Slot-anchored** (locked decision, 2026-05-31): the day's bookable slots are
  generated over the full operating-hours window stepping by the club's
  ``booking_duration_minutes``. Each slot — and each booking/reservation — is
  attributed to the hour its *start* falls in. The ``hour_of_day = NULL``
  daily-rollup row is the authoritative denominator; the hourly rows distribute
  it. This avoids fractional-slot accounting when the booking duration is not a
  whole number of hours (90 min is the default).
* **Club-local time** (CLAUDE rule 4): operational timestamps are UTC; slots are
  generated in the club's local timezone and bookings are converted into it
  before anchoring.
* A slot covered by a calendar reservation (maintenance, private hire, etc.) is
  removed from the denominator entirely — it was never bookable.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date as DateType, datetime, time as TimeType, timedelta
from decimal import Decimal
from typing import Iterable, Optional, Sequence
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.booking import Booking, BookingStatus
from app.db.models.club import Club, OperatingHours, PricingRule
from app.db.models.court import CalendarReservation, Court

# A slot is "occupied" by a revenue-bearing booking in these states. Pending
# holds expire and cancelled slots are free again, so neither counts.
OCCUPYING_STATUSES: frozenset[BookingStatus] = frozenset(
    {BookingStatus.confirmed, BookingStatus.completed}
)

_ZERO = Decimal("0")


# ---------------------------------------------------------------------------
# Pure computation inputs/outputs
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class OperatingWindow:
    open_time: TimeType
    close_time: TimeType


@dataclass(frozen=True)
class PricingWindow:
    day_of_week: int
    start_time: TimeType
    end_time: TimeType
    price_per_slot: Decimal


@dataclass(frozen=True)
class BookingInput:
    start_local: datetime           # club-local, tz-aware
    status: BookingStatus
    total_price: Optional[Decimal]
    created_at: Optional[datetime]  # UTC, tz-aware — for lead-time


@dataclass(frozen=True)
class ReservationInput:
    start_local: datetime           # club-local, tz-aware
    end_local: datetime             # club-local, tz-aware


@dataclass(frozen=True)
class SnapshotRow:
    snapshot_date: DateType
    hour_of_day: Optional[int]      # None == daily rollup
    day_of_week: int
    total_slots: int
    booked_slots: int
    utilisation_pct: Decimal
    revenue_actual: Decimal
    revenue_potential: Decimal
    avg_booking_lead_time_h: Optional[Decimal]


def _utilisation_pct(booked: int, total: int) -> Decimal:
    if total <= 0:
        return _ZERO
    return (Decimal(booked) / Decimal(total) * Decimal(100)).quantize(Decimal("0.01"))


def _price_for(slot_start: datetime, pricing: Sequence[PricingWindow]) -> Decimal:
    """Base ``price_per_slot`` for the slot's local start time, or 0 if no rule
    matches. Mirrors PricingService rule selection (day_of_week + start<=t<end)."""
    dow = slot_start.weekday()
    t = slot_start.time()
    for rule in pricing:
        if rule.day_of_week == dow and rule.start_time <= t < rule.end_time:
            return Decimal(str(rule.price_per_slot))
    return _ZERO


def compute_court_day_snapshots(
    *,
    snapshot_date: DateType,
    tz: ZoneInfo,
    booking_duration_minutes: int,
    windows: Iterable[OperatingWindow],
    pricing: Sequence[PricingWindow],
    bookings: Sequence[BookingInput],
    reservations: Sequence[ReservationInput],
) -> list[SnapshotRow]:
    """Compute hourly + daily-rollup snapshot rows for one court on one day.

    Returns an empty list when the club is closed that day (no operating
    window) — there is nothing to snapshot.
    """
    day_of_week = snapshot_date.weekday()
    step = timedelta(minutes=booking_duration_minutes)
    if booking_duration_minutes <= 0:
        raise ValueError("booking_duration_minutes must be positive")

    # Bucket accumulators keyed by hour-of-day.
    @dataclass
    class _Bucket:
        total_slots: int = 0
        booked_slots: int = 0
        revenue_actual: Decimal = _ZERO
        revenue_potential: Decimal = _ZERO
        lead_time_sum: Decimal = _ZERO
        lead_time_n: int = 0

    buckets: dict[int, _Bucket] = {}

    # Index bookings by the hour their (occupying) start falls in.
    occupying = [b for b in bookings if b.status in OCCUPYING_STATUSES]

    for window in windows:
        slot_start = datetime.combine(snapshot_date, window.open_time, tzinfo=tz)
        close_dt = datetime.combine(snapshot_date, window.close_time, tzinfo=tz)
        while slot_start + step <= close_dt:
            slot_end = slot_start + step

            # A slot covered by a reservation was never bookable → drop it
            # entirely (don't even open an hour bucket for an all-blocked hour).
            blocked = any(
                r.start_local < slot_end and r.end_local > slot_start
                for r in reservations
            )
            if blocked:
                slot_start = slot_end
                continue

            bucket = buckets.setdefault(slot_start.hour, _Bucket())
            bucket.total_slots += 1
            bucket.revenue_potential += _price_for(slot_start, pricing)

            # Slot-anchored: a booking belongs to the slot its start falls in.
            slot_bookings = [
                b for b in occupying if slot_start <= b.start_local < slot_end
            ]
            if slot_bookings:
                bucket.booked_slots += 1
                for b in slot_bookings:
                    if b.total_price is not None:
                        bucket.revenue_actual += Decimal(str(b.total_price))
                    if b.created_at is not None:
                        lead_h = (
                            b.start_local.astimezone(b.created_at.tzinfo)
                            - b.created_at
                        ).total_seconds() / 3600.0
                        if lead_h >= 0:
                            bucket.lead_time_sum += Decimal(str(lead_h))
                            bucket.lead_time_n += 1

            slot_start = slot_end

    if not buckets:
        return []

    rows: list[SnapshotRow] = []
    day = _Bucket()
    for hour in sorted(buckets):
        b = buckets[hour]
        rows.append(
            SnapshotRow(
                snapshot_date=snapshot_date,
                hour_of_day=hour,
                day_of_week=day_of_week,
                total_slots=b.total_slots,
                booked_slots=b.booked_slots,
                utilisation_pct=_utilisation_pct(b.booked_slots, b.total_slots),
                revenue_actual=b.revenue_actual,
                revenue_potential=b.revenue_potential,
                avg_booking_lead_time_h=(
                    (b.lead_time_sum / b.lead_time_n).quantize(Decimal("0.1"))
                    if b.lead_time_n
                    else None
                ),
            )
        )
        day.total_slots += b.total_slots
        day.booked_slots += b.booked_slots
        day.revenue_actual += b.revenue_actual
        day.revenue_potential += b.revenue_potential
        day.lead_time_sum += b.lead_time_sum
        day.lead_time_n += b.lead_time_n

    # Daily-rollup row (hour_of_day = NULL) — the authoritative denominator.
    rows.append(
        SnapshotRow(
            snapshot_date=snapshot_date,
            hour_of_day=None,
            day_of_week=day_of_week,
            total_slots=day.total_slots,
            booked_slots=day.booked_slots,
            utilisation_pct=_utilisation_pct(day.booked_slots, day.total_slots),
            revenue_actual=day.revenue_actual,
            revenue_potential=day.revenue_potential,
            avg_booking_lead_time_h=(
                (day.lead_time_sum / day.lead_time_n).quantize(Decimal("0.1"))
                if day.lead_time_n
                else None
            ),
        )
    )
    return rows


# ---------------------------------------------------------------------------
# Async service — fetches inputs from the read replica, exposes read queries
# ---------------------------------------------------------------------------


class CourtUtilisationService:
    """Reads come from the replica. The snapshot *write* path lives in the
    worker (``app/analytics/workers/snapshot_court_utilisation.py``)."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def gather_court_day(
        self,
        *,
        club: Club,
        court_id: UUID,
        snapshot_date: DateType,
    ) -> list[SnapshotRow]:
        """Fetch this court's inputs for ``snapshot_date`` and compute rows.

        Used by the worker. ``club`` carries ``timezone`` and
        ``booking_duration_minutes``; both are read here, not re-queried.
        """
        tz = ZoneInfo(club.timezone)
        day_of_week = snapshot_date.weekday()

        # Day boundaries in club-local time, expressed as UTC for the query.
        day_start_local = datetime.combine(snapshot_date, TimeType.min, tzinfo=tz)
        day_end_local = day_start_local + timedelta(days=1)
        day_start_utc = day_start_local.astimezone(ZoneInfo("UTC"))
        day_end_utc = day_end_local.astimezone(ZoneInfo("UTC"))

        windows = [
            OperatingWindow(oh.open_time, oh.close_time)
            for oh in await self._operating_hours(club.id, snapshot_date, day_of_week)
        ]
        if not windows:
            return []

        pricing = [
            PricingWindow(pr.day_of_week, pr.start_time, pr.end_time,
                          Decimal(str(pr.price_per_slot)))
            for pr in await self._pricing_rules(club.id, snapshot_date, day_of_week)
        ]

        booking_rows = (
            await self.db.execute(
                select(Booking).where(
                    Booking.court_id == court_id,
                    Booking.start_datetime >= day_start_utc,
                    Booking.start_datetime < day_end_utc,
                )
            )
        ).scalars().all()
        bookings = [
            BookingInput(
                start_local=b.start_datetime.astimezone(tz),
                status=b.status,
                total_price=b.total_price,
                created_at=b.created_at,
            )
            for b in booking_rows
        ]

        # Court-specific reservations + club-wide ones (court_id NULL) that
        # overlap the day.
        reservation_rows = (
            await self.db.execute(
                select(CalendarReservation).where(
                    CalendarReservation.club_id == club.id,
                    (CalendarReservation.court_id == court_id)
                    | (CalendarReservation.court_id.is_(None)),
                    CalendarReservation.start_datetime < day_end_utc,
                    CalendarReservation.end_datetime > day_start_utc,
                )
            )
        ).scalars().all()
        reservations = [
            ReservationInput(
                start_local=r.start_datetime.astimezone(tz),
                end_local=r.end_datetime.astimezone(tz),
            )
            for r in reservation_rows
        ]

        return compute_court_day_snapshots(
            snapshot_date=snapshot_date,
            tz=tz,
            booking_duration_minutes=club.booking_duration_minutes,
            windows=windows,
            pricing=pricing,
            bookings=bookings,
            reservations=reservations,
        )

    async def active_courts(self, club_id: UUID) -> list[Court]:
        return list(
            (
                await self.db.execute(
                    select(Court).where(
                        Court.club_id == club_id, Court.is_active.is_(True)
                    )
                )
            ).scalars().all()
        )

    async def _operating_hours(
        self, club_id: UUID, on: DateType, day_of_week: int
    ) -> Sequence[OperatingHours]:
        return (
            await self.db.execute(
                select(OperatingHours).where(
                    OperatingHours.club_id == club_id,
                    OperatingHours.day_of_week == day_of_week,
                    (OperatingHours.valid_from.is_(None))
                    | (OperatingHours.valid_from <= on),
                    (OperatingHours.valid_until.is_(None))
                    | (OperatingHours.valid_until >= on),
                )
            )
        ).scalars().all()

    async def _pricing_rules(
        self, club_id: UUID, on: DateType, day_of_week: int
    ) -> Sequence[PricingRule]:
        return (
            await self.db.execute(
                select(PricingRule).where(
                    PricingRule.club_id == club_id,
                    PricingRule.day_of_week == day_of_week,
                    PricingRule.is_active.is_(True),
                    (PricingRule.valid_from.is_(None))
                    | (PricingRule.valid_from <= on),
                    (PricingRule.valid_until.is_(None))
                    | (PricingRule.valid_until >= on),
                )
            )
        ).scalars().all()
