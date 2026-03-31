"""
StaffService — staff profile and trainer schedule management.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.booking import Booking, BookingType
from app.db.models.staff import StaffProfile, StaffRole, TrainerAvailability


class StaffService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def set_trainer_availability(
        self,
        staff_profile_id: str,
        club_id: str,
        day_of_week: int,
        start_time,
        end_time,
        set_by_user_id: str,
        effective_from,
        effective_until=None,
        notes: str = None,
    ) -> TrainerAvailability:
        """
        Create a trainer availability window.
        Validates start_time < end_time.
        """
        if end_time <= start_time:
            raise ValueError("end_time must be after start_time")

        window = TrainerAvailability(
            staff_profile_id=staff_profile_id,
            day_of_week=day_of_week,
            start_time=start_time,
            end_time=end_time,
            set_by_user_id=set_by_user_id,
            effective_from=effective_from,
            effective_until=effective_until,
            notes=notes,
        )
        self.db.add(window)
        await self.db.flush()
        return window

    async def get_all_trainer_schedules(self, club_id: str) -> list[StaffProfile]:
        """
        Returns all active trainers for a club with their availability eager-loaded.
        """
        result = await self.db.execute(
            select(StaffProfile)
            .where(
                StaffProfile.club_id == club_id,
                StaffProfile.role == StaffRole.trainer,
                StaffProfile.is_active.is_(True),
            )
            .options(selectinload(StaffProfile.availability))
            .order_by(StaffProfile.created_at)
        )
        return result.scalars().all()

    async def get_trainer_bookings(
        self, staff_profile_id: str, upcoming_only: bool = True
    ) -> list[Booking]:
        """
        Returns lesson bookings (lesson_individual, lesson_group) for a trainer,
        ordered by start_datetime.
        """
        stmt = (
            select(Booking)
            .where(
                Booking.staff_profile_id == staff_profile_id,
                Booking.booking_type.in_(
                    [BookingType.lesson_individual, BookingType.lesson_group]
                ),
            )
            .options(selectinload(Booking.court))
        )
        if upcoming_only:
            now = datetime.now(tz=timezone.utc)
            stmt = stmt.where(Booking.start_datetime >= now)

        stmt = stmt.order_by(Booking.start_datetime)
        result = await self.db.execute(stmt)
        return result.scalars().all()
