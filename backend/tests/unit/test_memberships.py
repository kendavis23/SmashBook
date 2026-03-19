"""
Unit tests for membership plan endpoints.

POST   /clubs/{club_id}/membership-plans  — create plan
GET    /clubs/{club_id}/membership-plans  — list plans
GET    /clubs/{club_id}/membership-plans/{plan_id}  — get plan
PATCH  /clubs/{club_id}/membership-plans/{plan_id}  — update plan

The database session is mocked — no real Postgres needed.
"""

import uuid
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.memberships import (
    create_membership_plan,
    get_membership_plan,
    list_membership_plans,
    update_membership_plan,
)
from app.db.models.membership import BillingPeriod, MembershipPlan
from app.schemas.membership import MembershipPlanCreate, MembershipPlanUpdate


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

TENANT_ID = uuid.uuid4()
CLUB_ID = uuid.uuid4()
PLAN_ID = uuid.uuid4()

TENANT = SimpleNamespace(id=TENANT_ID)
CURRENT_USER = SimpleNamespace(id=uuid.uuid4())


def _make_club(**kwargs):
    defaults = dict(id=CLUB_ID, tenant_id=TENANT_ID, name="Test Club")
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _make_plan(**kwargs):
    defaults = dict(
        id=PLAN_ID,
        club_id=CLUB_ID,
        name="Silver",
        description=None,
        billing_period=BillingPeriod.monthly,
        price=Decimal("29.99"),
        trial_days=0,
        booking_credits_per_period=None,
        guest_passes_per_period=None,
        discount_pct=None,
        priority_booking_days=None,
        max_active_members=None,
        is_active=True,
        stripe_price_id=None,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _create_body(**kwargs) -> MembershipPlanCreate:
    defaults = dict(
        name="Silver",
        billing_period=BillingPeriod.monthly,
        price=Decimal("29.99"),
    )
    defaults.update(kwargs)
    return MembershipPlanCreate(**defaults)


def _make_write_db(club=None):
    """DB mock for write endpoints: returns club from select, tracks add/flush."""
    db = AsyncMock()
    club_obj = club if club is not None else _make_club()

    # _get_club uses execute().scalar_one_or_none()
    club_result = MagicMock()
    club_result.scalar_one_or_none.return_value = club_obj

    db.execute = AsyncMock(return_value=club_result)
    db.flush = AsyncMock()

    added = []

    def _add(obj):
        if not getattr(obj, "id", None):
            object.__setattr__(obj, "id", uuid.uuid4())
        added.append(obj)

    db.add = MagicMock(side_effect=_add)
    db._added = added
    return db


def _make_read_db(club=None, plans=None):
    """DB mock for read endpoints: returns club then plans from consecutive executes."""
    db = AsyncMock()
    club_obj = club if club is not None else _make_club()

    club_result = MagicMock()
    club_result.scalar_one_or_none.return_value = club_obj

    plans_list = plans if plans is not None else []
    plans_scalars = MagicMock()
    plans_scalars.all.return_value = plans_list
    plans_result = MagicMock()
    plans_result.scalars.return_value = plans_scalars
    # scalar_one_or_none for get_plan
    plans_result.scalar_one_or_none.return_value = plans_list[0] if plans_list else None

    db.execute = AsyncMock(side_effect=[club_result, plans_result])
    return db


# ---------------------------------------------------------------------------
# POST /clubs/{club_id}/membership-plans — create_membership_plan
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_plan_returns_plan_with_correct_name():
    db = _make_write_db()
    result = await create_membership_plan(CLUB_ID, _create_body(name="Gold"), CURRENT_USER, TENANT, db)
    assert result.name == "Gold"


@pytest.mark.asyncio
async def test_create_plan_scoped_to_club():
    db = _make_write_db()
    result = await create_membership_plan(CLUB_ID, _create_body(), CURRENT_USER, TENANT, db)
    assert result.club_id == CLUB_ID


@pytest.mark.asyncio
async def test_create_plan_stores_price():
    db = _make_write_db()
    result = await create_membership_plan(
        CLUB_ID, _create_body(price=Decimal("49.99")), CURRENT_USER, TENANT, db
    )
    assert result.price == Decimal("49.99")


@pytest.mark.asyncio
async def test_create_plan_stores_billing_period():
    db = _make_write_db()
    result = await create_membership_plan(
        CLUB_ID, _create_body(billing_period=BillingPeriod.annual), CURRENT_USER, TENANT, db
    )
    assert result.billing_period == BillingPeriod.annual


@pytest.mark.asyncio
async def test_create_plan_stores_optional_fields():
    db = _make_write_db()
    result = await create_membership_plan(
        CLUB_ID,
        _create_body(
            description="Best value",
            trial_days=14,
            booking_credits_per_period=10,
            guest_passes_per_period=2,
            discount_pct=Decimal("10.00"),
            priority_booking_days=3,
            max_active_members=50,
        ),
        CURRENT_USER,
        TENANT,
        db,
    )
    assert result.description == "Best value"
    assert result.trial_days == 14
    assert result.booking_credits_per_period == 10
    assert result.guest_passes_per_period == 2
    assert result.discount_pct == Decimal("10.00")
    assert result.priority_booking_days == 3
    assert result.max_active_members == 50


@pytest.mark.asyncio
async def test_create_plan_defaults_trial_days_to_zero():
    db = _make_write_db()
    result = await create_membership_plan(CLUB_ID, _create_body(), CURRENT_USER, TENANT, db)
    assert result.trial_days == 0


@pytest.mark.asyncio
async def test_create_plan_raises_404_when_club_not_found():
    db = _make_write_db(club=None)
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
    with pytest.raises(HTTPException) as exc_info:
        await create_membership_plan(CLUB_ID, _create_body(), CURRENT_USER, TENANT, db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_create_plan_adds_membership_plan_object():
    db = _make_write_db()
    await create_membership_plan(CLUB_ID, _create_body(), CURRENT_USER, TENANT, db)
    assert len(db._added) == 1
    assert isinstance(db._added[0], MembershipPlan)


@pytest.mark.asyncio
async def test_create_plan_flushes():
    db = _make_write_db()
    await create_membership_plan(CLUB_ID, _create_body(), CURRENT_USER, TENANT, db)
    db.flush.assert_awaited_once()


# ---------------------------------------------------------------------------
# GET /clubs/{club_id}/membership-plans — list_membership_plans
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_plans_returns_all_plans():
    plans = [_make_plan(name="Silver"), _make_plan(id=uuid.uuid4(), name="Gold")]
    db = _make_read_db(plans=plans)
    result = await list_membership_plans(CLUB_ID, TENANT, db)
    assert result == plans


@pytest.mark.asyncio
async def test_list_plans_returns_empty_when_none():
    db = _make_read_db(plans=[])
    result = await list_membership_plans(CLUB_ID, TENANT, db)
    assert result == []


@pytest.mark.asyncio
async def test_list_plans_raises_404_when_club_not_found():
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )
    with pytest.raises(HTTPException) as exc_info:
        await list_membership_plans(CLUB_ID, TENANT, db)
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# GET /clubs/{club_id}/membership-plans/{plan_id} — get_membership_plan
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_plan_returns_correct_plan():
    plan = _make_plan()
    db = _make_read_db(plans=[plan])
    result = await get_membership_plan(CLUB_ID, PLAN_ID, TENANT, db)
    assert result.id == PLAN_ID


@pytest.mark.asyncio
async def test_get_plan_raises_404_when_plan_not_found():
    db = _make_read_db(plans=[])
    with pytest.raises(HTTPException) as exc_info:
        await get_membership_plan(CLUB_ID, uuid.uuid4(), TENANT, db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_plan_raises_404_when_club_not_found():
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )
    with pytest.raises(HTTPException) as exc_info:
        await get_membership_plan(CLUB_ID, PLAN_ID, TENANT, db)
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /clubs/{club_id}/membership-plans/{plan_id} — update_membership_plan
# ---------------------------------------------------------------------------


def _make_update_db(club=None, plan=None):
    """DB mock for update: club result then plan result."""
    db = AsyncMock()
    club_obj = club if club is not None else _make_club()
    plan_obj = plan  # may be None to simulate not found

    club_result = MagicMock()
    club_result.scalar_one_or_none.return_value = club_obj

    plan_result = MagicMock()
    plan_result.scalar_one_or_none.return_value = plan_obj

    db.execute = AsyncMock(side_effect=[club_result, plan_result])
    db.flush = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_update_plan_renames_plan():
    plan = _make_plan(name="Silver")
    db = _make_update_db(plan=plan)
    result = await update_membership_plan(CLUB_ID, PLAN_ID, MembershipPlanUpdate(name="Gold"), CURRENT_USER, TENANT, db)
    assert result.name == "Gold"


@pytest.mark.asyncio
async def test_update_plan_updates_price():
    plan = _make_plan(price=Decimal("29.99"))
    db = _make_update_db(plan=plan)
    result = await update_membership_plan(
        CLUB_ID, PLAN_ID, MembershipPlanUpdate(price=Decimal("49.99")), CURRENT_USER, TENANT, db
    )
    assert result.price == Decimal("49.99")


@pytest.mark.asyncio
async def test_update_plan_deactivates_plan():
    plan = _make_plan(is_active=True)
    db = _make_update_db(plan=plan)
    result = await update_membership_plan(
        CLUB_ID, PLAN_ID, MembershipPlanUpdate(is_active=False), CURRENT_USER, TENANT, db
    )
    assert result.is_active is False


@pytest.mark.asyncio
async def test_update_plan_ignores_none_fields():
    plan = _make_plan(name="Keep Me", price=Decimal("29.99"))
    db = _make_update_db(plan=plan)
    result = await update_membership_plan(
        CLUB_ID, PLAN_ID, MembershipPlanUpdate(trial_days=7), CURRENT_USER, TENANT, db
    )
    assert result.name == "Keep Me"
    assert result.price == Decimal("29.99")


@pytest.mark.asyncio
async def test_update_plan_raises_404_when_plan_not_found():
    db = _make_update_db(plan=None)
    with pytest.raises(HTTPException) as exc_info:
        await update_membership_plan(
            CLUB_ID, uuid.uuid4(), MembershipPlanUpdate(name="X"), CURRENT_USER, TENANT, db
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_update_plan_raises_404_when_club_not_found():
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )
    with pytest.raises(HTTPException) as exc_info:
        await update_membership_plan(
            CLUB_ID, PLAN_ID, MembershipPlanUpdate(name="X"), CURRENT_USER, TENANT, db
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_update_plan_flushes_on_success():
    plan = _make_plan()
    db = _make_update_db(plan=plan)
    await update_membership_plan(
        CLUB_ID, PLAN_ID, MembershipPlanUpdate(name="Updated"), CURRENT_USER, TENANT, db
    )
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_plan_no_flush_on_club_404():
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )
    db.flush = AsyncMock()
    with pytest.raises(HTTPException):
        await update_membership_plan(
            CLUB_ID, PLAN_ID, MembershipPlanUpdate(name="X"), CURRENT_USER, TENANT, db
        )
    db.flush.assert_not_awaited()


# ---------------------------------------------------------------------------
# MembershipPlanCreate schema validation
# ---------------------------------------------------------------------------


def test_plan_create_requires_name():
    import pytest
    with pytest.raises(Exception):
        MembershipPlanCreate(billing_period=BillingPeriod.monthly, price=Decimal("10.00"))


def test_plan_create_requires_billing_period():
    with pytest.raises(Exception):
        MembershipPlanCreate(name="Silver", price=Decimal("10.00"))


def test_plan_create_requires_price():
    with pytest.raises(Exception):
        MembershipPlanCreate(name="Silver", billing_period=BillingPeriod.monthly)


def test_plan_create_valid_minimal():
    plan = MembershipPlanCreate(
        name="Silver",
        billing_period=BillingPeriod.monthly,
        price=Decimal("19.99"),
    )
    assert plan.trial_days == 0
    assert plan.description is None
    assert plan.booking_credits_per_period is None
