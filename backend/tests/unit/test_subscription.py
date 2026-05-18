"""
Unit tests for the org-facing /api/v1/subscription/* endpoints.

DB sessions and Stripe SDK calls are mocked.  Role enforcement
(`require_owner`) is tested separately via _require_role in auth.py — we
exercise the endpoint functions directly with a synthesized current_user.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import stripe
from fastapi import HTTPException

from app.api.v1.endpoints.subscription import (
    create_setup_intent,
    list_invoices,
    update_payment_method,
    view_subscription,
)
from app.db.models.tenant import SubscriptionStatus
from app.db.models.user import TenantUserRole
from app.schemas.subscription import UpdatePaymentMethodRequest
from app.services import stripe_billing_service


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_tenant(**overrides):
    defaults = dict(
        id=uuid.uuid4(),
        name="Padel Kings",
        subdomain="padelkings",
        custom_domain=None,
        plan_id=uuid.uuid4(),
        is_active=True,
        subscription_start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
        stripe_customer_id=None,
        stripe_subscription_id=None,
        subscription_status=None,
        created_at=datetime.now(tz=timezone.utc),
        updated_at=datetime.now(tz=timezone.utc),
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_plan(**overrides):
    defaults = dict(
        id=uuid.uuid4(),
        name="Pro",
        max_clubs=5,
        max_courts_per_club=10,
        max_staff_users=20,
        open_games_feature=True,
        waitlist_feature=True,
        white_label_enabled=False,
        analytics_enabled=True,
        price_per_month=Decimal("99.00"),
        trial_days=14,
        stripe_price_id="price_test",
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _owner_user(tenant_id):
    return SimpleNamespace(
        id=uuid.uuid4(),
        email="owner@padelkings.com",
        full_name="King Owner",
        tenant_id=tenant_id,
        role=TenantUserRole.owner,
        is_active=True,
    )


def _read_db_for_view(plan, clubs_used=0, courts_used=0, staff_used=0):
    """Mock for the three count queries used by view_subscription."""
    db = AsyncMock()
    db.get = AsyncMock(return_value=plan)

    # Three separate execute calls: clubs, courts, staff counts
    results = []
    for n in (clubs_used, courts_used, staff_used):
        r = MagicMock()
        r.scalar_one.return_value = n
        results.append(r)
    db.execute = AsyncMock(side_effect=results)
    return db


# ---------------------------------------------------------------------------
# GET /subscription
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_view_subscription_returns_plan_limits_and_usage():
    tenant = _make_tenant()
    plan = _make_plan(max_clubs=5, max_courts_per_club=10, max_staff_users=20)
    db = _read_db_for_view(plan, clubs_used=2, courts_used=8, staff_used=3)

    out = await view_subscription(
        current_user=_owner_user(tenant.id), tenant=tenant, db=db,
    )

    assert out.plan_name == "Pro"
    assert out.limits.max_clubs == 5
    assert out.limits.max_courts_per_club == 10
    assert out.usage.clubs_used == 2
    assert out.usage.courts_used == 8
    assert out.usage.staff_used == 3
    assert out.features.open_games is True
    assert out.features.analytics is True
    assert out.is_active is True
    assert out.has_payment_method is False  # no stripe customer
    assert out.current_period_end is None  # no stripe sub


@pytest.mark.asyncio
async def test_view_subscription_fetches_period_end_from_stripe():
    tenant = _make_tenant(
        stripe_customer_id="cus_123",
        stripe_subscription_id="sub_123",
        subscription_status=SubscriptionStatus.active,
    )
    plan = _make_plan()
    db = _read_db_for_view(plan)

    period_end_ts = int(datetime(2026, 6, 1, tzinfo=timezone.utc).timestamp())

    with patch.object(stripe_billing_service, "get_subscription",
                      new=AsyncMock(return_value={
                          "id": "sub_123",
                          "status": "active",
                          "current_period_end": period_end_ts,
                          "cancel_at_period_end": False,
                      })):
        # Customer retrieve routed through the billing service
        fake_customer = {"invoice_settings": {"default_payment_method": "pm_abc"}}
        with patch.object(stripe_billing_service, "get_customer",
                          new=AsyncMock(return_value=fake_customer)):
            out = await view_subscription(
                current_user=_owner_user(tenant.id), tenant=tenant, db=db,
            )

    assert out.current_period_end == datetime(2026, 6, 1, tzinfo=timezone.utc)
    assert out.has_payment_method is True


@pytest.mark.asyncio
async def test_view_subscription_tolerates_stripe_failure():
    """If Stripe is down, we still return the DB-only view (no 5xx)."""
    tenant = _make_tenant(
        stripe_customer_id="cus_123",
        stripe_subscription_id="sub_123",
    )
    plan = _make_plan()
    db = _read_db_for_view(plan)

    with patch.object(stripe_billing_service, "get_subscription",
                      new=AsyncMock(side_effect=stripe.APIConnectionError("Network down"))):
        with patch.object(stripe_billing_service, "get_customer",
                          new=AsyncMock(side_effect=stripe.APIConnectionError("Network down"))):
            out = await view_subscription(
                current_user=_owner_user(tenant.id), tenant=tenant, db=db,
            )

    assert out.current_period_end is None
    assert out.has_payment_method is False


@pytest.mark.asyncio
async def test_view_subscription_plan_not_found():
    tenant = _make_tenant()
    db = AsyncMock()
    db.get = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await view_subscription(
            current_user=_owner_user(tenant.id), tenant=tenant, db=db,
        )
    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# GET /subscription/invoices
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_invoices_returns_empty_when_no_customer():
    tenant = _make_tenant(stripe_customer_id=None)
    out = await list_invoices(current_user=_owner_user(tenant.id), tenant=tenant)
    assert out.invoices == []


@pytest.mark.asyncio
async def test_list_invoices_returns_mapped_invoices():
    tenant = _make_tenant(stripe_customer_id="cus_123")

    created_ts = int(datetime(2026, 4, 1, tzinfo=timezone.utc).timestamp())
    raw = [{
        "id": "in_1",
        "number": "INV-001",
        "status": "paid",
        "amount_due": 9900,
        "amount_paid": 9900,
        "currency": "gbp",
        "created": created_ts,
        "period_start": created_ts,
        "period_end": created_ts + 86400 * 30,
        "hosted_invoice_url": "https://stripe.test/inv/1",
        "invoice_pdf": "https://stripe.test/inv/1.pdf",
    }]

    with patch.object(stripe_billing_service, "list_invoices",
                      new=AsyncMock(return_value=raw)):
        out = await list_invoices(current_user=_owner_user(tenant.id), tenant=tenant)

    assert len(out.invoices) == 1
    inv = out.invoices[0]
    assert inv.id == "in_1"
    assert inv.status == "paid"
    assert inv.amount_paid == 9900
    assert inv.hosted_invoice_url == "https://stripe.test/inv/1"
    assert inv.created == datetime(2026, 4, 1, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_list_invoices_stripe_error_returns_502():
    tenant = _make_tenant(stripe_customer_id="cus_123")
    with patch.object(stripe_billing_service, "list_invoices",
                      new=AsyncMock(side_effect=stripe.APIConnectionError("down"))):
        with pytest.raises(HTTPException) as exc:
            await list_invoices(current_user=_owner_user(tenant.id), tenant=tenant)
    assert exc.value.status_code == 502


# ---------------------------------------------------------------------------
# POST /subscription/setup-intent
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_setup_intent_creates_customer_when_missing():
    tenant = _make_tenant(stripe_customer_id=None)
    user = _owner_user(tenant.id)

    db = AsyncMock()
    db.flush = AsyncMock()

    with patch.object(stripe_billing_service, "create_customer",
                      new=AsyncMock(return_value="cus_new")) as mock_cust, \
         patch.object(stripe_billing_service, "create_setup_intent",
                      new=AsyncMock(return_value={"id": "seti_1",
                                                  "client_secret": "secret_1"})) as mock_setup:
        out = await create_setup_intent(current_user=user, tenant=tenant, db=db)

    mock_cust.assert_awaited_once()
    assert mock_cust.await_args.kwargs["email"] == user.email
    mock_setup.assert_awaited_once_with(customer_id="cus_new")
    assert tenant.stripe_customer_id == "cus_new"
    assert out.setup_intent_id == "seti_1"
    assert out.client_secret == "secret_1"


@pytest.mark.asyncio
async def test_setup_intent_reuses_existing_customer():
    tenant = _make_tenant(stripe_customer_id="cus_existing")
    db = AsyncMock()
    db.flush = AsyncMock()

    with patch.object(stripe_billing_service, "create_customer",
                      new=AsyncMock()) as mock_cust, \
         patch.object(stripe_billing_service, "create_setup_intent",
                      new=AsyncMock(return_value={"id": "seti_2",
                                                  "client_secret": "secret_2"})) as mock_setup:
        out = await create_setup_intent(
            current_user=_owner_user(tenant.id), tenant=tenant, db=db,
        )

    mock_cust.assert_not_awaited()
    mock_setup.assert_awaited_once_with(customer_id="cus_existing")
    assert out.setup_intent_id == "seti_2"


@pytest.mark.asyncio
async def test_setup_intent_stripe_error_returns_400():
    tenant = _make_tenant(stripe_customer_id="cus_123")
    db = AsyncMock()
    db.flush = AsyncMock()

    with patch.object(stripe_billing_service, "create_setup_intent",
                      new=AsyncMock(side_effect=stripe.InvalidRequestError("bad", "param"))):
        with pytest.raises(HTTPException) as exc:
            await create_setup_intent(
                current_user=_owner_user(tenant.id), tenant=tenant, db=db,
            )
    assert exc.value.status_code == 400


# ---------------------------------------------------------------------------
# PUT /subscription/payment-method
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_payment_method_sets_default():
    tenant = _make_tenant(stripe_customer_id="cus_123")

    with patch.object(stripe_billing_service, "set_default_payment_method",
                      new=AsyncMock(return_value="pm_abc")) as mock_set:
        out = await update_payment_method(
            body=UpdatePaymentMethodRequest(payment_method_id="pm_abc"),
            current_user=_owner_user(tenant.id),
            tenant=tenant,
        )

    mock_set.assert_awaited_once_with(
        customer_id="cus_123", payment_method_id="pm_abc",
    )
    assert out.default_payment_method_id == "pm_abc"


@pytest.mark.asyncio
async def test_update_payment_method_no_customer():
    tenant = _make_tenant(stripe_customer_id=None)
    with pytest.raises(HTTPException) as exc:
        await update_payment_method(
            body=UpdatePaymentMethodRequest(payment_method_id="pm_abc"),
            current_user=_owner_user(tenant.id),
            tenant=tenant,
        )
    assert exc.value.status_code == 422
    assert "setup-intent" in exc.value.detail


@pytest.mark.asyncio
async def test_update_payment_method_stripe_error_returns_400():
    tenant = _make_tenant(stripe_customer_id="cus_123")
    with patch.object(stripe_billing_service, "set_default_payment_method",
                      new=AsyncMock(side_effect=stripe.CardError("declined", "param", "code"))):
        with pytest.raises(HTTPException) as exc:
            await update_payment_method(
                body=UpdatePaymentMethodRequest(payment_method_id="pm_bad"),
                current_user=_owner_user(tenant.id),
                tenant=tenant,
            )
    assert exc.value.status_code == 400


# ---------------------------------------------------------------------------
# require_owner role enforcement (integration with role dep)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_require_owner_rejects_admin_role():
    from app.api.v1.dependencies.auth import require_owner
    user = SimpleNamespace(role=TenantUserRole.admin, is_active=True)
    with pytest.raises(HTTPException) as exc:
        await require_owner(current_user=user)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_require_owner_accepts_owner_role():
    from app.api.v1.dependencies.auth import require_owner
    user = SimpleNamespace(role=TenantUserRole.owner, is_active=True)
    out = await require_owner(current_user=user)
    assert out is user
