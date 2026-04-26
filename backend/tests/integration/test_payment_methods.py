"""
Integration tests for payment-method endpoints.

Coverage
--------
POST /payments/setup-intent              — success, unauthenticated, wrong tenant
POST /payments/payment-methods           — saves as default, saves without default, unauthenticated
GET  /payments/payment-methods           — list with is_default flag, empty list, unauthenticated
DELETE /payments/payment-methods/{id}    — success, clears default when deleted, foreign card → 404, unauthenticated
PATCH /payments/payment-methods/{id}/default — success, foreign card → 404, unauthenticated

All Stripe API calls are mocked — no network traffic.
"""

import uuid
from unittest.mock import MagicMock, patch

from app.core.security import create_access_token
from app.db.models.tenant import Tenant as TenantModel
from app.db.models.user import User

STRIPE_CUSTOMER_ID = "cus_testAAAAAAAAAAAA"
STRIPE_PM_ID = "pm_testAAAAAAAAAAAA"
STRIPE_PM_ID_2 = "pm_testBBBBBBBBBBBB"
STRIPE_SI_ID = "seti_testAAAAAAAAAAAA"
STRIPE_SI_SECRET = "seti_testAAAAAAAAAAAA_secret_ZZZ"


def _mock_customer(customer_id: str = STRIPE_CUSTOMER_ID) -> MagicMock:
    c = MagicMock()
    c.id = customer_id
    return c


def _mock_pm(pm_id: str = STRIPE_PM_ID, customer_id: str = STRIPE_CUSTOMER_ID) -> MagicMock:
    pm = MagicMock()
    pm.id = pm_id
    pm.customer = customer_id
    pm.card.brand = "visa"
    pm.card.last4 = "4242"
    pm.card.exp_month = 12
    pm.card.exp_year = 2027
    return pm


def _mock_setup_intent() -> MagicMock:
    si = MagicMock()
    si.id = STRIPE_SI_ID
    si.client_secret = STRIPE_SI_SECRET
    return si


async def _set_stripe_fields(
    session_factory,
    user_id,
    *,
    customer_id: str = STRIPE_CUSTOMER_ID,
    default_pm_id: str = None,
) -> None:
    """Persist Stripe fields on a user row so service methods can find them."""
    async with session_factory() as session:
        u = await session.get(User, user_id)
        u.stripe_customer_id = customer_id
        if default_pm_id is not None:
            u.default_payment_method_id = default_pm_id
        await session.commit()


# ---------------------------------------------------------------------------
# POST /payments/setup-intent
# ---------------------------------------------------------------------------


class TestCreateSetupIntent:
    async def test_success(self, client, player_headers):
        with patch("stripe.Customer.create", return_value=_mock_customer()), \
             patch("stripe.SetupIntent.create", return_value=_mock_setup_intent()):
            resp = await client.post("/api/v1/payments/setup-intent", headers=player_headers)

        assert resp.status_code == 200
        body = resp.json()
        assert body["client_secret"] == STRIPE_SI_SECRET
        assert body["setup_intent_id"] == STRIPE_SI_ID

    async def test_reuses_existing_stripe_customer(self, client, player, player_headers, test_session_factory):
        """When stripe_customer_id is already set, Customer.create must not be called."""
        await _set_stripe_fields(test_session_factory, player.id)

        with patch("stripe.Customer.create") as mock_create, \
             patch("stripe.SetupIntent.create", return_value=_mock_setup_intent()):
            resp = await client.post("/api/v1/payments/setup-intent", headers=player_headers)

        assert resp.status_code == 200
        mock_create.assert_not_called()

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.post("/api/v1/payments/setup-intent")
        assert resp.status_code == 403

    async def test_wrong_tenant_returns_401(self, client, player, tenant, plan, test_session_factory):
        subdomain_b = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(
                name="Other Club B",
                subdomain=subdomain_b,
                plan_id=plan.id,
                is_active=True,
            )
            session.add(t2)
            await session.commit()
            await session.refresh(t2)

        try:
            token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
            resp = await client.post(
                "/api/v1/payments/setup-intent",
                headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2.id)},
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()


# ---------------------------------------------------------------------------
# POST /payments/payment-methods
# ---------------------------------------------------------------------------


