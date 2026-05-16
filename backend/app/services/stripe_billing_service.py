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


async def get_subscription(*, subscription_id: str) -> dict:
    """Retrieve a Stripe Subscription. Returns key fields for the org's view."""
    sub = await stripe.Subscription.retrieve_async(subscription_id)
    return {
        "id": sub.id,
        "status": sub.status,
        "current_period_end": sub.current_period_end,
        "cancel_at_period_end": sub.cancel_at_period_end,
    }


async def list_invoices(*, customer_id: str, limit: int = 20) -> list[dict]:
    """List recent invoices for a customer in most-recent-first order."""
    invoices = await stripe.Invoice.list_async(customer=customer_id, limit=limit)
    return [
        {
            "id": inv.id,
            "number": inv.number,
            "status": inv.status,
            "amount_due": inv.amount_due,
            "amount_paid": inv.amount_paid,
            "currency": inv.currency,
            "created": inv.created,
            "period_start": inv.period_start,
            "period_end": inv.period_end,
            "hosted_invoice_url": inv.hosted_invoice_url,
            "invoice_pdf": inv.invoice_pdf,
        }
        for inv in invoices.data
    ]


async def create_setup_intent(*, customer_id: str) -> dict:
    """Create a SetupIntent for saving a card to the customer.

    The frontend uses ``client_secret`` with Stripe Elements to collect card
    details and confirm the SetupIntent.  Once confirmed, the resulting
    ``payment_method`` ID is sent back to PUT /subscription/payment-method.
    """
    intent = await stripe.SetupIntent.create_async(
        customer=customer_id,
        payment_method_types=["card"],
        usage="off_session",
    )
    return {"id": intent.id, "client_secret": intent.client_secret}


async def set_default_payment_method(
    *, customer_id: str, payment_method_id: str
) -> str:
    """Attach the PM to the customer and set it as the invoice default."""
    await stripe.PaymentMethod.attach_async(payment_method_id, customer=customer_id)
    await stripe.Customer.modify_async(
        customer_id,
        invoice_settings={"default_payment_method": payment_method_id},
    )
    return payment_method_id
