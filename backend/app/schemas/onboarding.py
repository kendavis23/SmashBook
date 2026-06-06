import re
import uuid
from typing import List, Optional

from pydantic import BaseModel, EmailStr, field_validator, model_validator

from app.schemas.common import UtcCoercedDatetime


_SUBDOMAIN_RE = re.compile(r"^[a-z0-9]([a-z0-9\-]{0,98}[a-z0-9])?$")


def _validate_subdomain(value: str) -> str:
    value = value.strip().lower()
    if not _SUBDOMAIN_RE.match(value):
        raise ValueError("subdomain must be lowercase alphanumeric with optional hyphens")
    return value


class ClubCreate(BaseModel):
    name: str
    address: Optional[str] = None
    currency: str = "GBP"


class OwnerCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class TenantOnboardRequest(BaseModel):
    # Legal / registration name (Stripe billing entity).
    name: str
    # Public-facing brand shown in club UI and confirmation emails.
    trading_name: str
    # Hosts the player site: <player_subdomain>.smashbook.app
    player_subdomain: str
    # Hosts the staff portal: <staff_subdomain>.smashbook.app
    staff_subdomain: str
    plan_id: uuid.UUID
    subscription_start_date: Optional[UtcCoercedDatetime] = None
    clubs: List[ClubCreate]
    owner: OwnerCreate

    @field_validator("player_subdomain", "staff_subdomain")
    @classmethod
    def subdomain_slug(cls, v: str) -> str:
        return _validate_subdomain(v)

    @model_validator(mode="after")
    def subdomains_must_differ(self) -> "TenantOnboardRequest":
        if self.player_subdomain == self.staff_subdomain:
            raise ValueError("player_subdomain and staff_subdomain must differ")
        return self

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
