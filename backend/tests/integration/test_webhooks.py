"""
Integration tests for the org-billing Stripe webhook endpoint.

`POST /api/v1/webhooks/stripe-billing` is called by Stripe itself — there is
no JWT or X-Tenant-ID involved.  Signature verification is mocked because
forging a real signature without the platform secret would be brittle; what
we verify is the contract: "given this event payload + an existing tenant in
the database, the right rows are updated."

Coverage
--------
- Invalid Stripe signature → 400
- Malformed payload → 400
- invoice.payment_succeeded → tenant flipped to `active`
- invoice.payment_succeeded preserves `suspended` tenants
- invoice.payment_failed → tenant flipped to `past_due`
- customer.subscription.updated → status synced from Stripe
- customer.subscription.updated preserves `suspended`
- customer.subscription.deleted → canceled + is_active=false + clears sub id
- customer.subscription.deleted preserves `suspended` (still clears sub id)
- customer.subscription.deleted falls back to customer-id lookup when sub-id misses
- Unknown customer → 200 ack, no row touched
- Unhandled event type → 200 ack
"""

import json
from unittest.mock import patch

import stripe
from sqlalchemy import update as sql_update

from app.db.models.tenant import SubscriptionStatus, Tenant


WEBHOOK_URL = "/api/v1/webhooks/stripe-billing"


def _event(event_type: str, obj: dict, event_id: str = "evt_test") -> dict:
    return {"id": event_id, "type": event_type, "data": {"object": obj}}


async def _set_tenant_stripe(
    session_factory, tenant_id,
    *, customer_id=None, subscription_id=None, status_=None, is_active=None,
):
    values = {}
    if customer_id is not None:
        values["stripe_customer_id"] = customer_id
    if subscription_id is not None:
        values["stripe_subscription_id"] = subscription_id
    if status_ is not None:
        values["subscription_status"] = status_
    if is_active is not None:
        values["is_active"] = is_active
    async with session_factory() as session:
        await session.execute(
            sql_update(Tenant).where(Tenant.id == tenant_id).values(**values)
        )
        await session.commit()


async def _get_tenant(session_factory, tenant_id) -> Tenant:
    async with session_factory() as session:
        return await session.get(Tenant, tenant_id)


# ---------------------------------------------------------------------------
# Signature verification
# ---------------------------------------------------------------------------


class TestSignatureVerification:
    async def test_invalid_signature_returns_400(self, client):
        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            side_effect=stripe.SignatureVerificationError("bad", "sig"),
        ):
            resp = await client.post(
                WEBHOOK_URL,
                content=json.dumps({}),
                headers={"stripe-signature": "t=1,v1=bogus"},
            )
        assert resp.status_code == 400
        assert "signature" in resp.json()["detail"].lower()

    async def test_malformed_payload_returns_400(self, client):
        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            side_effect=ValueError("not json"),
        ):
            resp = await client.post(
                WEBHOOK_URL,
                content=b"not-json",
                headers={"stripe-signature": "t=1,v1=x"},
            )
        assert resp.status_code == 400
        assert "payload" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# invoice.payment_succeeded
# ---------------------------------------------------------------------------


class TestInvoicePaymentSucceeded:
    async def test_flips_tenant_to_active(
        self, client, tenant, test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id,
            customer_id="cus_billing",
            status_=SubscriptionStatus.past_due,
        )
        event = _event("invoice.payment_succeeded", {"customer": "cus_billing"})

        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            return_value=event,
        ):
            resp = await client.post(
                WEBHOOK_URL,
                content=b"{}",
                headers={"stripe-signature": "t=1,v1=x"},
            )

        assert resp.status_code == 200
        assert resp.json() == {"received": True, "event_id": "evt_test"}

        updated = await _get_tenant(test_session_factory, tenant.id)
        assert updated.subscription_status == SubscriptionStatus.active

    async def test_preserves_suspended(
        self, client, tenant, test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id,
            customer_id="cus_billing",
            status_=SubscriptionStatus.suspended,
            is_active=False,
        )
        event = _event("invoice.payment_succeeded", {"customer": "cus_billing"})

        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            return_value=event,
        ):
            resp = await client.post(
                WEBHOOK_URL, content=b"{}",
                headers={"stripe-signature": "x"},
            )
        assert resp.status_code == 200

        updated = await _get_tenant(test_session_factory, tenant.id)
        assert updated.subscription_status == SubscriptionStatus.suspended

    async def test_unknown_customer_is_noop_200(self, client):
        event = _event("invoice.payment_succeeded", {"customer": "cus_does_not_exist"})
        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            return_value=event,
        ):
            resp = await client.post(
                WEBHOOK_URL, content=b"{}",
                headers={"stripe-signature": "x"},
            )
        assert resp.status_code == 200
        assert resp.json()["received"] is True


# ---------------------------------------------------------------------------
# invoice.payment_failed
# ---------------------------------------------------------------------------


