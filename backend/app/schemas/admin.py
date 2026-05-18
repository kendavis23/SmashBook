"""Pydantic schemas for SmashBook platform-admin endpoints.

These models back the `/admin/plans/*` and `/admin/tenants/*` routes, all of
which are gated by the `X-Platform-Key` header and used by SmashBook internal
tooling — not tenant owners.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.db.models.tenant import SubscriptionStatus


# -- Subscription Plans ------------------------------------------------------

class PlanBase(BaseModel):
    name: str
    max_clubs: int
    max_courts_per_club: int
    max_staff_users: int = -1

    open_games_feature: bool = False
    waitlist_feature: bool = False
    white_label_enabled: bool = False
    analytics_enabled: bool = False

    price_per_month: Decimal
    setup_fee: Decimal = Decimal("0")
    trial_days: int = 0

    booking_fee_pct: Optional[Decimal] = None
    revenue_share_pct: Optional[Decimal] = None
    third_party_revenue_share_pct: Optional[Decimal] = None
    overage_fee_per_booking: Optional[Decimal] = None
    max_api_calls_per_month: Optional[int] = None

    stripe_price_id: Optional[str] = None


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    """All fields optional — PUT replaces only what's supplied."""
    name: Optional[str] = None
    max_clubs: Optional[int] = None
    max_courts_per_club: Optional[int] = None
    max_staff_users: Optional[int] = None

    open_games_feature: Optional[bool] = None
    waitlist_feature: Optional[bool] = None
    white_label_enabled: Optional[bool] = None
    analytics_enabled: Optional[bool] = None

    price_per_month: Optional[Decimal] = None
    setup_fee: Optional[Decimal] = None
    trial_days: Optional[int] = None

    booking_fee_pct: Optional[Decimal] = None
    revenue_share_pct: Optional[Decimal] = None
    third_party_revenue_share_pct: Optional[Decimal] = None
    overage_fee_per_booking: Optional[Decimal] = None
    max_api_calls_per_month: Optional[int] = None

    stripe_price_id: Optional[str] = None


class PlanResponse(PlanBase):
    id: uuid.UUID

    model_config = {"from_attributes": True}


# -- Tenants -----------------------------------------------------------------

class TenantSummary(BaseModel):
    """Lightweight tenant row for list views."""
    id: uuid.UUID
    name: str
    subdomain: str
    custom_domain: Optional[str] = None
    plan_id: uuid.UUID
    plan_name: str
    is_active: bool
    subscription_status: Optional[SubscriptionStatus] = None
    subscription_start_date: Optional[datetime] = None
    club_count: int
    created_at: datetime


class TenantDetail(BaseModel):
    """Full tenant view for detail endpoint."""
    id: uuid.UUID
    name: str
    subdomain: str
    custom_domain: Optional[str] = None
    plan_id: uuid.UUID
    plan_name: str
    is_active: bool
    subscription_start_date: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_status: Optional[SubscriptionStatus] = None
    club_count: int
    created_at: datetime
    updated_at: datetime


class TenantUpdate(BaseModel):
    """
    Partial update for a tenant. Any field left ``None`` is untouched.

    `owner_email` and `owner_full_name` mutate the tenant's single
    ``role=owner`` user (the User row created by /admin/onboard), not the
    Tenant row itself.
    """
    name: Optional[str] = None
    subdomain: Optional[str] = None
    custom_domain: Optional[str] = None
    is_active: Optional[bool] = None
    subscription_start_date: Optional[datetime] = None
    owner_email: Optional[EmailStr] = None
    owner_full_name: Optional[str] = None

    @field_validator("subdomain")
    @classmethod
    def subdomain_slug(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import re
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9]([a-z0-9\-]{0,98}[a-z0-9])?$", v):
            raise ValueError("subdomain must be lowercase alphanumeric with optional hyphens")
        return v


class TenantActivateRequest(BaseModel):
    """Optional billing email override; defaults to the tenant's owner user."""
    billing_email: Optional[EmailStr] = None


class TenantChangePlanRequest(BaseModel):
    plan_id: uuid.UUID
