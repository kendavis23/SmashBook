import re
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, field_validator


class ClubCreate(BaseModel):
    name: str
    address: Optional[str] = None
    currency: str = "GBP"


class OwnerCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class TenantOnboardRequest(BaseModel):
    name: str
    subdomain: str
    plan_id: uuid.UUID
    subscription_start_date: Optional[datetime] = None
    clubs: List[ClubCreate]
    owner: OwnerCreate

    @field_validator("subdomain")
    @classmethod
    def subdomain_slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9]([a-z0-9\-]{0,98}[a-z0-9])?$", v):
            raise ValueError("subdomain must be lowercase alphanumeric with optional hyphens")
        return v

    @field_validator("clubs")
    @classmethod
    def at_least_one_club(cls, v: List[ClubCreate]) -> List[ClubCreate]:
        if not v:
            raise ValueError("at least one club is required")
        return v


class TenantOnboardResponse(BaseModel):
    tenant_id: uuid.UUID
    club_ids: List[uuid.UUID]
    owner_id: uuid.UUID
