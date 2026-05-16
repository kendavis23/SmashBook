"""
Unit tests for the platform-admin endpoints added in Phase 2:
plan CRUD, tenant list/get/patch, and tenant activate/suspend/change-plan.

DB sessions and Stripe SDK calls are mocked — no real Postgres or Stripe
traffic.  The existing onboarding tests in test_onboarding.py cover
`_require_platform_key`, so we don't duplicate that here.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import stripe
from fastapi import HTTPException

from app.api.v1.endpoints.admin import (
    activate_tenant,
    change_tenant_plan,
    create_plan,
    get_plan,
    get_tenant,
    list_plans,
    list_tenants,
    suspend_tenant,
    update_plan,
    update_tenant,
)
from app.db.models.tenant import SubscriptionStatus
from app.db.models.user import TenantUserRole
from app.schemas.admin import (
    PlanCreate,
    PlanUpdate,
    TenantActivateRequest,
    TenantChangePlanRequest,
    TenantUpdate,
)
from app.services import stripe_billing_service


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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
        setup_fee=Decimal("0"),
        trial_days=14,
        booking_fee_pct=None,
        revenue_share_pct=None,
        third_party_revenue_share_pct=None,
        overage_fee_per_booking=None,
        max_api_calls_per_month=None,
        stripe_price_id="price_test_123",
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_tenant(**overrides):
    defaults = dict(
        id=uuid.uuid4(),
        name="Padel Kings",
        subdomain="padelkings",
        custom_domain=None,
        plan_id=uuid.uuid4(),
        is_active=True,
        subscription_start_date=None,
        stripe_customer_id=None,
        stripe_subscription_id=None,
        subscription_status=None,
        created_at=datetime.now(tz=timezone.utc),
        updated_at=datetime.now(tz=timezone.utc),
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_db(*, tenant=None, plan=None, club_count: int = 0,
             subdomain_exists: bool = False, owner=None):
    """
    A minimal AsyncSession mock that routes db.get by model type and returns
    canned db.execute results for the few patterns these endpoints use:
      - select(func.count())... -> scalar_one()
      - select(Tenant).where(subdomain == ...) -> scalar_one_or_none()
      - select(User).where(role=owner) -> scalar_one_or_none()
    """
    db = AsyncMock()

    from app.db.models.tenant import SubscriptionPlan, Tenant
    from app.db.models.user import User

    async def _get(model, _id):
        if model is Tenant:
            return tenant
        if model is SubscriptionPlan:
            return plan
        if model is User:
            return owner
        return None

    db.get = AsyncMock(side_effect=_get)

    # db.execute is called for: count, subdomain lookup, owner lookup
    # We use side_effect to dispatch by call count or context.
    count_result = MagicMock()
    count_result.scalar_one.return_value = club_count

    subdomain_result = MagicMock()
    subdomain_result.scalar_one_or_none.return_value = (
        SimpleNamespace(id=uuid.uuid4()) if subdomain_exists else None
    )

    owner_result = MagicMock()
    owner_result.scalar_one_or_none.return_value = owner

    # Default: count query. Tests that need other paths pass an explicit
    # execute mock via db.execute = AsyncMock(...).
    db.execute = AsyncMock(return_value=count_result)
    db._count_result = count_result
    db._subdomain_result = subdomain_result
    db._owner_result = owner_result

    db.flush = AsyncMock()

    added = []
    db.add = MagicMock(side_effect=lambda obj: added.append(obj))
    db._added = added
    return db


# ---------------------------------------------------------------------------
# Plan CRUD
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_plans_returns_all():
    plans = [_make_plan(name="Starter"), _make_plan(name="Pro")]
    db = _make_db()
    scalars = MagicMock()
    scalars.all.return_value = plans
    result = MagicMock()
    result.scalars.return_value = scalars
    db.execute = AsyncMock(return_value=result)

    out = await list_plans(db)
    assert out == plans


@pytest.mark.asyncio
async def test_create_plan_persists_fields():
    db = _make_db()
    body = PlanCreate(
        name="Enterprise",
        max_clubs=-1,
        max_courts_per_club=-1,
        max_staff_users=-1,
        price_per_month=Decimal("499.00"),
        stripe_price_id="price_ent",
    )
    out = await create_plan(body, db)
    db.add.assert_called_once()
    db.flush.assert_awaited_once()
    assert out.name == "Enterprise"
    assert out.stripe_price_id == "price_ent"


@pytest.mark.asyncio
async def test_get_plan_not_found():
    db = _make_db(plan=None)
    with pytest.raises(HTTPException) as exc:
        await get_plan(uuid.uuid4(), db)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_update_plan_modifies_supplied_fields_only():
    plan = _make_plan(name="Pro", price_per_month=Decimal("99.00"))
    db = _make_db(plan=plan)
    body = PlanUpdate(price_per_month=Decimal("149.00"))

    out = await update_plan(plan.id, body, db)
    assert out.price_per_month == Decimal("149.00")
    assert out.name == "Pro"  # untouched


@pytest.mark.asyncio
async def test_update_plan_not_found():
    db = _make_db(plan=None)
    with pytest.raises(HTTPException) as exc:
        await update_plan(uuid.uuid4(), PlanUpdate(name="X"), db)
    assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# Tenant list / get / patch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_tenants_includes_plan_name_and_club_count():
    t = _make_tenant()
    db = _make_db()
    rows = [(t, "Pro", 3)]
    result = MagicMock()
    result.all.return_value = rows
    db.execute = AsyncMock(return_value=result)

    out = await list_tenants(db)
    assert len(out) == 1
    assert out[0].plan_name == "Pro"
    assert out[0].club_count == 3
    assert out[0].id == t.id


@pytest.mark.asyncio
async def test_get_tenant_not_found():
    db = _make_db(tenant=None)
    with pytest.raises(HTTPException) as exc:
        await get_tenant(uuid.uuid4(), db)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_tenant_returns_detail():
    t = _make_tenant(stripe_customer_id="cus_123")
    p = _make_plan(name="Pro")
    db = _make_db(tenant=t, plan=p, club_count=2)

    out = await get_tenant(t.id, db)
    assert out.id == t.id
    assert out.plan_name == "Pro"
    assert out.club_count == 2
    assert out.stripe_customer_id == "cus_123"


@pytest.mark.asyncio
async def test_patch_tenant_subdomain_conflict():
    t = _make_tenant(subdomain="old")
    p = _make_plan()
    db = _make_db(tenant=t, plan=p)

    # First execute: club count for _load_tenant_with_plan
    # Second execute: subdomain conflict check
    db.execute = AsyncMock(side_effect=[db._count_result,
                                        db._subdomain_result])
    db._subdomain_result.scalar_one_or_none.return_value = SimpleNamespace(id=uuid.uuid4())

    with pytest.raises(HTTPException) as exc:
        await update_tenant(t.id, TenantUpdate(subdomain="taken"), db)
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_patch_tenant_updates_custom_domain():
    t = _make_tenant()
    p = _make_plan()
    db = _make_db(tenant=t, plan=p)

    out = await update_tenant(t.id, TenantUpdate(custom_domain="myclub.com"), db)
    assert out.custom_domain == "myclub.com"


# ---------------------------------------------------------------------------
# Tenant activate
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_activate_fails_when_plan_has_no_stripe_price_id():
    t = _make_tenant()
    p = _make_plan(stripe_price_id=None)
    db = _make_db(tenant=t, plan=p)

    with pytest.raises(HTTPException) as exc:
        await activate_tenant(t.id, TenantActivateRequest(), db)
    assert exc.value.status_code == 422
    assert "stripe_price_id" in exc.value.detail


@pytest.mark.asyncio
async def test_activate_blocks_when_already_active():
    t = _make_tenant(subscription_status=SubscriptionStatus.active)
    p = _make_plan()
    db = _make_db(tenant=t, plan=p)

    with pytest.raises(HTTPException) as exc:
        await activate_tenant(t.id, TenantActivateRequest(), db)
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_activate_creates_customer_and_subscription_with_owner_email():
    t = _make_tenant()
    p = _make_plan(stripe_price_id="price_pro", trial_days=14)
    owner = SimpleNamespace(id=uuid.uuid4(), email="owner@padelkings.com",
                            role=TenantUserRole.owner, tenant_id=t.id)
    db = _make_db(tenant=t, plan=p, owner=owner)

    # Two execute calls: count, then owner lookup
    db._owner_result.scalar_one_or_none.return_value = owner
    db.execute = AsyncMock(side_effect=[db._count_result, db._owner_result])

    with patch.object(stripe_billing_service, "create_customer",
                      new=AsyncMock(return_value="cus_new")) as mock_cust, \
         patch.object(stripe_billing_service, "create_subscription",
                      new=AsyncMock(return_value={"id": "sub_new", "status": "trialing"})) as mock_sub:
        out = await activate_tenant(t.id, TenantActivateRequest(), db)

    mock_cust.assert_awaited_once()
    assert mock_cust.await_args.kwargs["email"] == "owner@padelkings.com"
    mock_sub.assert_awaited_once_with(
        customer_id="cus_new", price_id="price_pro", trial_days=14, tenant_id=str(t.id),
    )
    assert t.stripe_customer_id == "cus_new"
    assert t.stripe_subscription_id == "sub_new"
    assert t.subscription_status == SubscriptionStatus.trialing
    assert t.is_active is True
    assert t.subscription_start_date is not None
    assert out.stripe_subscription_id == "sub_new"


@pytest.mark.asyncio
async def test_activate_uses_billing_email_override():
    t = _make_tenant()
    p = _make_plan()
    db = _make_db(tenant=t, plan=p)

    with patch.object(stripe_billing_service, "create_customer",
                      new=AsyncMock(return_value="cus_new")) as mock_cust, \
         patch.object(stripe_billing_service, "create_subscription",
                      new=AsyncMock(return_value={"id": "sub_new", "status": "active"})):
        await activate_tenant(
            t.id, TenantActivateRequest(billing_email="finance@padelkings.com"), db,
        )

    assert mock_cust.await_args.kwargs["email"] == "finance@padelkings.com"


@pytest.mark.asyncio
async def test_activate_reuses_existing_stripe_customer():
    t = _make_tenant(stripe_customer_id="cus_existing")
    p = _make_plan()
    db = _make_db(tenant=t, plan=p)

    with patch.object(stripe_billing_service, "create_customer",
                      new=AsyncMock()) as mock_cust, \
         patch.object(stripe_billing_service, "create_subscription",
                      new=AsyncMock(return_value={"id": "sub_new", "status": "active"})) as mock_sub:
        await activate_tenant(t.id, TenantActivateRequest(), db)

    mock_cust.assert_not_awaited()
    assert mock_sub.await_args.kwargs["customer_id"] == "cus_existing"
    assert t.subscription_status == SubscriptionStatus.active


# ---------------------------------------------------------------------------
# Tenant suspend
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_suspend_cancels_stripe_subscription():
    t = _make_tenant(
        stripe_customer_id="cus_123",
        stripe_subscription_id="sub_123",
        subscription_status=SubscriptionStatus.active,
    )
    p = _make_plan()
    db = _make_db(tenant=t, plan=p)

    with patch.object(stripe_billing_service, "cancel_subscription",
                      new=AsyncMock(return_value={"id": "sub_123", "status": "canceled"})) as mock_cancel:
        out = await suspend_tenant(t.id, db)

    mock_cancel.assert_awaited_once_with(subscription_id="sub_123")
    assert t.is_active is False
    assert t.subscription_status == SubscriptionStatus.suspended
    assert t.stripe_subscription_id is None
    assert out.subscription_status == SubscriptionStatus.suspended


@pytest.mark.asyncio
async def test_suspend_when_no_subscription():
    """Suspending a tenant that never activated should still flip the flags."""
    t = _make_tenant(stripe_subscription_id=None)
    p = _make_plan()
    db = _make_db(tenant=t, plan=p)

    with patch.object(stripe_billing_service, "cancel_subscription",
                      new=AsyncMock()) as mock_cancel:
        await suspend_tenant(t.id, db)

    mock_cancel.assert_not_awaited()
    assert t.is_active is False
    assert t.subscription_status == SubscriptionStatus.suspended


# ---------------------------------------------------------------------------
# Tenant change-plan
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_change_plan_updates_stripe_subscription_when_active():
    t = _make_tenant(stripe_subscription_id="sub_123",
                     subscription_status=SubscriptionStatus.active)
    old_plan = _make_plan(name="Starter", stripe_price_id="price_old")
    new_plan = _make_plan(name="Pro", stripe_price_id="price_new")

    # _load_tenant_with_plan calls db.get(Tenant) then db.get(SubscriptionPlan, current_plan)
    # change_tenant_plan then calls db.get(SubscriptionPlan, new_plan_id)
    db = AsyncMock()
    from app.db.models.tenant import SubscriptionPlan, Tenant

    plan_calls = []

    async def _get(model, id_):
        if model is Tenant:
            return t
        if model is SubscriptionPlan:
            plan_calls.append(id_)
            return old_plan if len(plan_calls) == 1 else new_plan
        return None

    db.get = AsyncMock(side_effect=_get)

    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    db.execute = AsyncMock(return_value=count_result)
    db.flush = AsyncMock()

    with patch.object(stripe_billing_service, "update_subscription_price",
                      new=AsyncMock(return_value={"id": "sub_123", "status": "active"})) as mock_update:
        out = await change_tenant_plan(t.id, TenantChangePlanRequest(plan_id=new_plan.id), db)

    mock_update.assert_awaited_once_with(
        subscription_id="sub_123", new_price_id="price_new",
    )
    assert t.plan_id == new_plan.id
    assert out.plan_name == "Pro"


@pytest.mark.asyncio
async def test_change_plan_no_subscription_just_swaps_plan_id():
    t = _make_tenant(stripe_subscription_id=None)
    old_plan = _make_plan(name="Starter")
    new_plan = _make_plan(name="Pro")

    db = AsyncMock()
    from app.db.models.tenant import SubscriptionPlan, Tenant

    plan_calls = []

    async def _get(model, id_):
        if model is Tenant:
            return t
        if model is SubscriptionPlan:
            plan_calls.append(id_)
            return old_plan if len(plan_calls) == 1 else new_plan
        return None

    db.get = AsyncMock(side_effect=_get)
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    db.execute = AsyncMock(return_value=count_result)
    db.flush = AsyncMock()

    with patch.object(stripe_billing_service, "update_subscription_price",
                      new=AsyncMock()) as mock_update:
        await change_tenant_plan(t.id, TenantChangePlanRequest(plan_id=new_plan.id), db)

    mock_update.assert_not_awaited()
    assert t.plan_id == new_plan.id


@pytest.mark.asyncio
async def test_change_plan_new_plan_not_found():
    t = _make_tenant()
    old_plan = _make_plan()

    db = AsyncMock()
    from app.db.models.tenant import SubscriptionPlan, Tenant

    plan_calls = []

    async def _get(model, id_):
        if model is Tenant:
            return t
        if model is SubscriptionPlan:
            plan_calls.append(id_)
            return old_plan if len(plan_calls) == 1 else None
        return None

    db.get = AsyncMock(side_effect=_get)
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    db.execute = AsyncMock(return_value=count_result)
    db.flush = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await change_tenant_plan(t.id, TenantChangePlanRequest(plan_id=uuid.uuid4()), db)
    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_change_plan_fails_when_new_plan_has_no_stripe_price_id_and_sub_active():
    t = _make_tenant(stripe_subscription_id="sub_123")
    old_plan = _make_plan()
    new_plan = _make_plan(name="Free", stripe_price_id=None)

    db = AsyncMock()
    from app.db.models.tenant import SubscriptionPlan, Tenant

    plan_calls = []

    async def _get(model, id_):
        if model is Tenant:
            return t
        if model is SubscriptionPlan:
            plan_calls.append(id_)
            return old_plan if len(plan_calls) == 1 else new_plan
        return None

    db.get = AsyncMock(side_effect=_get)
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    db.execute = AsyncMock(return_value=count_result)
    db.flush = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await change_tenant_plan(t.id, TenantChangePlanRequest(plan_id=new_plan.id), db)
    assert exc.value.status_code == 422


# ---------------------------------------------------------------------------
# Stripe status mapping (pure function)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("stripe_status,expected", [
    ("trialing", SubscriptionStatus.trialing),
    ("active", SubscriptionStatus.active),
    ("past_due", SubscriptionStatus.past_due),
    ("canceled", SubscriptionStatus.canceled),
    ("unpaid", SubscriptionStatus.past_due),
    ("incomplete", SubscriptionStatus.past_due),
    ("incomplete_expired", SubscriptionStatus.canceled),
    ("paused", SubscriptionStatus.suspended),
    ("nonsense", None),
    (None, None),
])
def test_map_stripe_status(stripe_status, expected):
    assert stripe_billing_service.map_stripe_status(stripe_status) == expected
