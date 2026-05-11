import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.db.models.membership import BillingPeriod, MembershipStatus


class MembershipPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    billing_period: BillingPeriod
    price: Decimal
    trial_days: int = 0
    booking_credits_per_period: int = 0
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
    booking_credits_per_period: Optional[int] = None  # None = don't update
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
    booking_credits_per_period: int
    guest_passes_per_period: Optional[int] = None
    discount_pct: Optional[Decimal] = None
    priority_booking_days: Optional[int] = None
    max_active_members: Optional[int] = None
    is_active: bool
    stripe_price_id: Optional[str] = None

    model_config = {"from_attributes": True}


class MembershipSubscriptionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    club_id: uuid.UUID
    status: MembershipStatus
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    cancelled_at: Optional[datetime] = None
    credits_remaining: int
    guest_passes_remaining: Optional[int] = None
    plan: MembershipPlanResponse

    model_config = {"from_attributes": True}
