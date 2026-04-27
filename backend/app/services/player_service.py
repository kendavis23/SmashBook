"""
PlayerService — player profile and skill level management.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.booking import Booking, BookingPlayer, BookingStatus
from app.db.models.skill import SkillLevelHistory
from app.db.models.user import User, TenantUserRole
from app.schemas.user import PlayerBookingItem, PlayerSearchResult, SkillLevelHistoryItem, SkillLevelUpdateResponse


class PlayerService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_players(
        self,
        tenant_id: uuid.UUID,
        q: Optional[str] = None,
        # club_id reserved — will filter via player_profiles join in G9
        club_id: Optional[uuid.UUID] = None,
    ) -> list[PlayerSearchResult]:
        stmt = (
            select(User)
            .where(
                User.tenant_id == tenant_id,
                User.role == TenantUserRole.player,
                User.is_active.is_(True),
                User.is_suspended.is_(False),
            )
            .order_by(User.full_name)
        )
        if q:
            stmt = stmt.where(User.full_name.ilike(f"%{q}%"))
        result = await self.db.execute(stmt)
        return [PlayerSearchResult.model_validate(u) for u in result.scalars().all()]

    async def update_skill_level(
        self,
        user_id: uuid.UUID,
        new_level: float,
        assigned_by_staff_id: uuid.UUID,
        reason: str = None,
    ) -> SkillLevelUpdateResponse:
        result = await self.db.execute(select(User).where(User.id == user_id))
        player = result.scalar_one_or_none()
        if player is None:
            return None

        now = datetime.now(tz=timezone.utc)
        entry = SkillLevelHistory(
            user_id=player.id,
            previous_level=player.skill_level,
            new_level=new_level,
            assigned_by=assigned_by_staff_id,
            reason=reason,
        )
        self.db.add(entry)

        player.skill_level = new_level
        player.skill_assigned_by = assigned_by_staff_id
        player.skill_assigned_at = now

        await self.db.flush()
        await self.db.refresh(entry)

        return SkillLevelUpdateResponse(
            user_id=player.id,
            skill_level=player.skill_level,
            skill_assigned_by=player.skill_assigned_by,
            skill_assigned_at=player.skill_assigned_at,
            history_entry=SkillLevelHistoryItem.model_validate(entry),
        )

    async def get_skill_history(self, user_id: uuid.UUID) -> list[SkillLevelHistoryItem]:
        """Returns all SkillLevelHistory records for a player, ordered by created_at desc."""
        result = await self.db.execute(
            select(SkillLevelHistory)
            .where(SkillLevelHistory.user_id == user_id)
            .order_by(SkillLevelHistory.created_at.desc())
        )
        return [SkillLevelHistoryItem.model_validate(r) for r in result.scalars().all()]

    async def suspend_player(self, user_id: str, suspended_by_staff_id: str,
                              reason: str = None) -> dict:
        """
        Set user.is_active = False.
        Cancels all future pending bookings for this player.
        Notifies staff team.
        """
        pass

    async def get_booking_history(
        self,
        user_id: uuid.UUID,
        upcoming_only: bool = False,
        completed_only: bool = False,
    ) -> list[PlayerBookingItem]:
        """
        Returns bookings the player has joined or organised, split into upcoming and past.

        upcoming_only: only return pending/confirmed bookings with start_datetime >= now
        completed_only: only return completed bookings (match history)
        Default: all bookings, sorted by start_datetime desc.
        """
        now = datetime.now(tz=timezone.utc)

        stmt = (
            select(BookingPlayer)
            .where(BookingPlayer.user_id == user_id)
            .join(Booking, BookingPlayer.booking_id == Booking.id)
            .options(
                selectinload(BookingPlayer.booking).selectinload(Booking.court)
            )
        )

        if upcoming_only:
            stmt = stmt.where(
                Booking.start_datetime >= now,
                Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
            ).order_by(Booking.start_datetime.asc())
        elif completed_only:
            stmt = stmt.where(
                Booking.status == BookingStatus.completed,
            ).order_by(Booking.start_datetime.desc())
        else:
            stmt = stmt.order_by(Booking.start_datetime.desc())

        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        items = []
        for bp in rows:
            b = bp.booking
            items.append(PlayerBookingItem(
                booking_id=b.id,
                club_id=b.club_id,
                court_id=b.court_id,
                court_name=b.court.name,
                booking_type=b.booking_type,
                status=b.status,
                start_datetime=b.start_datetime,
                end_datetime=b.end_datetime,
                role=bp.role,
                invite_status=bp.invite_status,
                payment_status=bp.payment_status,
                amount_due=bp.amount_due,
            ))

        return items
