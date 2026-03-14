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
