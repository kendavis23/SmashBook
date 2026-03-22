import uuid
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.db.models.court import SurfaceType


class CourtCreate(BaseModel):
    club_id: uuid.UUID
    name: str
    surface_type: SurfaceType
    has_lighting: bool = False
    lighting_surcharge: Optional[Decimal] = None
    is_active: bool = True


class CourtUpdate(BaseModel):
    name: Optional[str] = None
    surface_type: Optional[SurfaceType] = None
    has_lighting: Optional[bool] = None
    lighting_surcharge: Optional[Decimal] = None
    is_active: Optional[bool] = None


class CourtResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    name: str
    surface_type: SurfaceType
    has_lighting: bool
    lighting_surcharge: Optional[Decimal] = None
    is_active: bool

    model_config = {"from_attributes": True}


class TimeSlot(BaseModel):
    start_time: str  # "HH:MM" UTC
    end_time: str    # "HH:MM" UTC
    is_available: bool
    price: Optional[Decimal] = None
    price_label: Optional[str] = None


class CourtAvailabilityResponse(BaseModel):
    court_id: uuid.UUID
    date: str
    slots: list[TimeSlot]
