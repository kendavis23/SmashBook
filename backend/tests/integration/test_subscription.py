"""
Integration tests for org-facing `/api/v1/subscription/*` endpoints.

All endpoints require the ``owner`` role on the calling user's tenant.  Stripe
calls go through the shared ``stripe_billing_mock`` fixture, except for the
direct ``stripe.Customer.retrieve_async`` call inside GET /subscription which
is patched per-test.

Coverage
--------
- GET    /subscription            — plan / limits / usage / features / billing status
- GET    /subscription/invoices   — empty, populated, Stripe error
- POST   /subscription/setup-intent — first call, reuse customer, Stripe error
- PUT    /subscription/payment-method — happy path, missing customer, Stripe error
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest_asyncio
import stripe
from sqlalchemy import update as sql_update

from app.db.models.court import Court
from app.db.models.tenant import Tenant


# ---------------------------------------------------------------------------
# Local helpers
# ---------------------------------------------------------------------------


async def _set_tenant_stripe(
    session_factory, tenant_id, *, customer_id=None, subscription_id=None,
):
    async with session_factory() as session:
        values = {}
        if customer_id is not None:
            values["stripe_customer_id"] = customer_id
        if subscription_id is not None:
            values["stripe_subscription_id"] = subscription_id
        if values:
            await session.execute(
                sql_update(Tenant).where(Tenant.id == tenant_id).values(**values)
            )
            await session.commit()


@pytest_asyncio.fixture
async def court(club, test_session_factory):
    """A single court so the usage count picks something up."""
    async with test_session_factory() as session:
        c = Court(
            club_id=club.id,
            name="Court 1",
            surface_type="indoor",
            is_active=True,
        )
        session.add(c)
        await session.commit()
        await session.refresh(c)
    yield c
    # cleanup handled by club / tenant teardown


# ---------------------------------------------------------------------------
# GET /subscription
# ---------------------------------------------------------------------------


class TestViewSubscription:
    async def test_happy_path_returns_plan_and_usage(
        self, client, owner_headers, club, court,
    ):
        # No Stripe IDs set → endpoint should skip the Stripe lookups
        resp = await client.get("/api/v1/subscription", headers=owner_headers)
        assert resp.status_code == 200
        body = resp.json()

        assert body["plan_name"] == "Pro Test Plan"
        assert body["limits"]["max_clubs"] == -1
        assert body["features"]["open_games"] is True
        assert body["usage"]["clubs_used"] == 1
        assert body["usage"]["courts_used"] == 1
        # owner + (auto-seeded) — at least the owner counts as non-player staff
        assert body["usage"]["staff_used"] >= 1
        assert body["has_payment_method"] is False
        assert body["current_period_end"] is None

    async def test_player_forbidden(self, client, player_headers):
        resp = await client.get("/api/v1/subscription", headers=player_headers)
        assert resp.status_code == 403

    async def test_admin_forbidden(self, client, admin_headers):
        resp = await client.get("/api/v1/subscription", headers=admin_headers)
        assert resp.status_code == 403

    async def test_staff_forbidden(self, client, staff_headers):
        resp = await client.get("/api/v1/subscription", headers=staff_headers)
        assert resp.status_code == 403

    async def test_unauthenticated_returns_403(self, client, tenant):
        resp = await client.get(
            "/api/v1/subscription", headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 403

    async def test_current_period_end_from_stripe(
        self, client, owner_headers, tenant, stripe_billing_mock, test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id,
            customer_id="cus_x", subscription_id="sub_x",
        )
        stripe_billing_mock.get_subscription.return_value = {
            "id": "sub_x",
            "status": "active",
            "current_period_end": 1_900_000_000,  # ~2030-03-17
            "cancel_at_period_end": False,
        }
        customer_obj = MagicMock()
        customer_obj.get = lambda key, default=None: {
            "invoice_settings": {"default_payment_method": "pm_default"},
        }.get(key, default)

        with patch(
            "stripe.Customer.retrieve_async",
            new=AsyncMock(return_value=customer_obj),
        ):
            resp = await client.get("/api/v1/subscription", headers=owner_headers)

        assert resp.status_code == 200
        body = resp.json()
        assert body["current_period_end"] is not None
        assert body["has_payment_method"] is True
        stripe_billing_mock.get_subscription.assert_awaited_once_with(
            subscription_id="sub_x"
        )

    async def test_stripe_failure_falls_back_to_db_fields(
        self, client, owner_headers, tenant, stripe_billing_mock, test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id,
            customer_id="cus_x", subscription_id="sub_x",
        )
        stripe_billing_mock.get_subscription.side_effect = stripe.StripeError("down")

        with patch(
            "stripe.Customer.retrieve_async",
            new=AsyncMock(side_effect=stripe.StripeError("down")),
        ):
            resp = await client.get("/api/v1/subscription", headers=owner_headers)

        assert resp.status_code == 200
        body = resp.json()
        # Stripe-derived fields fall back to defaults rather than 500
        assert body["current_period_end"] is None
        assert body["has_payment_method"] is False


# ---------------------------------------------------------------------------
# GET /subscription/invoices
# ---------------------------------------------------------------------------


class TestListInvoices:
    async def test_empty_when_no_stripe_customer(self, client, owner_headers):
        resp = await client.get(
            "/api/v1/subscription/invoices", headers=owner_headers
        )
        assert resp.status_code == 200
        assert resp.json() == {"invoices": []}

    async def test_returns_invoices_from_stripe(
        self, client, owner_headers, tenant, stripe_billing_mock, test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id, customer_id="cus_x"
        )
        stripe_billing_mock.list_invoices.return_value = [
            {
                "id": "in_1",
                "number": "INV-001",
                "status": "paid",
                "amount_due": 9900,
                "amount_paid": 9900,
                "currency": "gbp",
                "created": 1_700_000_000,
                "period_start": 1_700_000_000,
                "period_end": 1_702_592_000,
                "hosted_invoice_url": "https://pay.stripe.com/i/test",
                "invoice_pdf": "https://pay.stripe.com/i/test.pdf",
            },
        ]

        resp = await client.get(
            "/api/v1/subscription/invoices", headers=owner_headers
        )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["invoices"]) == 1
        inv = data["invoices"][0]
        assert inv["id"] == "in_1"
        assert inv["amount_paid"] == 9900
        assert inv["hosted_invoice_url"].startswith("https://")
        stripe_billing_mock.list_invoices.assert_awaited_once_with(
            customer_id="cus_x", limit=20,
        )

    async def test_stripe_error_returns_502(
        self, client, owner_headers, tenant, stripe_billing_mock, test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id, customer_id="cus_x"
        )
        stripe_billing_mock.list_invoices.side_effect = stripe.StripeError("boom")

        resp = await client.get(
            "/api/v1/subscription/invoices", headers=owner_headers
        )
        assert resp.status_code == 502

    async def test_player_forbidden(self, client, player_headers):
        resp = await client.get(
            "/api/v1/subscription/invoices", headers=player_headers
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# POST /subscription/setup-intent
# ---------------------------------------------------------------------------


class TestCreateSetupIntent:
    async def test_creates_customer_when_missing_and_returns_intent(
        self,
        client,
        owner,
        owner_headers,
        tenant,
        stripe_billing_mock,
        test_session_factory,
    ):
        stripe_billing_mock.create_customer.return_value = "cus_new"
        stripe_billing_mock.create_setup_intent.return_value = {
            "id": "seti_new",
            "client_secret": "seti_new_secret_xyz",
        }

        resp = await client.post(
            "/api/v1/subscription/setup-intent", headers=owner_headers
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["setup_intent_id"] == "seti_new"
        assert body["client_secret"] == "seti_new_secret_xyz"

        # Customer was created with the owner's email
        stripe_billing_mock.create_customer.assert_awaited_once()
        assert (
            stripe_billing_mock.create_customer.await_args.kwargs["email"]
            == owner.email
        )

        # And persisted on the tenant row
        async with test_session_factory() as session:
            t = await session.get(Tenant, tenant.id)
            assert t.stripe_customer_id == "cus_new"

        stripe_billing_mock.create_setup_intent.assert_awaited_once_with(
            customer_id="cus_new"
        )

    async def test_reuses_existing_customer(
        self,
        client,
        owner_headers,
        tenant,
        stripe_billing_mock,
        test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id, customer_id="cus_existing"
        )
        resp = await client.post(
            "/api/v1/subscription/setup-intent", headers=owner_headers
        )
        assert resp.status_code == 200
        stripe_billing_mock.create_customer.assert_not_awaited()
        stripe_billing_mock.create_setup_intent.assert_awaited_once_with(
            customer_id="cus_existing"
        )

    async def test_stripe_error_creating_customer_returns_400(
        self, client, owner_headers, stripe_billing_mock,
    ):
        stripe_billing_mock.create_customer.side_effect = stripe.StripeError(
            "rate limited"
        )
        resp = await client.post(
            "/api/v1/subscription/setup-intent", headers=owner_headers
        )
        assert resp.status_code == 400

    async def test_stripe_error_creating_intent_returns_400(
        self, client, owner_headers, tenant, stripe_billing_mock,
        test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id, customer_id="cus_existing"
        )
        stripe_billing_mock.create_setup_intent.side_effect = stripe.StripeError(
            "no_such_customer"
        )
        resp = await client.post(
            "/api/v1/subscription/setup-intent", headers=owner_headers
        )
        assert resp.status_code == 400

    async def test_player_forbidden(self, client, player_headers):
        resp = await client.post(
            "/api/v1/subscription/setup-intent", headers=player_headers
        )
        assert resp.status_code == 403

    async def test_admin_forbidden(self, client, admin_headers):
        resp = await client.post(
            "/api/v1/subscription/setup-intent", headers=admin_headers
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# PUT /subscription/payment-method
# ---------------------------------------------------------------------------


class TestUpdatePaymentMethod:
    async def test_success_sets_default_payment_method(
        self,
        client,
        owner_headers,
        tenant,
        stripe_billing_mock,
        test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id, customer_id="cus_existing"
        )
        stripe_billing_mock.set_default_payment_method.return_value = "pm_42"

        resp = await client.put(
            "/api/v1/subscription/payment-method",
            json={"payment_method_id": "pm_42"},
            headers=owner_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == {"default_payment_method_id": "pm_42"}
        stripe_billing_mock.set_default_payment_method.assert_awaited_once_with(
            customer_id="cus_existing", payment_method_id="pm_42",
        )

    async def test_missing_stripe_customer_returns_422(
        self, client, owner_headers, stripe_billing_mock,
    ):
        resp = await client.put(
            "/api/v1/subscription/payment-method",
            json={"payment_method_id": "pm_42"},
            headers=owner_headers,
        )
        assert resp.status_code == 422
        assert "setup-intent" in resp.json()["detail"]
        stripe_billing_mock.set_default_payment_method.assert_not_awaited()

    async def test_stripe_error_returns_400(
        self, client, owner_headers, tenant, stripe_billing_mock,
        test_session_factory,
    ):
        await _set_tenant_stripe(
            test_session_factory, tenant.id, customer_id="cus_existing"
        )
        stripe_billing_mock.set_default_payment_method.side_effect = (
            stripe.StripeError("invalid_payment_method")
        )
        resp = await client.put(
            "/api/v1/subscription/payment-method",
            json={"payment_method_id": "pm_bad"},
            headers=owner_headers,
        )
        assert resp.status_code == 400

    async def test_player_forbidden(self, client, player_headers):
        resp = await client.put(
            "/api/v1/subscription/payment-method",
            json={"payment_method_id": "pm_42"},
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_admin_forbidden(self, client, admin_headers):
        resp = await client.put(
            "/api/v1/subscription/payment-method",
            json={"payment_method_id": "pm_42"},
            headers=admin_headers,
        )
        assert resp.status_code == 403
