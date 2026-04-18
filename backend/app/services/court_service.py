"""
CourtService — court and schedule management.

Responsibilities:
  - CRUD for courts and blackouts
  - Validate blackout windows don't conflict with existing confirmed bookings
  - Set operating hours and pricing rules
  - Recurring booking creation (leagues, coaching sessions)
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from dateutil.rrule import rrulestr
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.booking import (
    Booking,
    BookingPlayer,
    BookingStatus,
    BookingType,
    InviteStatus,
    PaymentStatus,
    PlayerRole,
)
from app.db.models.club import Club, PricingRule
from app.db.models.court import CalendarReservation, CalendarReservationType, Court
from app.db.models.user import User

_MAX_OCCURRENCES = 104  # safety cap: ~2 years of weekly sessions


class CourtService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_blackout(self, court_id: str, start_datetime, end_datetime,
                               reason: str, created_by_staff_id: str) -> dict:
        """
          1. Check for confirmed bookings that overlap the blackout window
          2. If conflicts exist: return them as warnings (staff decides whether to proceed)
          3. Create CourtBlackout record
          4. If overriding conflicting bookings: cancel them and trigger refunds
        """
        pass

    async def set_operating_hours(self, club_id: str, hours: list) -> list:
        """
        Replace all OperatingHours for a club.
        hours = [{ day_of_week: 0, open_time: "07:00", close_time: "22:00" }, ...]
        Validates open_time < close_time for each day.
        """
        pass

    async def set_pricing_rules(self, club_id: str, rules: list) -> list:
        """
        Replace all PricingRules for a club.
        Validates no overlapping time windows on the same day_of_week.
        """
        pass

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_club_and_court(
        self, club_id: uuid.UUID, court_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> tuple[Club, Court]:
        club_result = await self.db.execute(
            select(Club).where(Club.id == club_id, Club.tenant_id == tenant_id)
        )
        club = club_result.scalar_one_or_none()
        if not club:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

        court_result = await self.db.execute(
            select(Court).where(Court.id == court_id, Court.club_id == club_id)
        )
        court = court_result.scalar_one_or_none()
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        if not court.is_active:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Court is not active")
        return club, court

    async def _check_no_conflict(
        self, court_id: uuid.UUID, start: datetime, end: datetime
    ) -> bool:
        result = await self.db.execute(
            select(Booking.id).where(
                Booking.court_id == court_id,
                Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
                Booking.start_datetime < end,
                Booking.end_datetime > start,
            )
        )
        return result.scalar_one_or_none() is not None

    async def _check_no_blackout(
        self, court_id: uuid.UUID, start: datetime, end: datetime
    ) -> bool:
        result = await self.db.execute(
            select(CalendarReservation.id).where(
                CalendarReservation.court_id == court_id,
                CalendarReservation.reservation_type == CalendarReservationType.maintenance,
                CalendarReservation.start_datetime < end,
                CalendarReservation.end_datetime > start,
            )
        )
        return result.scalar_one_or_none() is not None

    async def _get_price(
        self, club_id: uuid.UUID, start: datetime
    ) -> Optional[Decimal]:
        day_of_week = start.weekday()
        slot_time = start.time()
        now = datetime.now(tz=timezone.utc)
        result = await self.db.execute(
            select(PricingRule).where(
                PricingRule.club_id == club_id,
                PricingRule.day_of_week == day_of_week,
                PricingRule.is_active,
                PricingRule.start_time <= slot_time,
                PricingRule.end_time > slot_time,
            )
        )
        rule = result.scalar_one_or_none()
        if not rule:
            return None
        if rule.incentive_price and (rule.incentive_expires_at is None or rule.incentive_expires_at > now):
            return rule.incentive_price
        return rule.price_per_slot

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    async def create_recurring_booking(
        self,
        tenant_id: uuid.UUID,
        club_id: uuid.UUID,
        court_id: uuid.UUID,
        booking_type: BookingType,
        first_start: datetime,
        recurrence_rule: str,
        recurrence_end_date,
        created_by_user: User,
        staff_profile_id: Optional[uuid.UUID],
        player_user_ids: list[uuid.UUID],
        notes: Optional[str],
        event_name: Optional[str],
        contact_name: Optional[str],
        contact_email: Optional[str],
        contact_phone: Optional[str],
        max_players: int,
        skip_conflicts: bool = False,
    ) -> dict:
        """
        Create a series of bookings from an iCal RRULE (staff only).

        - Expands the RRULE from first_start up to recurrence_end_date (inclusive),
          capped at _MAX_OCCURRENCES.
        - Per occurrence: checks court conflict and blackout.
          If skip_conflicts=False any conflict raises 409 immediately.
          If skip_conflicts=True conflicting occurrences are skipped and reported.
        - All valid occurrences are created in one transaction with the first booking
          acting as parent (parent_booking_id=None) and subsequent ones linking to it.
        - Returns {"created": [BookingResponse…], "skipped": [{"occurrence": datetime, "reason": str}…]}
        """
        _, court = await self._get_club_and_court(club_id, court_id, tenant_id)
        club_result = await self.db.execute(
            select(Club).where(Club.id == club_id)
        )
        club = club_result.scalar_one()

        duration = timedelta(minutes=club.booking_duration_minutes)

        # Expand RRULE
        try:
            rule = rrulestr(recurrence_rule, dtstart=first_start, ignoretz=False)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid recurrence_rule: {exc}",
            )

        # Collect occurrences within end date, capped
        end_boundary = None
        if recurrence_end_date:
            end_boundary = datetime(
                recurrence_end_date.year,
                recurrence_end_date.month,
                recurrence_end_date.day,
                23, 59, 59,
                tzinfo=first_start.tzinfo,
            )

        occurrences: list[datetime] = []
        for dt in rule:
            if end_boundary and dt > end_boundary:
                break
            occurrences.append(dt)
            if len(occurrences) >= _MAX_OCCURRENCES:
                break

        if not occurrences:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Recurrence rule produces no occurrences within the given date range",
            )

        # Resolve named players once
        named_users: list[User] = []
        for uid in player_user_ids:
            if uid == created_by_user.id:
                continue
            r = await self.db.execute(
                select(User).where(User.id == uid, User.tenant_id == tenant_id)
            )
            u = r.scalar_one_or_none()
            if not u:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Player {uid} not found in this tenant",
                )
            named_users.append(u)

        created_bookings: list[Booking] = []
        skipped: list[dict] = []
        parent_id: Optional[uuid.UUID] = None
        requesting_user_id = created_by_user.id

        for occurrence_start in occurrences:
            occurrence_end = occurrence_start + duration

            if await self._check_no_conflict(court_id, occurrence_start, occurrence_end):
                if skip_conflicts:
                    skipped.append({"occurrence": occurrence_start, "reason": "court conflict"})
                    continue
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Court is already booked at {occurrence_start.isoformat()}",
                )

            if await self._check_no_blackout(court_id, occurrence_start, occurrence_end):
                if skip_conflicts:
                    skipped.append({"occurrence": occurrence_start, "reason": "court blackout"})
                    continue
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Court is under maintenance at {occurrence_start.isoformat()}",
                )

            total_price = await self._get_price(club_id, occurrence_start)
            amount_due = (total_price / max_players) if total_price else Decimal("0.00")

            booking = Booking(
                club_id=club_id,
                court_id=court_id,
                booking_type=booking_type,
                status=BookingStatus.confirmed,
                start_datetime=occurrence_start,
                end_datetime=occurrence_end,
                created_by_user_id=requesting_user_id,
                staff_profile_id=staff_profile_id,
                max_players=max_players,
                is_open_game=False,
                is_recurring=True,
                recurrence_rule=recurrence_rule,
                recurrence_end_date=recurrence_end_date,
                parent_booking_id=parent_id,
                total_price=total_price,
                notes=notes,
                event_name=event_name,
                contact_name=contact_name,
                contact_email=contact_email,
                contact_phone=contact_phone,
            )
            self.db.add(booking)
            await self.db.flush()

            if parent_id is None:
                parent_id = booking.id
                booking.parent_booking_id = None  # first booking is the parent

            organiser_bp = BookingPlayer(
                booking=booking,
                user=created_by_user,
                role=PlayerRole.organiser,
                invite_status=InviteStatus.accepted,
                payment_status=PaymentStatus.pending,
                amount_due=amount_due,
            )
            self.db.add(organiser_bp)

            for named_user in named_users:
                self.db.add(BookingPlayer(
                    booking=booking,
                    user=named_user,
                    role=PlayerRole.player,
                    invite_status=InviteStatus.accepted,
                    payment_status=PaymentStatus.pending,
                    amount_due=amount_due,
                ))

            await self.db.flush()
            created_bookings.append(booking)

        if not created_bookings:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="All occurrences conflict with existing bookings or blackouts — nothing was created",
            )

        await self.db.commit()

        # Reload with relationships for response building
        loaded: list[Booking] = []
        for b in created_bookings:
            r = await self.db.execute(
                select(Booking)
                .options(
                    selectinload(Booking.players).selectinload(BookingPlayer.user),
                    selectinload(Booking.court),
                )
                .where(Booking.id == b.id)
            )
            loaded.append(r.scalar_one())

        return {"created": loaded, "skipped": skipped}
