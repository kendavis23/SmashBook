"""Stripe webhook handler for SmashBook → org subscription billing.

**This is one of two Stripe webhook endpoints in the platform.** It receives
*platform-account* events (subscriptions on SmashBook's main Stripe account)
and is verified with ``STRIPE_BILLING_WEBHOOK_SECRET``.

Org-payments events (both the platform-account and Connect-account webhooks
covering org → player payments, payouts, and membership subscriptions) are
handled by ``POST /payments/stripe/webhook``.  That endpoint receives both
webhooks at the same URL and verifies signatures against both
``STRIPE_WEBHOOK_SECRET`` and ``STRIPE_CONNECT_WEBHOOK_SECRET`` in turn.
The billing endpoint here must remain separate because Stripe → SmashBook
subscription events share types (``invoice.payment_succeeded``,
``customer.subscription.*``) with the org-payments flow and routing them to
the same handler would conflate two unrelated billing relationships.

Events handled here:
    invoice.payment_succeeded        → status = active
    invoice.payment_failed           → status = past_due
    customer.subscription.updated    → sync status from Stripe
    customer.subscription.deleted    → is_active=false, status=canceled
                                       (preserves 'suspended' if already set)
"""

from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models.tenant import SubscriptionStatus, Tenant
from app.db.session import get_db
from app.services import stripe_billing_service as stripe_billing

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


async def _tenant_by_customer(db: AsyncSession, customer_id: str) -> Optional[Tenant]:
    result = await db.execute(
        select(Tenant).where(Tenant.stripe_customer_id == customer_id)
    )
    return result.scalar_one_or_none()


async def _tenant_by_subscription(db: AsyncSession, subscription_id: str) -> Optional[Tenant]:
    result = await db.execute(
        select(Tenant).where(Tenant.stripe_subscription_id == subscription_id)
    )
    return result.scalar_one_or_none()


@router.post(
    "/stripe-billing",
    summary="Stripe webhook for SmashBook → org subscription billing events",
)
async def stripe_billing_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, get_settings().STRIPE_BILLING_WEBHOOK_SECRET,
        )
    except stripe.StripeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe signature",
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload",
        )

    # Stripe's StripeObject (v8+) doesn't implement dict.get(); normalise once
    # so the field accesses below behave like plain dict lookups.
    event = event.to_dict() if hasattr(event, "to_dict") else event
    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "invoice.payment_succeeded":
        customer_id = obj.get("customer")
        if customer_id:
            tenant = await _tenant_by_customer(db, customer_id)
            if tenant and tenant.subscription_status != SubscriptionStatus.suspended:
                tenant.subscription_status = SubscriptionStatus.active

    elif event_type == "invoice.payment_failed":
        customer_id = obj.get("customer")
        if customer_id:
            tenant = await _tenant_by_customer(db, customer_id)
            if tenant and tenant.subscription_status != SubscriptionStatus.suspended:
                tenant.subscription_status = SubscriptionStatus.past_due

    elif event_type == "customer.subscription.updated":
        sub_id = obj.get("id")
        if sub_id:
            tenant = await _tenant_by_subscription(db, sub_id)
            if tenant and tenant.subscription_status != SubscriptionStatus.suspended:
                tenant.subscription_status = stripe_billing.map_stripe_status(
                    obj.get("status")
                )

    elif event_type == "customer.subscription.deleted":
        sub_id = obj.get("id")
        customer_id = obj.get("customer")

        tenant = None
        if sub_id:
            tenant = await _tenant_by_subscription(db, sub_id)
        if tenant is None and customer_id:
            tenant = await _tenant_by_customer(db, customer_id)

        if tenant:
            # If SmashBook explicitly suspended this tenant, don't clobber the
            # 'suspended' status — that signal carries more meaning than the
            # downstream 'canceled' echo from Stripe.
            if tenant.subscription_status != SubscriptionStatus.suspended:
                tenant.subscription_status = SubscriptionStatus.canceled
                tenant.is_active = False
            tenant.stripe_subscription_id = None

    # Stripe expects a 2xx for any unhandled event types too. Returning the
    # event id makes log correlation simple.
    return {"received": True, "event_id": event.get("id")}
