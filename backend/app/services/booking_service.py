"""
BookingService — core booking business logic.

Booking modes
-------------
- Open game (is_open_game=True):  publicly listed; anyone matching skill can self-join
- Private booking (is_open_game=False): not listed; slots filled via invite only
Both types accept players until accepted_count >= max_players (default 4 for padel).

Slot-grid enforcement
---------------------
For booking_type=regular, start_datetime must align to the slot grid derived from
operating_hours.open_time + club.booking_duration_minutes. Staff bypass for
lesson_*/corporate_event/tournament types.

Skill range
-----------
Computed at creation from organiser's skill_level ± club.skill_range_allowed, clamped
to club.skill_level_min/max.  Staff may provide an explicit anchor or override min/max.
Joins from open games are always checked; invites always bypass the check.
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
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
from app.db.models.club import Club, OperatingHours, PricingRule
from app.db.models.court import Court, CourtBlackout
from app.db.models.user import TenantUserRole, User

_STAFF_ROLES = {
    TenantUserRole.owner,
    TenantUserRole.admin,
    TenantUserRole.staff,
    TenantUserRole.trainer,
    TenantUserRole.ops_lead,
}

_GRID_ENFORCED_TYPES = {BookingType.regular}


def _is_staff(user: User) -> bool:
    return user.role in _STAFF_ROLES


def _accepted_count(players: list[BookingPlayer]) -> int:
    return sum(1 for p in players if p.invite_status == InviteStatus.accepted)


class BookingService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _get_club_and_court(self, club_id: uuid.UUID, court_id: uuid.UUID, tenant_id: uuid.UUID):
        """Fetch club + court, verifying both belong to the tenant."""
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

    async def _get_operating_hours(self, club_id: uuid.UUID, query_date) -> OperatingHours:
        day_of_week = query_date.weekday()
        oh_result = await self.db.execute(
            select(OperatingHours).where(
                OperatingHours.club_id == club_id,
                OperatingHours.day_of_week == day_of_week,
            )
        )
        oh_records = oh_result.scalars().all()
        if not oh_records:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Club has no operating hours configured for this day",
            )
        # Prefer a seasonal record whose date window covers query_date over catch-all.
        # A seasonal record has valid_from set; valid_to=None means open-ended.
        for h in oh_records:
            if h.valid_from is None:
                continue
            if h.valid_from > query_date:
                continue
            if h.valid_to is not None and h.valid_to < query_date:
                continue
            return h
        # Fall back to the catch-all (valid_from is None)
        catch_all = next((h for h in oh_records if h.valid_from is None), None)
        if catch_all:
            return catch_all
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Club has no operating hours configured for this day",
        )

    def _validate_grid_alignment(self, start: datetime, oh: OperatingHours, duration_minutes: int) -> None:
        """Validate that start time falls on a slot boundary."""
        open_dt = datetime.combine(start.date(), oh.open_time, tzinfo=timezone.utc)
        delta_minutes = int((start - open_dt).total_seconds() // 60)
        if delta_minutes < 0 or delta_minutes % duration_minutes != 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Start time must align to a {duration_minutes}-minute slot boundary from the club's opening time",
            )

    def _validate_window_in_hours(self, start: datetime, end: datetime, oh: OperatingHours, query_date) -> None:
        open_dt = datetime.combine(query_date, oh.open_time, tzinfo=timezone.utc)
        close_dt = datetime.combine(query_date, oh.close_time, tzinfo=timezone.utc)
        if start < open_dt or end > close_dt:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Booking window falls outside club operating hours",
            )

    async def _check_no_conflict(self, court_id: uuid.UUID, start: datetime, end: datetime, exclude_booking_id: Optional[uuid.UUID] = None) -> None:
        stmt = select(Booking.id).where(
            Booking.court_id == court_id,
            Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
            Booking.start_datetime < end,
            Booking.end_datetime > start,
        )
        if exclude_booking_id:
            stmt = stmt.where(Booking.id != exclude_booking_id)
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Court is already booked for this time slot")

    async def _check_no_blackout(self, court_id: uuid.UUID, start: datetime, end: datetime) -> None:
        result = await self.db.execute(
            select(CourtBlackout.id).where(
                CourtBlackout.court_id == court_id,
                CourtBlackout.start_datetime < end,
                CourtBlackout.end_datetime > start,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Court is blacked out during this time slot")

    async def _load_booking(self, booking_id: uuid.UUID) -> Booking:
        """Re-fetch booking with all relationships eagerly loaded."""
        result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.players).selectinload(BookingPlayer.user))
            .options(selectinload(Booking.court))
            .where(Booking.id == booking_id)
        )
        return result.scalar_one()

    async def _get_price(self, club_id: uuid.UUID, start: datetime) -> Optional[Decimal]:
        day_of_week = start.weekday()
        slot_time = start.time()
        now = datetime.now(tz=timezone.utc)
        result = await self.db.execute(
            select(PricingRule).where(
                PricingRule.club_id == club_id,
                PricingRule.day_of_week == day_of_week,
                PricingRule.is_active == True,
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

    def _compute_skill_range(
        self,
        organiser: User,
        club: Club,
        is_staff: bool,
        anchor_skill_level: Optional[Decimal],
        override_min: Optional[Decimal],
        override_max: Optional[Decimal],
    ) -> tuple[Optional[Decimal], Optional[Decimal]]:
        if is_staff and override_min is not None and override_max is not None:
            return override_min, override_max

        anchor = None
        if is_staff and anchor_skill_level is not None:
            anchor = anchor_skill_level
        elif organiser.skill_level is not None:
            anchor = Decimal(str(organiser.skill_level))

        if anchor is None:
            return None, None

        half_range = Decimal(str(club.skill_range_allowed))
        min_skill = max(Decimal(str(club.skill_level_min)), anchor - half_range)
        max_skill = min(Decimal(str(club.skill_level_max)), anchor + half_range)
        return min_skill, max_skill

    def _check_player_skill(self, user: User, min_skill: Optional[Decimal], max_skill: Optional[Decimal]) -> None:
        if min_skill is None and max_skill is None:
            return
        if user.skill_level is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Skill level required to join this game",
            )
        skill = Decimal(str(user.skill_level))
        if not (min_skill <= skill <= max_skill):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Skill level {skill} is outside this game's range ({min_skill}–{max_skill})",
            )

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    async def create_booking(
        self,
        tenant_id: uuid.UUID,
        requesting_user: User,
        club_id: uuid.UUID,
        court_id: uuid.UUID,
        booking_type: BookingType,
        start_datetime: datetime,
        is_open_game: bool,
        max_players: int,
        player_user_ids: list[uuid.UUID],
        notes: Optional[str],
        anchor_skill_level: Optional[Decimal],
        skill_level_override_min: Optional[Decimal],
        skill_level_override_max: Optional[Decimal],
        event_name: Optional[str],
        contact_name: Optional[str],
        contact_email: Optional[str],
        contact_phone: Optional[str],
        staff_profile_id: Optional[uuid.UUID],
    ) -> Booking:
        is_staff = _is_staff(requesting_user)

        # 1. Fetch club + court
        club, court = await self._get_club_and_court(club_id, court_id, tenant_id)

        # 2. Compute end datetime
        end_datetime = start_datetime + timedelta(minutes=club.booking_duration_minutes)

        # 3. Operating hours for the booking date
        oh = await self._get_operating_hours(club_id, start_datetime.date())

        # 4. Booking window within operating hours
        self._validate_window_in_hours(start_datetime, end_datetime, oh, start_datetime.date())

        # 5. Grid alignment (regular bookings only)
        if booking_type in _GRID_ENFORCED_TYPES:
            self._validate_grid_alignment(start_datetime, oh, club.booking_duration_minutes)

        # 6. Notice window (bypass for staff)
        if not is_staff:
            notice_cutoff = datetime.now(tz=timezone.utc) + timedelta(hours=club.min_booking_notice_hours)
            if start_datetime < notice_cutoff:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Bookings must be made at least {club.min_booking_notice_hours} hour(s) in advance",
                )

        # 7. Advance window (bypass for staff)
        if not is_staff:
            advance_limit = datetime.now(tz=timezone.utc) + timedelta(days=club.max_advance_booking_days)
            if start_datetime > advance_limit:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Bookings cannot be made more than {club.max_advance_booking_days} day(s) in advance",
                )

        # 8. Court conflict
        await self._check_no_conflict(court_id, start_datetime, end_datetime)

        # 9. Blackout
        await self._check_no_blackout(court_id, start_datetime, end_datetime)

        # 10. Truly empty open game (no organiser slot taken) is staff-only.
        # A player creating an open game is always added as organiser; only staff
        # can create a game with all 4 slots open and no organiser attached.
        is_empty_admin_game = is_open_game and is_staff and len(player_user_ids) == 0
        if is_open_game and len(player_user_ids) == 0 and not is_staff:
            # Player creates open game → they become organiser.  Not an error; handled below.
            pass

        # 11. Skill range computation
        min_skill, max_skill = self._compute_skill_range(
            requesting_user, club, is_staff, anchor_skill_level,
            skill_level_override_min, skill_level_override_max,
        )

        # 12. Validate named players (deduplicate while preserving order)
        seen_ids: set[uuid.UUID] = set()
        deduped_player_ids: list[uuid.UUID] = []
        for uid in player_user_ids:
            if uid not in seen_ids:
                seen_ids.add(uid)
                deduped_player_ids.append(uid)

        named_players: list[User] = []
        for uid in deduped_player_ids:
            if uid == requesting_user.id:
                continue  # organiser added separately
            result = await self.db.execute(
                select(User).where(User.id == uid, User.tenant_id == tenant_id)
            )
            named_user = result.scalar_one_or_none()
            if not named_user:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Player {uid} not found in this tenant",
                )
            if not is_staff:
                self._check_player_skill(named_user, min_skill, max_skill)
            named_players.append(named_user)

        # 13. Capacity check: organiser (if any) + named players must not exceed max_players
        organiser_slot = 0 if is_empty_admin_game else 1
        if organiser_slot + len(named_players) > max_players:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Too many players: {organiser_slot + len(named_players)} exceeds max_players={max_players}",
            )

        # 14. Price
        total_price = await self._get_price(club_id, start_datetime)

        # 14. Amount due per player slot
        amount_due = (total_price / max_players) if total_price else Decimal("0.00")

        # Capture requesting_user.id before any flush — after flush() SQLAlchemy may
        # expire the ORM object (loaded via db.get with a string key), making .id None.
        requesting_user_id = requesting_user.id

        # 15. Create booking
        booking = Booking(
            club_id=club_id,
            court_id=court_id,
            booking_type=booking_type,
            status=BookingStatus.pending,
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            created_by_user_id=requesting_user_id,
            staff_profile_id=staff_profile_id,
            max_players=max_players,
            min_skill_level=min_skill,
            max_skill_level=max_skill,
            is_open_game=is_open_game,
            total_price=total_price,
            notes=notes,
            event_name=event_name,
            contact_name=contact_name,
            contact_email=contact_email,
            contact_phone=contact_phone,
        )
        self.db.add(booking)
        await self.db.flush()  # get booking.id

        # 16. Add organiser as BookingPlayer (skip only for staff-admin empty open games)
        if not is_empty_admin_game:
            organiser_bp = BookingPlayer(
                booking=booking,
                user=requesting_user,
                role=PlayerRole.organiser,
                invite_status=InviteStatus.accepted,
                payment_status=PaymentStatus.pending,
                amount_due=amount_due,
            )
            self.db.add(organiser_bp)

        # 17. Add named players
        for named_user in named_players:
            bp = BookingPlayer(
                booking=booking,
                user=named_user,
                role=PlayerRole.player,
                invite_status=InviteStatus.accepted,
                payment_status=PaymentStatus.pending,
                amount_due=amount_due,
            )
            self.db.add(bp)

        await self.db.flush()

        # 18. Auto-confirm if player count meets threshold
        accepted = (0 if is_empty_admin_game else 1) + len(named_players)
        if accepted >= club.min_players_to_confirm:
            booking.status = BookingStatus.confirmed

        await self.db.flush()
        return await self._load_booking(booking.id)

    async def list_bookings(
        self,
        club_id: uuid.UUID,
        tenant_id: uuid.UUID,
        requesting_user: User,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        booking_type: Optional[str] = None,
        booking_status: Optional[str] = None,
        court_id: Optional[uuid.UUID] = None,
        player_search: Optional[str] = None,
    ) -> list[Booking]:
        # Verify club belongs to tenant
        club_result = await self.db.execute(
            select(Club.id).where(Club.id == club_id, Club.tenant_id == tenant_id)
        )
        if not club_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

        stmt = (
            select(Booking)
            .options(selectinload(Booking.players).selectinload(BookingPlayer.user))
            .options(selectinload(Booking.court))
            .where(Booking.club_id == club_id)
        )

        if not _is_staff(requesting_user):
            # Players see only bookings they are part of
            stmt = stmt.join(BookingPlayer, BookingPlayer.booking_id == Booking.id).where(
                BookingPlayer.user_id == requesting_user.id
            )
        elif player_search:
            # Staff: join through players to filter by name/email
            search_term = f"%{player_search.lower()}%"
            stmt = stmt.join(BookingPlayer, BookingPlayer.booking_id == Booking.id).join(
                User, User.id == BookingPlayer.user_id
            ).where(
                or_(
                    func.lower(User.full_name).like(search_term),
                    func.lower(User.email).like(search_term),
                )
            )

        if date_from:
            stmt = stmt.where(Booking.start_datetime >= date_from)
        if date_to:
            stmt = stmt.where(Booking.start_datetime <= date_to)
        if booking_type:
            stmt = stmt.where(Booking.booking_type == booking_type)
        if booking_status:
            stmt = stmt.where(Booking.status == booking_status)
        if court_id:
            stmt = stmt.where(Booking.court_id == court_id)

        result = await self.db.execute(stmt)
        return result.scalars().unique().all()

    async def get_calendar_view(
        self,
        club_id: uuid.UUID,
        tenant_id: uuid.UUID,
        view: str,
        anchor_date: date,
    ) -> dict:
        club_result = await self.db.execute(
            select(Club.id).where(Club.id == club_id, Club.tenant_id == tenant_id)
        )
        if not club_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

        if view == "day":
            date_from = anchor_date
            date_to = anchor_date
        else:
            # week: Monday through Sunday containing anchor_date
            date_from = anchor_date - timedelta(days=anchor_date.weekday())
            date_to = date_from + timedelta(days=6)

        start_dt = datetime.combine(date_from, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(date_to, datetime.max.time()).replace(tzinfo=timezone.utc)

        courts_result = await self.db.execute(
            select(Court)
            .where(Court.club_id == club_id, Court.is_active == True)
            .order_by(Court.name)
        )
        courts = courts_result.scalars().all()

        bookings_result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.players).selectinload(BookingPlayer.user))
            .options(selectinload(Booking.court))
            .where(
                Booking.club_id == club_id,
                Booking.start_datetime >= start_dt,
                Booking.start_datetime <= end_dt,
                Booking.status != BookingStatus.cancelled,
            )
            .order_by(Booking.start_datetime)
        )
        bookings = bookings_result.scalars().unique().all()

        return {
            "view": view,
            "date_from": date_from,
            "date_to": date_to,
            "courts": courts,
            "bookings": bookings,
        }

    async def list_open_games(
        self,
        club_id: uuid.UUID,
        tenant_id: uuid.UUID,
        date: Optional[date] = None,
        min_skill: Optional[Decimal] = None,
        max_skill: Optional[Decimal] = None,
    ) -> list[Booking]:
        club_result = await self.db.execute(
            select(Club.id).where(Club.id == club_id, Club.tenant_id == tenant_id)
        )
        if not club_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

        # Subquery: count accepted players per booking
        accepted_count_sq = (
            select(BookingPlayer.booking_id, func.count().label("cnt"))
            .where(BookingPlayer.invite_status == InviteStatus.accepted)
            .group_by(BookingPlayer.booking_id)
            .subquery()
        )

        now = datetime.now(tz=timezone.utc)
        stmt = (
            select(Booking)
            .options(selectinload(Booking.players).selectinload(BookingPlayer.user))
            .options(selectinload(Booking.court))
            .outerjoin(accepted_count_sq, accepted_count_sq.c.booking_id == Booking.id)
            .where(
                Booking.club_id == club_id,
                Booking.is_open_game == True,
                Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
                Booking.start_datetime >= now,
                func.coalesce(accepted_count_sq.c.cnt, 0) < Booking.max_players,
            )
        )

        if date:
            day_start = datetime.combine(date, datetime.min.time(), tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            stmt = stmt.where(Booking.start_datetime >= day_start, Booking.start_datetime < day_end)

        if min_skill is not None and max_skill is not None:
            # Include games whose skill range overlaps the requested range,
            # AND include games with no skill restriction (NULL columns = open to all).
            stmt = stmt.where(
                (Booking.min_skill_level == None) | (Booking.min_skill_level <= max_skill),
                (Booking.max_skill_level == None) | (Booking.max_skill_level >= min_skill),
            )

        result = await self.db.execute(stmt)
        return result.scalars().unique().all()

    async def get_booking(
        self,
        booking_id: uuid.UUID,
        club_id: uuid.UUID,
        tenant_id: uuid.UUID,
        requesting_user: User,
    ) -> Booking:
        # Verify club belongs to tenant
        club_result = await self.db.execute(
            select(Club.id).where(Club.id == club_id, Club.tenant_id == tenant_id)
        )
        if not club_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

        result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.players).selectinload(BookingPlayer.user))
            .options(selectinload(Booking.court))
            .where(Booking.id == booking_id, Booking.club_id == club_id)
        )
        booking = result.scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        is_staff = _is_staff(requesting_user)
        if not is_staff:
            in_booking = any(p.user_id == requesting_user.id for p in booking.players)
            if not in_booking and not booking.is_open_game:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        return booking

    async def join_booking(
        self,
        booking_id: uuid.UUID,
        club_id: uuid.UUID,
        tenant_id: uuid.UUID,
        requesting_user: User,
    ) -> Booking:
        result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.players).selectinload(BookingPlayer.user))
            .options(selectinload(Booking.court))
            .join(Club, Booking.club_id == Club.id)
            .where(Booking.id == booking_id, Booking.club_id == club_id, Club.tenant_id == tenant_id)
        )
        booking = result.scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        if not booking.is_open_game:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot self-join a private booking")

        if booking.status in (BookingStatus.cancelled, BookingStatus.completed):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Booking is no longer available")

        if any(p.user_id == requesting_user.id for p in booking.players):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You are already part of this booking")

        accepted = _accepted_count(booking.players)
        if accepted >= booking.max_players:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking is full")

        # Skill check
        self._check_player_skill(
            requesting_user,
            Decimal(str(booking.min_skill_level)) if booking.min_skill_level is not None else None,
            Decimal(str(booking.max_skill_level)) if booking.max_skill_level is not None else None,
        )

        # Fetch club for min_players_to_confirm
        club = await self.db.get(Club, club_id)
        amount_due = (Decimal(str(booking.total_price)) / booking.max_players) if booking.total_price else Decimal("0.00")

        bp = BookingPlayer(
            booking=booking,
            user=requesting_user,
            role=PlayerRole.player,
            invite_status=InviteStatus.accepted,
            payment_status=PaymentStatus.pending,
            amount_due=amount_due,
        )
        self.db.add(bp)
        await self.db.flush()

        # Auto-confirm
        new_accepted = accepted + 1
        if new_accepted >= club.min_players_to_confirm and booking.status == BookingStatus.pending:
            booking.status = BookingStatus.confirmed

        await self.db.flush()
        return await self._load_booking(booking.id)

    async def invite_player(
        self,
        booking_id: uuid.UUID,
        club_id: uuid.UUID,
        tenant_id: uuid.UUID,
        requesting_user: User,
        invited_user_id: uuid.UUID,
    ) -> Booking:
        result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.players).selectinload(BookingPlayer.user))
            .options(selectinload(Booking.court))
            .join(Club, Booking.club_id == Club.id)
            .where(Booking.id == booking_id, Booking.club_id == club_id, Club.tenant_id == tenant_id)
        )
        booking = result.scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        is_staff = _is_staff(requesting_user)
        is_organiser = any(
            p.user_id == requesting_user.id and p.role == PlayerRole.organiser
            for p in booking.players
        )
        if not is_staff and not is_organiser:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organiser or staff can invite players")

        if booking.status in (BookingStatus.cancelled, BookingStatus.completed):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cannot invite to a cancelled or completed booking")

        # Count all players (accepted + pending) — each BookingPlayer row is a committed slot.
        # A pending invite holds the slot until accepted or declined.
        total_players = len(booking.players)
        if total_players >= booking.max_players:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking is full")

        if any(p.user_id == invited_user_id for p in booking.players):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Player is already part of this booking")

        # Verify invited user exists in tenant
        invited_result = await self.db.execute(
            select(User).where(User.id == invited_user_id, User.tenant_id == tenant_id)
        )
        invited_user = invited_result.scalar_one_or_none()
        if not invited_user:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Player not found in this tenant")

        # Skill check bypassed for organiser and staff invites
        club = await self.db.get(Club, club_id)
        amount_due = (Decimal(str(booking.total_price)) / booking.max_players) if booking.total_price else Decimal("0.00")

        bp = BookingPlayer(
            booking=booking,
            user=invited_user,
            role=PlayerRole.player,
            invite_status=InviteStatus.pending,
            payment_status=PaymentStatus.pending,
            amount_due=amount_due,
        )
        self.db.add(bp)
        await self.db.flush()
        return await self._load_booking(booking.id)

    async def cancel_booking(
        self,
        booking_id: uuid.UUID,
        club_id: uuid.UUID,
        tenant_id: uuid.UUID,
        requesting_user: User,
    ) -> Booking:
        result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.players).selectinload(BookingPlayer.user))
            .options(selectinload(Booking.court))
            .join(Club, Booking.club_id == Club.id)
            .where(Booking.id == booking_id, Booking.club_id == club_id, Club.tenant_id == tenant_id)
        )
        booking = result.scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        is_staff = _is_staff(requesting_user)
        if not is_staff:
            is_organiser = any(
                p.user_id == requesting_user.id and p.role == PlayerRole.organiser
                for p in booking.players
            )
            if not is_organiser:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organiser or staff can cancel this booking")

        if booking.status in (BookingStatus.cancelled, BookingStatus.completed):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Booking is already {booking.status.value}",
            )

        booking.status = BookingStatus.cancelled
        await self.db.flush()
        return await self._load_booking(booking.id)
