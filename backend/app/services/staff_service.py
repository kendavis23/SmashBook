"""
StaffService — staff profile and trainer schedule management.
"""
from sqlalchemy.ext.asyncio import AsyncSession


class StaffService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def set_trainer_availability(self, staff_profile_id: str, club_id: str,
                                        day_of_week: int, start_time: str, end_time: str,
                                        set_by_user_id: str, effective_from,
                                        effective_until=None, notes: str = None) -> dict:
        """
        Create or replace a trainer availability window.
        Validates start_time < end_time.
        Validates set_by_user_id is either the trainer themselves or an ops_lead.
        """
        pass

    async def get_all_trainer_schedules(self, club_id: str, week_start=None) -> dict:
        """
        Returns all trainers' availability for a club, grouped by trainer.
        Used by ops_lead to identify coverage gaps.
        """
        pass

    async def get_trainer_bookings(self, staff_profile_id: str, upcoming_only: bool = True) -> list:
        """
        Returns lesson bookings (lesson_individual, lesson_group) where
        staff_profile_id matches, ordered by start_datetime.
        """
        pass