class TestSavePaymentMethod:
    async def test_saves_and_sets_as_default(self, client, player_headers):
        with patch("stripe.Customer.create", return_value=_mock_customer()), \
             patch("stripe.PaymentMethod.attach", return_value=_mock_pm()), \
             patch("stripe.Customer.modify"):
            resp = await client.post(
                "/api/v1/payments/payment-methods",
                json={"payment_method_id": STRIPE_PM_ID, "set_as_default": True},
                headers=player_headers,
            )

        assert resp.status_code == 201
        body = resp.json()
        assert body["id"] == STRIPE_PM_ID
        assert body["brand"] == "visa"
        assert body["last4"] == "4242"
        assert body["exp_month"] == 12
        assert body["exp_year"] == 2027
        assert body["is_default"] is True

    async def test_saves_without_setting_default(self, client, player, player_headers, test_session_factory):
        # Ensure there's no existing default so is_default comes back False
        await _set_stripe_fields(test_session_factory, player.id, default_pm_id=None)

        with patch("stripe.Customer.create", return_value=_mock_customer()), \
             patch("stripe.PaymentMethod.attach", return_value=_mock_pm()):
            resp = await client.post(
                "/api/v1/payments/payment-methods",
                json={"payment_method_id": STRIPE_PM_ID, "set_as_default": False},
                headers=player_headers,
            )

        assert resp.status_code == 201
        assert resp.json()["is_default"] is False

    async def test_default_persisted_to_db(self, client, player, player_headers, test_session_factory):
        with patch("stripe.Customer.create", return_value=_mock_customer()), \
             patch("stripe.PaymentMethod.attach", return_value=_mock_pm()), \
             patch("stripe.Customer.modify"):
            await client.post(
                "/api/v1/payments/payment-methods",
                json={"payment_method_id": STRIPE_PM_ID, "set_as_default": True},
                headers=player_headers,
            )

        async with test_session_factory() as session:
            u = await session.get(User, player.id)
            assert u.default_payment_method_id == STRIPE_PM_ID

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.post(
            "/api/v1/payments/payment-methods",
            json={"payment_method_id": STRIPE_PM_ID},
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# GET /payments/payment-methods
# ---------------------------------------------------------------------------


class TestListPaymentMethods:
    async def test_returns_list(self, client, player, player_headers, test_session_factory):
        await _set_stripe_fields(test_session_factory, player.id, default_pm_id=STRIPE_PM_ID)

        pm1 = _mock_pm(STRIPE_PM_ID)
        pm2 = _mock_pm(STRIPE_PM_ID_2)
        mock_list = MagicMock()
        mock_list.data = [pm1, pm2]

        with patch("stripe.PaymentMethod.list", return_value=mock_list):
            resp = await client.get("/api/v1/payments/payment-methods", headers=player_headers)

        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 2
        pm1_resp = next(m for m in body if m["id"] == STRIPE_PM_ID)
        pm2_resp = next(m for m in body if m["id"] == STRIPE_PM_ID_2)
        assert pm1_resp["is_default"] is True
        assert pm2_resp["is_default"] is False

    async def test_returns_empty_list(self, client, player_headers):
        mock_list = MagicMock()
        mock_list.data = []

        with patch("stripe.Customer.create", return_value=_mock_customer()), \
             patch("stripe.PaymentMethod.list", return_value=mock_list):
            resp = await client.get("/api/v1/payments/payment-methods", headers=player_headers)

        assert resp.status_code == 200
        assert resp.json() == []

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.get("/api/v1/payments/payment-methods")
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# DELETE /payments/payment-methods/{method_id}
# ---------------------------------------------------------------------------


class TestDeletePaymentMethod:
    async def test_success(self, client, player, player_headers, test_session_factory):
        await _set_stripe_fields(test_session_factory, player.id, default_pm_id=STRIPE_PM_ID_2)

        with patch("stripe.PaymentMethod.retrieve", return_value=_mock_pm(STRIPE_PM_ID)), \
             patch("stripe.PaymentMethod.detach"):
            resp = await client.delete(
                f"/api/v1/payments/payment-methods/{STRIPE_PM_ID}",
                headers=player_headers,
            )

        assert resp.status_code == 204

    async def test_deleting_default_clears_it(self, client, player, player_headers, test_session_factory):
        await _set_stripe_fields(test_session_factory, player.id, default_pm_id=STRIPE_PM_ID)

        with patch("stripe.PaymentMethod.retrieve", return_value=_mock_pm(STRIPE_PM_ID)), \
             patch("stripe.PaymentMethod.detach"):
            resp = await client.delete(
                f"/api/v1/payments/payment-methods/{STRIPE_PM_ID}",
                headers=player_headers,
            )

        assert resp.status_code == 204

        async with test_session_factory() as session:
            u = await session.get(User, player.id)
            assert u.default_payment_method_id is None

    async def test_foreign_card_returns_404(self, client, player, player_headers, test_session_factory):
        """Card belonging to a different Stripe customer is rejected."""
        await _set_stripe_fields(test_session_factory, player.id)

        foreign_pm = _mock_pm(STRIPE_PM_ID, customer_id="cus_SOMEONE_ELSE")
        with patch("stripe.PaymentMethod.retrieve", return_value=foreign_pm):
            resp = await client.delete(
                f"/api/v1/payments/payment-methods/{STRIPE_PM_ID}",
                headers=player_headers,
            )

        assert resp.status_code == 404

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.delete(f"/api/v1/payments/payment-methods/{STRIPE_PM_ID}")
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# PATCH /payments/payment-methods/{method_id}/default
# ---------------------------------------------------------------------------


class TestSetDefaultPaymentMethod:
    async def test_success(self, client, player, player_headers, test_session_factory):
        await _set_stripe_fields(test_session_factory, player.id, default_pm_id=STRIPE_PM_ID_2)

        with patch("stripe.PaymentMethod.retrieve", return_value=_mock_pm(STRIPE_PM_ID)), \
             patch("stripe.Customer.modify"):
            resp = await client.patch(
                f"/api/v1/payments/payment-methods/{STRIPE_PM_ID}/default",
                headers=player_headers,
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == STRIPE_PM_ID
        assert body["is_default"] is True

        async with test_session_factory() as session:
            u = await session.get(User, player.id)
            assert u.default_payment_method_id == STRIPE_PM_ID

    async def test_foreign_card_returns_404(self, client, player, player_headers, test_session_factory):
        await _set_stripe_fields(test_session_factory, player.id)

        foreign_pm = _mock_pm(STRIPE_PM_ID, customer_id="cus_SOMEONE_ELSE")
        with patch("stripe.PaymentMethod.retrieve", return_value=foreign_pm):
            resp = await client.patch(
                f"/api/v1/payments/payment-methods/{STRIPE_PM_ID}/default",
                headers=player_headers,
            )

        assert resp.status_code == 404

    async def test_no_stripe_customer_returns_404(self, client, player_headers):
        """Player with no Stripe customer at all gets 404."""
        resp = await client.patch(
            f"/api/v1/payments/payment-methods/{STRIPE_PM_ID}/default",
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.patch(
            f"/api/v1/payments/payment-methods/{STRIPE_PM_ID}/default"
        )
        assert resp.status_code == 403
