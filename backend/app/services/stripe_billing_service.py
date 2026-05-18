"""Stripe operations for SmashBook → org subscription billing.

This module handles the SmashBook **billing** Stripe account: Customers,
Subscriptions, Invoices, and SetupIntents that bill organisations for their
SmashBook plan.

All Stripe calls go through ``billing_client()`` so the account identity is
explicit and isolated. This is **distinct** from the Stripe Connect flow in
``app/api/v1/endpoints/clubs.py`` and the player-payment flows in
``app/services/payment_service.py`` / ``membership_service.py``, which use
the **platform** account via the ``stripe.api_key`` global.

When the dedicated SmashBook Corporate Stripe account is provisioned, only
``STRIPE_BILLING_SECRET_KEY`` needs to change — no code in this file moves.
"""

from typing import Optional

from app.core.stripe_clients import billing_client
from app.db.models.tenant import SubscriptionStatus


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
    customer = await billing_client().v1.customers.create_async({
        "name": name,
        "email": email,
        "metadata": {"tenant_id": tenant_id, "purpose": "smashbook_subscription"},
    })
    return customer.id


async def get_customer(*, customer_id: str) -> dict:
    """Retrieve a Stripe Customer. Returns the raw object as a dict.

    Used by the subscription view to read ``invoice_settings.default_payment_method``.
    """
    customer = await billing_client().v1.customers.retrieve_async(customer_id)
    return customer.to_dict() if hasattr(customer, "to_dict") else dict(customer)


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

    sub = await billing_client().v1.subscriptions.create_async(params)
    return {"id": sub.id, "status": sub.status}


async def update_subscription_price(
    *, subscription_id: str, new_price_id: str
) -> dict:
    """Swap the subscription's price (used by change-plan).

    Prorates so the org is charged/credited for the partial billing period.
    """
    client = billing_client()
    sub = await client.v1.subscriptions.retrieve_async(subscription_id)
    item_id = sub["items"]["data"][0].id
    updated = await client.v1.subscriptions.update_async(
        subscription_id,
        {
            "items": [{"id": item_id, "price": new_price_id}],
            "proration_behavior": "create_prorations",
        },
    )
    return {"id": updated.id, "status": updated.status}


async def cancel_subscription(*, subscription_id: str) -> dict:
    """Cancel a subscription immediately. Used by suspend."""
    sub = await billing_client().v1.subscriptions.cancel_async(subscription_id)
    return {"id": sub.id, "status": sub.status}


async def get_subscription(*, subscription_id: str) -> dict:
    """Retrieve a Stripe Subscription. Returns key fields for the org's view."""
    sub = await billing_client().v1.subscriptions.retrieve_async(subscription_id)
    return {
        "id": sub.id,
        "status": sub.status,
        "current_period_end": sub.current_period_end,
        "cancel_at_period_end": sub.cancel_at_period_end,
    }


async def list_invoices(*, customer_id: str, limit: int = 20) -> list[dict]:
    """List recent invoices for a customer in most-recent-first order."""
    invoices = await billing_client().v1.invoices.list_async(
        {"customer": customer_id, "limit": limit}
    )
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
    intent = await billing_client().v1.setup_intents.create_async({
        "customer": customer_id,
        "payment_method_types": ["card"],
        "usage": "off_session",
    })
    return {"id": intent.id, "client_secret": intent.client_secret}


async def set_default_payment_method(
    *, customer_id: str, payment_method_id: str
) -> str:
    """Attach the PM to the customer and set it as the invoice default."""
    client = billing_client()
    await client.v1.payment_methods.attach_async(
        payment_method_id, {"customer": customer_id}
    )
    await client.v1.customers.update_async(
        customer_id,
        {"invoice_settings": {"default_payment_method": payment_method_id}},
    )
    return payment_method_id
