"""
EquipmentService — rental inventory and damage tracking.
"""
from sqlalchemy.ext.asyncio import AsyncSession


class EquipmentService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_rental_to_booking(self, booking_id: str, user_id: str,
                                     equipment_id: str, quantity: int) -> dict:
        """
          1. Check EquipmentInventory.quantity_available >= quantity
          2. Calculate charge = rental_price * quantity
          3. Create EquipmentRental record
          4. Decrement quantity_available
          5. Add charge to BookingPlayer.amount_due
          6. Return rental details
        """
        pass

    async def record_return(self, rental_id: str, damage_reported: bool,
                             damage_notes: str, returned_by_staff_id: str) -> dict:
        """
          1. Set EquipmentRental.returned_at = now()
          2. If damage_reported: set damage_notes, update EquipmentInventory.condition
          3. Increment quantity_available (unless item is damaged/retired)
          4. If damage_reported: notify staff for cost recovery
        """
        pass

    async def get_inventory(self, club_id: str) -> list:
        """Returns all equipment for a club with current availability."""
        pass
