"""
CourtService — court and schedule management.

Responsibilities:
  - CRUD for courts and blackouts
  - Validate blackout windows don't conflict with existing confirmed bookings
  - Set operating hours and pricing rules
  - Recurring booking creation (leagues, coaching sessions)
"""
import uuid
from datetime import date as DateType, datetime, time as TimeType, timedelta, timezone
from decimal import Decimal
from typing import Optional

from dateutil.rrule import rrulestr
from fastapi import HTTPException, status
from sqlalchemy import or_, select
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
from app.core.timezones import club_tz, local_walltime_to_utc, utc_to_local
from app.db.models.club import Club, OperatingHours, PricingRule
from app.db.models.court import CalendarReservation, CalendarReservationType, Court, SurfaceType
from app.db.models.user import User
from app.services.pricing_service import PricingService

_MAX_OCCURRENCES = 104  # safety cap: ~2 years of weekly sessions
_AVAILABILITY_DEFAULT_LIMIT = 40
_AVAILABILITY_MAX_SCAN_DAYS = 60  # safety cap when end_date is omitted


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
        self, club_id: uuid.UUID, start: datetime, booking_type: BookingType
    ) -> Optional[Decimal]:
        pricing_svc = PricingService(self.db)
        breakdown = await pricing_svc.calculate(
            club_id, start, max_players=1, user_id=None, booking_type=booking_type
        )
        return breakdown.unit_price if breakdown else None

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

        # Expand the RRULE in the club's LOCAL zone, not in UTC. first_start is a
        # true-UTC instant; a recurring lesson must recur on the same local
        # wall-clock (a weekly 18:00 stays 18:00 local), so DST transitions shift
        # the underlying UTC instant by an hour rather than silently moving the
        # lesson. Expanding against a UTC dtstart would freeze the UTC offset and
        # drift the local time across DST. Each occurrence is converted back to
        # true UTC for storage / conflict checks below.
        tz = club_tz(club)
        first_start_local = utc_to_local(first_start, tz)
        try:
            rule = rrulestr(recurrence_rule, dtstart=first_start_local, ignoretz=False)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid recurrence_rule: {exc}",
            )

        # Collect occurrences within end date, capped. recurrence_end_date is a
        # club-local calendar date; bound it at local end-of-day so the comparison
        # happens in the same zone the rule is expanding in.
        end_boundary = None
        if recurrence_end_date:
            end_boundary = datetime(
                recurrence_end_date.year,
                recurrence_end_date.month,
                recurrence_end_date.day,
                23, 59, 59,
                tzinfo=tz,
            )

        occurrences: list[datetime] = []
        for dt in rule:
            if end_boundary and dt > end_boundary:
                break
            # Store and check conflicts as true-UTC instants.
            occurrences.append(dt.astimezone(timezone.utc))
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

            total_price = await self._get_price(club_id, occurrence_start, booking_type)
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

    # ------------------------------------------------------------------
    # Club availability — bookable slots + joinable open matches
    # ------------------------------------------------------------------

    async def get_availability(
        self,
        tenant_id: uuid.UUID,
        club_id: uuid.UUID,
        start_date: DateType,
        end_date: Optional[DateType],
        surface: Optional[SurfaceType],
        from_time: Optional[TimeType],
        to_time: Optional[TimeType],
        requesting_user: User,
        limit: int = _AVAILABILITY_DEFAULT_LIMIT,
    ) -> dict:
        """
        Chronologically-ordered list of slots (per day) the requesting user can act on:
        either book an empty court ("initiate a match") or join an existing open game.

        Behaviour:
          - Slots are sized by `club.booking_duration_minutes` within club operating hours.
          - `from_time`/`to_time` (if provided) clamp every day in the range.
          - `surface` filters which courts are considered (does NOT filter existing matches,
            since the match's court is what it is — its surface is implicit in `courts[]`).
          - Joinable open games are filtered to the requesting user's own skill level: only games
            whose skill range contains it (or have no skill restriction) are shown. A user with no
            skill level set sees all open games. Has no effect on empty courts.
          - Open games the requesting user is already an active player in (accepted/pending) are
            excluded from `existing_matches`. Games they declined/left remain so they can re-join.
          - A slot is omitted entirely if it has neither available courts nor joinable matches.
          - When `end_date` is None: scan forward (up to a safety cap of _AVAILABILITY_MAX_SCAN_DAYS)
            until `limit` slot rows are emitted, then return a `next_cursor` for the FE.
          - When `end_date` is given: return every matching slot in the range, no cap, no cursor.
          - Past slots and slots violating `min_booking_notice_hours` / `max_advance_booking_days`
            are dropped from `available_courts`. They can still surface as `existing_matches`
            because those bookings already exist — joining doesn't create a new booking.
        """
        if end_date is not None and end_date < start_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="end_date must be on or after start_date",
            )

        # Skill filter is driven by the requestor's own profile; None = no filtering.
        user_skill = (
            Decimal(str(requesting_user.skill_level))
            if requesting_user.skill_level is not None
            else None
        )

        club_result = await self.db.execute(
            select(Club).where(Club.id == club_id, Club.tenant_id == tenant_id)
        )
        club = club_result.scalar_one_or_none()
        if not club:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

        court_stmt = select(Court).where(Court.club_id == club_id, Court.is_active)
        if surface is not None:
            court_stmt = court_stmt.where(Court.surface_type == surface)
        courts_result = await self.db.execute(court_stmt)
        courts: list[Court] = list(courts_result.scalars().all())

        if not courts:
            return {
                "club_id": club_id,
                "courts": [],
                "days": [],
                "next_cursor": None,
            }

        court_ids = [c.id for c in courts]

        # Determine scan boundary
        if end_date is not None:
            scan_end = end_date
            apply_limit = False
        else:
            scan_end = start_date + timedelta(days=_AVAILABILITY_MAX_SCAN_DAYS - 1)
            apply_limit = True

        # start_date/scan_end are club-local calendar dates; the query window is
        # their club-local day bounds converted to true UTC.
        tz = club_tz(club)
        range_start_dt = local_walltime_to_utc(start_date, TimeType.min, tz)
        range_end_dt = local_walltime_to_utc(scan_end + timedelta(days=1), TimeType.min, tz)

        # Bookings in range across our courts
        bookings_result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.players))
            .where(
                Booking.court_id.in_(court_ids),
                Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
                Booking.start_datetime < range_end_dt,
                Booking.end_datetime > range_start_dt,
            )
        )
        bookings: list[Booking] = list(bookings_result.scalars().unique().all())

        bookings_by_court: dict[uuid.UUID, list[Booking]] = {cid: [] for cid in court_ids}
        for b in bookings:
            bookings_by_court[b.court_id].append(b)

        # Calendar reservations in range (court-specific OR club-wide where court_id IS NULL)
        reservations_result = await self.db.execute(
            select(CalendarReservation).where(
                CalendarReservation.club_id == club_id,
                or_(
                    CalendarReservation.court_id.in_(court_ids),
                    CalendarReservation.court_id.is_(None),
                ),
                CalendarReservation.start_datetime < range_end_dt,
                CalendarReservation.end_datetime > range_start_dt,
            )
        )
        reservations: list[CalendarReservation] = list(reservations_result.scalars().all())

        reservations_by_court: dict[Optional[uuid.UUID], list[CalendarReservation]] = {}
        for r in reservations:
            reservations_by_court.setdefault(r.court_id, []).append(r)

        # Operating hours and pricing rules — pull once, group by weekday
        oh_result = await self.db.execute(
            select(OperatingHours).where(
                OperatingHours.club_id == club_id,
                or_(OperatingHours.valid_from.is_(None), OperatingHours.valid_from <= scan_end),
                or_(OperatingHours.valid_until.is_(None), OperatingHours.valid_until >= start_date),
            )
        )
        oh_records: list[OperatingHours] = list(oh_result.scalars().all())

        pricing_result = await self.db.execute(
            select(PricingRule).where(
                PricingRule.club_id == club_id,
                PricingRule.is_active.is_(True),
                or_(PricingRule.valid_from.is_(None), PricingRule.valid_from <= scan_end),
                or_(PricingRule.valid_until.is_(None), PricingRule.valid_until >= start_date),
            )
        )
        pricing_rules: list[PricingRule] = list(pricing_result.scalars().all())

        pricing_by_dow: dict[int, list[PricingRule]] = {}
        for rule in pricing_rules:
            pricing_by_dow.setdefault(rule.day_of_week, []).append(rule)

        slot_duration = timedelta(minutes=club.booking_duration_minutes)
        now = datetime.now(tz=timezone.utc)
        notice_cutoff = now + timedelta(hours=club.min_booking_notice_hours)
        advance_limit = now + timedelta(days=club.max_advance_booking_days)

        days_out: list[dict] = []
        emitted_count = 0
        next_cursor: Optional[dict] = None
        cursor_set = False

        def _select_pricing(day_rules: list[PricingRule], slot_start_t: TimeType, query_date: DateType) -> tuple[Optional[Decimal], Optional[str]]:
            for rule in day_rules:
                if not (rule.start_time <= slot_start_t < rule.end_time):
                    continue
                if rule.valid_from is not None and rule.valid_from > query_date:
                    continue
                if rule.valid_until is not None and rule.valid_until < query_date:
                    continue
                if rule.incentive_price is not None and (
                    rule.incentive_expires_at is None or rule.incentive_expires_at > now
                ):
                    return Decimal(str(rule.incentive_price)), (rule.incentive_label or rule.label)
                return Decimal(str(rule.price_per_slot)), rule.label
            return None, None

        current = start_date
        while current <= scan_end and not cursor_set:
            dow = current.weekday()
            day_oh = [oh for oh in oh_records if oh.day_of_week == dow
                      and (oh.valid_from is None or oh.valid_from <= current)
                      and (oh.valid_until is None or oh.valid_until >= current)]
            if not day_oh:
                current += timedelta(days=1)
                continue
            # Prefer seasonal (valid_from set) over the catch-all row
            oh = next((h for h in day_oh if h.valid_from is not None), day_oh[0])

            # open/close + from/to clamps are club-local wall-clock; build the
            # day's window as true-UTC instants so it compares against stored
            # booking/reservation instants and notice/advance cutoffs.
            window_open = local_walltime_to_utc(current, oh.open_time, tz)
            window_close = local_walltime_to_utc(current, oh.close_time, tz)
            if from_time is not None:
                clamp_open = local_walltime_to_utc(current, from_time, tz)
                if clamp_open > window_open:
                    window_open = clamp_open
            if to_time is not None:
                clamp_close = local_walltime_to_utc(current, to_time, tz)
                if clamp_close < window_close:
                    window_close = clamp_close
            if window_open >= window_close:
                current += timedelta(days=1)
                continue

            day_rules = pricing_by_dow.get(dow, [])
            day_slots: list[dict] = []

            slot_start = window_open
            while slot_start + slot_duration <= window_close and not cursor_set:
                slot_end = slot_start + slot_duration

                bookable = slot_start >= notice_cutoff and slot_start <= advance_limit

                available_courts: list[dict] = []
                existing_matches: list[dict] = []

                for court in courts:
                    overlap_booking = next(
                        (
                            b for b in bookings_by_court.get(court.id, [])
                            if b.start_datetime < slot_end and b.end_datetime > slot_start
                        ),
                        None,
                    )
                    overlap_reservation = next(
                        (
                            r for r in (
                                reservations_by_court.get(court.id, [])
                                + reservations_by_court.get(None, [])
                            )
                            if r.start_datetime < slot_end and r.end_datetime > slot_start
                        ),
                        None,
                    )

                    if overlap_reservation is not None:
                        continue  # court blocked at this slot

                    if overlap_booking is None:
                        if not bookable:
                            continue
                        price, price_label = _select_pricing(day_rules, utc_to_local(slot_start, tz).time(), current)
                        available_courts.append({
                            "court_id": court.id,
                            "price": price,
                            "price_label": price_label,
                        })
                        continue

                    # Court has a booking — only surface it if it's a joinable open game
                    if not overlap_booking.is_open_game:
                        continue
                    accepted = sum(
                        1 for p in overlap_booking.players
                        if p.invite_status == InviteStatus.accepted
                    )
                    slots_left = max(0, (overlap_booking.max_players or 0) - accepted)
                    if slots_left <= 0:
                        continue
                    # Hide games the requestor is already actively part of (they can't re-join);
                    # a declined/released slot is left visible so they can join again.
                    if any(
                        p.user_id == requesting_user.id and p.invite_status != InviteStatus.declined
                        for p in overlap_booking.players
                    ):
                        continue
                    if user_skill is not None:
                        if overlap_booking.min_skill_level is not None and Decimal(str(overlap_booking.min_skill_level)) > user_skill:
                            continue
                        if overlap_booking.max_skill_level is not None and Decimal(str(overlap_booking.max_skill_level)) < user_skill:
                            continue
                    existing_matches.append({
                        "booking_id": overlap_booking.id,
                        "court_id": court.id,
                        "slots_available": slots_left,
                        "min_skill_level": overlap_booking.min_skill_level,
                        "max_skill_level": overlap_booking.max_skill_level,
                        "total_price": overlap_booking.total_price,
                    })

                if available_courts or existing_matches:
                    if apply_limit and emitted_count >= limit:
                        next_cursor = {
                            "date": current,
                            "from_time": utc_to_local(slot_start, tz).strftime("%H:%M"),
                        }
                        cursor_set = True
                        break
                    day_slots.append({
                        "start_time": utc_to_local(slot_start, tz).strftime("%H:%M"),
                        "end_time": utc_to_local(slot_end, tz).strftime("%H:%M"),
                        "available_count": len(available_courts),
                        "available_courts": available_courts,
                        "existing_matches": existing_matches,
                    })
                    emitted_count += 1

                slot_start = slot_end

            if day_slots:
                days_out.append({"date": current, "slots": day_slots})

            current += timedelta(days=1)

        return {
            "club_id": club_id,
            "courts": courts,
            "days": days_out,
            "next_cursor": next_cursor,
        }
