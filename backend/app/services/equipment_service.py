"""
EquipmentService — rental inventory and damage tracking.
"""
import uuid
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.booking import Booking, BookingPlayer, BookingStatus
from app.db.models.club import Club
from app.db.models.equipment import EquipmentInventory, EquipmentRental, ItemCondition, ItemType
from app.db.models.user import User


class EquipmentService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------------
    # Inventory management (staff)
    # ------------------------------------------------------------------

    async def _get_club(self, club_id: uuid.UUID, tenant_id: uuid.UUID) -> Club:
        result = await self.db.execute(
            select(Club).where(Club.id == club_id, Club.tenant_id == tenant_id)
        )
        club = result.scalar_one_or_none()
        if not club:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
        return club

    async def _get_item(self, item_id: uuid.UUID, club_id: uuid.UUID) -> EquipmentInventory:
        result = await self.db.execute(
            select(EquipmentInventory).where(
                EquipmentInventory.id == item_id,
                EquipmentInventory.club_id == club_id,
            )
        )
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment item not found")
        return item

    async def create_item(
        self,
        club_id: uuid.UUID,
        tenant_id: uuid.UUID,
        item_type: ItemType,
        name: str,
        quantity_total: int,
        rental_price: Decimal,
        condition: ItemCondition,
        notes: Optional[str],
    ) -> EquipmentInventory:
        await self._get_club(club_id, tenant_id)
        item = EquipmentInventory(
            club_id=club_id,
            item_type=item_type,
            name=name,
            quantity_total=quantity_total,
            quantity_available=quantity_total,
            rental_price=rental_price,
            condition=condition,
            notes=notes,
        )
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def update_item(
        self,
        item_id: uuid.UUID,
        club_id: uuid.UUID,
        tenant_id: uuid.UUID,
        name: Optional[str],
        rental_price: Optional[Decimal],
        condition: Optional[ItemCondition],
        notes: Optional[str],
        quantity_total: Optional[int],
    ) -> EquipmentInventory:
        await self._get_club(club_id, tenant_id)
        item = await self._get_item(item_id, club_id)

        if name is not None:
            item.name = name
        if rental_price is not None:
            item.rental_price = rental_price
        if condition is not None:
            item.condition = condition
        if notes is not None:
            item.notes = notes
        if quantity_total is not None:
            delta = quantity_total - item.quantity_total
            if delta < 0 and item.quantity_available + delta < 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"Cannot reduce total by {abs(delta)}: only {item.quantity_available} "
                        f"unit(s) available (others are currently out on rental)"
                    ),
                )
            item.quantity_total = quantity_total
            item.quantity_available += delta

        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def retire_item(
        self,
        item_id: uuid.UUID,
        club_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> None:
        """
        Soft-retire an equipment item. Blocks if any units are currently out on active rentals
        (i.e. EquipmentRental rows with returned_at=NULL on a non-cancelled booking).
        """
        await self._get_club(club_id, tenant_id)
        item = await self._get_item(item_id, club_id)

        active_out = item.quantity_total - item.quantity_available
        if active_out > 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot retire item: {active_out} unit(s) are currently out on active rentals",
            )

        item.condition = ItemCondition.retired
        item.quantity_available = 0
        await self.db.flush()

    async def get_inventory(self, club_id: uuid.UUID, tenant_id: uuid.UUID) -> list[EquipmentInventory]:
        """Returns all equipment for a club with current availability."""
        club_result = await self.db.execute(
            select(Club).where(Club.id == club_id, Club.tenant_id == tenant_id)
        )
        if not club_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

        result = await self.db.execute(
            select(EquipmentInventory)
            .where(EquipmentInventory.club_id == club_id)
            .order_by(EquipmentInventory.item_type, EquipmentInventory.name)
        )
        return list(result.scalars().all())

    async def add_rental_to_booking(
        self,
        booking_id: uuid.UUID,
        club_id: uuid.UUID,
        tenant_id: uuid.UUID,
        requesting_user: User,
        equipment_id: uuid.UUID,
        quantity: int,
    ) -> dict:
        """
        Add an equipment rental to an existing booking.

        1. Verify booking belongs to this club/tenant and is not cancelled/completed
        2. Verify requesting user is a participant (or staff)
        3. Verify equipment belongs to the same club
        4. Check quantity_available >= quantity
        5. Create EquipmentRental record
        6. Decrement quantity_available
        7. Add charge to the requesting user's BookingPlayer.amount_due
        """
        from app.db.models.user import TenantUserRole

        _STAFF_ROLES = {
            TenantUserRole.owner,
            TenantUserRole.admin,
            TenantUserRole.staff,
            TenantUserRole.trainer,
            TenantUserRole.ops_lead,
        }

        # 1. Load booking scoped to club + tenant
        booking_result = await self.db.execute(
            select(Booking).where(
                Booking.id == booking_id,
                Booking.club_id == club_id,
            )
        )
        booking = booking_result.scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        # Verify club belongs to the tenant
        club_result = await self.db.execute(
            select(Club).where(Club.id == club_id, Club.tenant_id == tenant_id)
        )
        if not club_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

        if booking.status in (BookingStatus.cancelled, BookingStatus.completed):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot add equipment rental to a cancelled or completed booking",
            )

        # 2. Verify requesting user is a participant (staff bypass)
        is_staff = requesting_user.role in _STAFF_ROLES
        if not is_staff:
            bp_result = await self.db.execute(
                select(BookingPlayer).where(
                    BookingPlayer.booking_id == booking_id,
                    BookingPlayer.user_id == requesting_user.id,
                )
            )
            booking_player = bp_result.scalar_one_or_none()
            if not booking_player:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not a participant of this booking",
                )
        else:
            bp_result = await self.db.execute(
                select(BookingPlayer).where(
                    BookingPlayer.booking_id == booking_id,
                    BookingPlayer.user_id == requesting_user.id,
                )
            )
            booking_player = bp_result.scalar_one_or_none()

        # 3. Load equipment, verify it belongs to the same club
        eq_result = await self.db.execute(
            select(EquipmentInventory).where(
                EquipmentInventory.id == equipment_id,
                EquipmentInventory.club_id == club_id,
            )
        )
        equipment = eq_result.scalar_one_or_none()
        if not equipment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")

        # 4. Check availability
        if equipment.quantity_available < quantity:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Only {equipment.quantity_available} unit(s) available",
            )

        # 5. Create rental record
        charge = equipment.rental_price * quantity
        rental = EquipmentRental(
            booking_id=booking_id,
            equipment_id=equipment_id,
            user_id=requesting_user.id,
            quantity=quantity,
            charge=charge,
        )
        self.db.add(rental)

        # 6. Decrement availability
        equipment.quantity_available -= quantity

        # 7. Update amount_due for the requesting user's BookingPlayer row (if they have one)
        if booking_player:
            booking_player.amount_due += charge

        await self.db.flush()
        await self.db.refresh(rental)

        return {
            "id": rental.id,
            "booking_id": rental.booking_id,
            "equipment_id": rental.equipment_id,
            "equipment_name": equipment.name,
            "item_type": equipment.item_type,
            "quantity": rental.quantity,
            "charge": rental.charge,
        }

    async def record_return(self, rental_id: str, damage_reported: bool,
                             damage_notes: str, returned_by_staff_id: str) -> dict:
        """
          1. Set EquipmentRental.returned_at = now()
          2. If damage_reported: set damage_notes, update EquipmentInventory.condition
          3. Increment quantity_available (unless item is damaged/retired)
          4. If damage_reported: notify staff for cost recovery
        """
        pass