class TestInvoicePaymentFailed:
    async def test_flips_tenant_to_past_due(
        self, client, tenant, test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id,
            customer_id="cus_billing",
            status_=SubscriptionStatus.active,
        )
        event = _event("invoice.payment_failed", {"customer": "cus_billing"})

        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            return_value=event,
        ):
            resp = await client.post(
                WEBHOOK_URL, content=b"{}",
                headers={"stripe-signature": "x"},
            )
        assert resp.status_code == 200

        updated = await _get_tenant(test_session_factory, tenant.id)
        assert updated.subscription_status == SubscriptionStatus.past_due


# ---------------------------------------------------------------------------
# customer.subscription.updated
# ---------------------------------------------------------------------------


class TestSubscriptionUpdated:
    async def test_syncs_status_from_stripe(
        self, client, tenant, test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id,
            subscription_id="sub_billing",
            status_=SubscriptionStatus.trialing,
        )
        event = _event(
            "customer.subscription.updated",
            {"id": "sub_billing", "status": "active"},
        )

        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            return_value=event,
        ):
            resp = await client.post(
                WEBHOOK_URL, content=b"{}",
                headers={"stripe-signature": "x"},
            )
        assert resp.status_code == 200

        updated = await _get_tenant(test_session_factory, tenant.id)
        assert updated.subscription_status == SubscriptionStatus.active

    async def test_preserves_suspended(
        self, client, tenant, test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id,
            subscription_id="sub_billing",
            status_=SubscriptionStatus.suspended,
        )
        event = _event(
            "customer.subscription.updated",
            {"id": "sub_billing", "status": "active"},
        )

        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            return_value=event,
        ):
            await client.post(
                WEBHOOK_URL, content=b"{}",
                headers={"stripe-signature": "x"},
            )

        updated = await _get_tenant(test_session_factory, tenant.id)
        assert updated.subscription_status == SubscriptionStatus.suspended


# ---------------------------------------------------------------------------
# customer.subscription.deleted
# ---------------------------------------------------------------------------


class TestSubscriptionDeleted:
    async def test_marks_canceled_and_clears_sub_id(
        self, client, tenant, test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id,
            customer_id="cus_billing",
            subscription_id="sub_billing",
            status_=SubscriptionStatus.active,
            is_active=True,
        )
        event = _event(
            "customer.subscription.deleted",
            {"id": "sub_billing", "customer": "cus_billing"},
        )

        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            return_value=event,
        ):
            resp = await client.post(
                WEBHOOK_URL, content=b"{}",
                headers={"stripe-signature": "x"},
            )
        assert resp.status_code == 200

        updated = await _get_tenant(test_session_factory, tenant.id)
        assert updated.subscription_status == SubscriptionStatus.canceled
        assert updated.is_active is False
        assert updated.stripe_subscription_id is None

    async def test_preserves_suspended_but_still_clears_sub_id(
        self, client, tenant, test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id,
            customer_id="cus_billing",
            subscription_id="sub_billing",
            status_=SubscriptionStatus.suspended,
            is_active=False,
        )
        event = _event(
            "customer.subscription.deleted",
            {"id": "sub_billing", "customer": "cus_billing"},
        )

        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            return_value=event,
        ):
            await client.post(
                WEBHOOK_URL, content=b"{}",
                headers={"stripe-signature": "x"},
            )

        updated = await _get_tenant(test_session_factory, tenant.id)
        assert updated.subscription_status == SubscriptionStatus.suspended
        assert updated.is_active is False
        assert updated.stripe_subscription_id is None

    async def test_falls_back_to_customer_lookup_when_sub_id_misses(
        self, client, tenant, test_session_factory,
    ):
        # Tenant has the customer id but no longer carries the sub id
        # (e.g. the suspend path cleared it earlier).
        await _set_tenant_stripe(
            test_session_factory, tenant.id,
            customer_id="cus_billing",
            status_=SubscriptionStatus.active,
            is_active=True,
        )
        event = _event(
            "customer.subscription.deleted",
            {"id": "sub_already_gone", "customer": "cus_billing"},
        )

        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            return_value=event,
        ):
            resp = await client.post(
                WEBHOOK_URL, content=b"{}",
                headers={"stripe-signature": "x"},
            )
        assert resp.status_code == 200

        updated = await _get_tenant(test_session_factory, tenant.id)
        assert updated.subscription_status == SubscriptionStatus.canceled
        assert updated.is_active is False


# ---------------------------------------------------------------------------
# Unhandled event types — Stripe still needs a 2xx
# ---------------------------------------------------------------------------


class TestUnhandledEventTypes:
    async def test_unhandled_event_returns_200(self, client):
        event = _event("customer.created", {"id": "cus_anything"})
        with patch(
            "app.api.v1.endpoints.webhooks.stripe.Webhook.construct_event",
            return_value=event,
        ):
            resp = await client.post(
                WEBHOOK_URL, content=b"{}",
                headers={"stripe-signature": "x"},
            )
        assert resp.status_code == 200
        assert resp.json() == {"received": True, "event_id": "evt_test"}
