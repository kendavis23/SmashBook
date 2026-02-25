"""
PlayerService — player profile and skill level management.
"""
from sqlalchemy.ext.asyncio import AsyncSession


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

    async def get_booking_history(self, user_id: str, upcoming_only: bool = False) -> list:
        """
        Returns BookingPlayer records for a user joined with Booking details.
        Sorted by start_datetime desc (or asc for upcoming).
        Uses read replica.
        """
        pass
