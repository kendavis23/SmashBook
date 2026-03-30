"""
PlayerService — player profile and skill level management.
"""
from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.booking import Booking, BookingPlayer, BookingStatus
from app.db.models.court import Court
from app.schemas.user import PlayerBookingItem


class PlayerService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_skill_level(self, user_id: str, new_level: float,
                                  assigned_by_staff_id: str, reason: str = None) -> dict:
        """
        Staff-only: update a player's skill level.
          1. Fetch current user.skill_level (previous_level)
          2. Create SkillLevelHistory record (immutable audit log)
          3. Update user.skill_level, skill_assigned_by, skill_assigned_at
          4. Return updated user with history entry
        """
        pass

    async def get_skill_history(self, user_id: str) -> list:
        """Returns all SkillLevelHistory records for a player, ordered by created_at desc."""
        pass

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
