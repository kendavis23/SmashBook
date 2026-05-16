"""Pydantic schemas for the org-facing `/subscription/*` endpoints.

These are the read-mostly views an organisation owner uses to see their
SmashBook plan and manage their billing. They never touch SmashBook-only
fields like fees or revenue share — owners only see what their plan
*allows*, not what SmashBook charges behind the scenes.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel

from app.db.models.tenant import SubscriptionStatus


class PlanLimits(BaseModel):
    """Caps from the subscription plan. `-1` means unlimited."""
    max_clubs: int
    max_courts_per_club: int
    max_staff_users: int


class UsageCounts(BaseModel):
    """How much of the plan the org is currently using."""
    clubs_used: int
    courts_used: int      # total across all clubs in this tenant
    staff_used: int       # users with non-player roles


class PlanFeatures(BaseModel):
    open_games: bool
    waitlist: bool
    white_label: bool
    analytics: bool


class SubscriptionView(BaseModel):
    """Response for GET /subscription — the org's full subscription snapshot."""
    plan_id: uuid.UUID
    plan_name: str
    price_per_month: Decimal

    limits: PlanLimits
    usage: UsageCounts
    features: PlanFeatures

    is_active: bool
    subscription_status: Optional[SubscriptionStatus] = None
    subscription_start_date: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    has_payment_method: bool


class InvoiceItem(BaseModel):
    """A single Stripe invoice, simplified for the org's view."""
    id: str
    number: Optional[str] = None
    status: Optional[str] = None
    amount_due: int        # cents
    amount_paid: int
    currency: str
    created: datetime
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    hosted_invoice_url: Optional[str] = None
    invoice_pdf: Optional[str] = None


class InvoiceList(BaseModel):
    invoices: List[InvoiceItem]


class SetupIntentResponse(BaseModel):
    """Returned to the frontend to drive Stripe Elements."""
    setup_intent_id: str
    client_secret: str


class UpdatePaymentMethodRequest(BaseModel):
    payment_method_id: str


class UpdatePaymentMethodResponse(BaseModel):
    default_payment_method_id: str
