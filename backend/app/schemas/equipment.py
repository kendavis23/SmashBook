import uuid
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.db.models.equipment import ItemCondition, ItemType


class EquipmentInventoryItem(BaseModel):
    id: uuid.UUID
    item_type: ItemType
    name: str
    rental_price: Decimal
    quantity_total: int
    quantity_available: int
    condition: ItemCondition
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class EquipmentCreateRequest(BaseModel):
    item_type: ItemType
    name: str = Field(..., min_length=1, max_length=100)
    quantity_total: int = Field(..., ge=1)
    rental_price: Decimal = Field(..., ge=0)
    condition: ItemCondition = ItemCondition.good
    notes: Optional[str] = None


class EquipmentUpdateRequest(BaseModel):
    """All fields optional. quantity_total increase restocks quantity_available by the delta."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    rental_price: Optional[Decimal] = Field(default=None, ge=0)
    condition: Optional[ItemCondition] = None
    notes: Optional[str] = None
    quantity_total: Optional[int] = Field(default=None, ge=1)


class EquipmentRentalRequest(BaseModel):
    equipment_id: uuid.UUID
    quantity: int = Field(..., ge=1)


class EquipmentRentalResponse(BaseModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    equipment_id: uuid.UUID
    equipment_name: str
    item_type: ItemType
    quantity: int
    charge: Decimal

    model_config = {"from_attributes": True}
