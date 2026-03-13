import re
import uuid
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, field_validator

from app.db.models.court import SurfaceType


class CourtCreate(BaseModel):
    name: str
    surface_type: SurfaceType
    has_lighting: bool = False
    lighting_surcharge: Optional[Decimal] = None


class ClubCreate(BaseModel):
    name: str
    address: Optional[str] = None
    currency: str = "GBP"


class OwnerCreate(BaseModel):
    email: str
    full_name: str
    password: str


class TenantOnboardRequest(BaseModel):
    name: str
    subdomain: str
    plan_id: uuid.UUID
    club: ClubCreate
    courts: List[CourtCreate]
    owner: OwnerCreate

    @field_validator("subdomain")
    @classmethod
    def subdomain_slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9]([a-z0-9\-]{0,98}[a-z0-9])?$", v):
            raise ValueError("subdomain must be lowercase alphanumeric with optional hyphens")
        return v

    @field_validator("courts")
    @classmethod
    def at_least_one_court(cls, v: List[CourtCreate]) -> List[CourtCreate]:
        if not v:
            raise ValueError("at least one court is required")
        return v


class CourtResponse(BaseModel):
    id: uuid.UUID
    name: str
    surface_type: SurfaceType
    has_lighting: bool
    is_active: bool

    model_config = {"from_attributes": True}


class TenantOnboardResponse(BaseModel):
    tenant_id: uuid.UUID
    club_id: uuid.UUID
    courts: List[CourtResponse]
