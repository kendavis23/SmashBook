import uuid
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.db.models.membership import BillingPeriod


class MembershipPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    billing_period: BillingPeriod
    price: Decimal
    trial_days: int = 0
    booking_credits_per_period: Optional[int] = None
    guest_passes_per_period: Optional[int] = None
    discount_pct: Optional[Decimal] = None
    priority_booking_days: Optional[int] = None
    max_active_members: Optional[int] = None


class MembershipPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    billing_period: Optional[BillingPeriod] = None
    price: Optional[Decimal] = None
    trial_days: Optional[int] = None
    booking_credits_per_period: Optional[int] = None
    guest_passes_per_period: Optional[int] = None
    discount_pct: Optional[Decimal] = None
    priority_booking_days: Optional[int] = None
    max_active_members: Optional[int] = None
    is_active: Optional[bool] = None


class MembershipPlanResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    name: str
    description: Optional[str] = None
    billing_period: BillingPeriod
    price: Decimal
    trial_days: int
    booking_credits_per_period: Optional[int] = None
    guest_passes_per_period: Optional[int] = None
    discount_pct: Optional[Decimal] = None
    priority_booking_days: Optional[int] = None
    max_active_members: Optional[int] = None
    is_active: bool
    stripe_price_id: Optional[str] = None

    model_config = {"from_attributes": True}
