"""Stripe operations for SmashBook → org subscription billing.

This module handles the SmashBook-side Stripe account: Customers, Subscriptions,
Invoices, and SetupIntents that bill organisations for their SmashBook plan.

This is **distinct** from the Stripe Connect flow in `app/api/v1/endpoints/clubs.py`,
which handles each org's own Stripe account for collecting payments from players.
"""

from typing import Optional

import stripe

from app.core.config import get_settings
from app.db.models.tenant import SubscriptionStatus

stripe.api_key = get_settings().STRIPE_SECRET_KEY


_STATUS_MAP = {
    "trialing": SubscriptionStatus.trialing,
    "active": SubscriptionStatus.active,
    "past_due": SubscriptionStatus.past_due,
    "canceled": SubscriptionStatus.canceled,
    "unpaid": SubscriptionStatus.past_due,
    "incomplete": SubscriptionStatus.past_due,
    "incomplete_expired": SubscriptionStatus.canceled,
    "paused": SubscriptionStatus.suspended,
}


def map_stripe_status(stripe_status: Optional[str]) -> Optional[SubscriptionStatus]:
    """Map a Stripe subscription status string to our internal enum.

    Returns None if Stripe returns an unknown value, so we never silently
    write garbage to the database.
    """
    if stripe_status is None:
        return None
    return _STATUS_MAP.get(stripe_status)


async def create_customer(*, name: str, email: str, tenant_id: str) -> str:
    """Create a Stripe Customer for an org and return the customer ID."""
    customer = await stripe.Customer.create_async(
        name=name,
        email=email,
        metadata={"tenant_id": tenant_id, "purpose": "smashbook_subscription"},
    )
    return customer.id


async def create_subscription(
    *,
    customer_id: str,
    price_id: str,
    trial_days: int = 0,
    tenant_id: str,
) -> dict:
    """Create a Stripe Subscription for the customer on the given price.

    Returns a dict with the subscription's id and Stripe-reported status.
    Uses ``default_incomplete`` payment behavior so the caller can complete
    payment via the SetupIntent flow (Phase 3).
    """
    params: dict = {
        "customer": customer_id,
        "items": [{"price": price_id}],
        "payment_behavior": "default_incomplete",
        "payment_settings": {"save_default_payment_method": "on_subscription"},
        "expand": ["latest_invoice.payment_intent"],
        "metadata": {"tenant_id": tenant_id},
    }
    if trial_days > 0:
        params["trial_period_days"] = trial_days

    sub = await stripe.Subscription.create_async(**params)
    return {"id": sub.id, "status": sub.status}


async def update_subscription_price(
    *, subscription_id: str, new_price_id: str
) -> dict:
    """Swap the subscription's price (used by change-plan).

    Prorates so the org is charged/credited for the partial billing period.
    """
    sub = await stripe.Subscription.retrieve_async(subscription_id)
    item_id = sub["items"]["data"][0].id
    updated = await stripe.Subscription.modify_async(
        subscription_id,
        items=[{"id": item_id, "price": new_price_id}],
        proration_behavior="create_prorations",
    )
    return {"id": updated.id, "status": updated.status}


async def cancel_subscription(*, subscription_id: str) -> dict:
    """Cancel a subscription immediately. Used by suspend."""
    sub = await stripe.Subscription.cancel_async(subscription_id)
    return {"id": sub.id, "status": sub.status}
