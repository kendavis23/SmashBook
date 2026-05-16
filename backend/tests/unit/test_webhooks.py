"""
Unit tests for /webhooks/stripe-billing — the SmashBook → org subscription
event handler.

stripe.Webhook.construct_event is mocked so we don't have to forge real
signatures; the contract we test is "given this event payload, the handler
updates the right tenant fields".
"""

import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import stripe
from fastapi import HTTPException

from app.api.v1.endpoints.webhooks import stripe_billing_webhook
from app.db.models.tenant import SubscriptionStatus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_tenant(**overrides):
    defaults = dict(
        id=uuid.uuid4(),
        name="Padel Kings",
        is_active=True,
        stripe_customer_id="cus_123",
        stripe_subscription_id="sub_123",
        subscription_status=SubscriptionStatus.active,
        created_at=datetime.now(tz=timezone.utc),
        updated_at=datetime.now(tz=timezone.utc),
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_request(body: bytes = b"{}", sig: str = "sig_test"):
    req = MagicMock()
    req.body = AsyncMock(return_value=body)
    req.headers = {"stripe-signature": sig}
    return req


def _make_db_returning(tenant):
    """DB mock where any .execute(select(Tenant)...) returns this tenant."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = tenant
    db.execute = AsyncMock(return_value=result)
    return db


def _event(event_type: str, obj: dict, event_id: str = "evt_test"):
    return {"id": event_id, "type": event_type, "data": {"object": obj}}


# ---------------------------------------------------------------------------
# Signature verification
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invalid_signature_returns_400():
    req = _make_request()
    db = AsyncMock()

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               side_effect=stripe.SignatureVerificationError("bad", "sig")):
        with pytest.raises(HTTPException) as exc:
            await stripe_billing_webhook(req, db)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_invalid_payload_returns_400():
    req = _make_request(body=b"not-json")
    db = AsyncMock()

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               side_effect=ValueError("malformed")):
        with pytest.raises(HTTPException) as exc:
            await stripe_billing_webhook(req, db)
    assert exc.value.status_code == 400


# ---------------------------------------------------------------------------
# invoice.payment_succeeded → status = active
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invoice_payment_succeeded_sets_active():
    tenant = _make_tenant(subscription_status=SubscriptionStatus.past_due)
    db = _make_db_returning(tenant)
    event = _event("invoice.payment_succeeded", {"customer": "cus_123"})

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               return_value=event):
        out = await stripe_billing_webhook(_make_request(), db)

    assert tenant.subscription_status == SubscriptionStatus.active
    assert out == {"received": True, "event_id": "evt_test"}


@pytest.mark.asyncio
async def test_invoice_payment_succeeded_skips_suspended():
    """A suspended tenant should not flip to active just because Stripe paid out."""
    tenant = _make_tenant(subscription_status=SubscriptionStatus.suspended)
    db = _make_db_returning(tenant)
    event = _event("invoice.payment_succeeded", {"customer": "cus_123"})

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               return_value=event):
        await stripe_billing_webhook(_make_request(), db)

    assert tenant.subscription_status == SubscriptionStatus.suspended


# ---------------------------------------------------------------------------
# invoice.payment_failed → status = past_due
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invoice_payment_failed_sets_past_due():
    tenant = _make_tenant(subscription_status=SubscriptionStatus.active)
    db = _make_db_returning(tenant)
    event = _event("invoice.payment_failed", {"customer": "cus_123"})

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               return_value=event):
        await stripe_billing_webhook(_make_request(), db)

    assert tenant.subscription_status == SubscriptionStatus.past_due


@pytest.mark.asyncio
async def test_invoice_payment_failed_unknown_customer_is_noop():
    db = _make_db_returning(None)  # no tenant for this customer
    event = _event("invoice.payment_failed", {"customer": "cus_unknown"})

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               return_value=event):
        out = await stripe_billing_webhook(_make_request(), db)

    # Should still 2xx — Stripe expects acks for unknown events
    assert out["received"] is True


# ---------------------------------------------------------------------------
# customer.subscription.updated → sync status from Stripe
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_subscription_updated_syncs_status():
    tenant = _make_tenant(subscription_status=SubscriptionStatus.trialing)
    db = _make_db_returning(tenant)
    event = _event("customer.subscription.updated",
                   {"id": "sub_123", "status": "active"})

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               return_value=event):
        await stripe_billing_webhook(_make_request(), db)

    assert tenant.subscription_status == SubscriptionStatus.active


@pytest.mark.asyncio
async def test_subscription_updated_preserves_suspended():
    tenant = _make_tenant(subscription_status=SubscriptionStatus.suspended)
    db = _make_db_returning(tenant)
    event = _event("customer.subscription.updated",
                   {"id": "sub_123", "status": "active"})

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               return_value=event):
        await stripe_billing_webhook(_make_request(), db)

    assert tenant.subscription_status == SubscriptionStatus.suspended


# ---------------------------------------------------------------------------
# customer.subscription.deleted → canceled + is_active=false
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_subscription_deleted_marks_canceled():
    tenant = _make_tenant(subscription_status=SubscriptionStatus.active)
    db = _make_db_returning(tenant)
    event = _event("customer.subscription.deleted",
                   {"id": "sub_123", "customer": "cus_123"})

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               return_value=event):
        await stripe_billing_webhook(_make_request(), db)

    assert tenant.subscription_status == SubscriptionStatus.canceled
    assert tenant.is_active is False
    assert tenant.stripe_subscription_id is None


@pytest.mark.asyncio
async def test_subscription_deleted_preserves_suspended_status():
    """
    When SmashBook suspends a tenant we cancel the Stripe sub ourselves.
    The follow-up customer.subscription.deleted webhook must not overwrite
    the 'suspended' state with 'canceled'.
    """
    tenant = _make_tenant(
        subscription_status=SubscriptionStatus.suspended,
        is_active=False,
        stripe_subscription_id="sub_123",
    )
    db = _make_db_returning(tenant)
    event = _event("customer.subscription.deleted",
                   {"id": "sub_123", "customer": "cus_123"})

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               return_value=event):
        await stripe_billing_webhook(_make_request(), db)

    assert tenant.subscription_status == SubscriptionStatus.suspended
    assert tenant.is_active is False
    # We still clear the dangling sub id — Stripe has deleted it.
    assert tenant.stripe_subscription_id is None


@pytest.mark.asyncio
async def test_subscription_deleted_falls_back_to_customer_lookup():
    """If the sub_id lookup misses (we cleared it), use the customer id."""
    tenant = _make_tenant(stripe_subscription_id=None)
    db = AsyncMock()

    # First execute (by subscription) misses; second (by customer) hits.
    miss = MagicMock()
    miss.scalar_one_or_none.return_value = None
    hit = MagicMock()
    hit.scalar_one_or_none.return_value = tenant
    db.execute = AsyncMock(side_effect=[miss, hit])

    event = _event("customer.subscription.deleted",
                   {"id": "sub_gone", "customer": "cus_123"})

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               return_value=event):
        await stripe_billing_webhook(_make_request(), db)

    assert tenant.subscription_status == SubscriptionStatus.canceled
    assert tenant.is_active is False


# ---------------------------------------------------------------------------
# Unhandled event types
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_unhandled_event_type_returns_200():
    db = AsyncMock()
    event = _event("customer.created", {"id": "cus_123"})

    with patch("app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
               return_value=event):
        out = await stripe_billing_webhook(_make_request(), db)

    assert out["received"] is True
