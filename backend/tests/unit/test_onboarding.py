"""
Unit tests for POST /api/v1/admin/onboard.

The database session and password hashing are mocked so no real
Postgres or bcrypt work is needed.
"""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.admin import onboard_tenant, _require_platform_key
from app.schemas.onboarding import (
    ClubCreate,
    OwnerCreate,
    TenantOnboardRequest,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

PLAN_ID = uuid.uuid4()
PLAN = SimpleNamespace(id=PLAN_ID, name="starter", max_clubs=1, max_courts_per_club=4)
PLAN_UNLIMITED = SimpleNamespace(id=PLAN_ID, name="pro", max_clubs=-1, max_courts_per_club=-1)


def _valid_request(**overrides) -> TenantOnboardRequest:
    defaults = dict(
        name="Padel Kings",
        trading_name="Padel Kings",
        player_subdomain="padelkings",
        staff_subdomain="padelkings-staff",
        plan_id=PLAN_ID,
        clubs=[ClubCreate(name="Padel Kings Club", currency="GBP")],
        owner=OwnerCreate(email="owner@padelkings.com", full_name="King Owner", password="s3cret"),
    )
    defaults.update(overrides)
    return TenantOnboardRequest(**defaults)


def _make_db(plan=PLAN, subdomain_exists=False):
    """Return a minimal AsyncSession mock.

    When ``subdomain_exists`` is True, ``db.execute`` returns one row indicating
    the requested player_subdomain is already taken on another tenant.
    """
    db = AsyncMock()

    # db.get(SubscriptionPlan, id) → plan
    db.get = AsyncMock(return_value=plan)

    # db.execute(select(Tenant.player_subdomain, Tenant.staff_subdomain).where(...))
    # → .all() returning row tuples
    execute_result = MagicMock()
    if subdomain_exists:
        # Match the requested player_subdomain ("padelkings"); leaves the staff
        # value distinct so cross-column hits one column only.
        execute_result.all.return_value = [("padelkings", "padelkings-other-staff")]
    else:
        execute_result.all.return_value = []
    execute_result.scalar_one_or_none.return_value = (
        SimpleNamespace(id=uuid.uuid4()) if subdomain_exists else None
    )
    db.execute = AsyncMock(return_value=execute_result)

    # db.flush() is a no-op; we set .id on ORM objects manually via add side-effect
    db.flush = AsyncMock()

    # Assign UUIDs when objects are added
    added = []

    def _add(obj):
        if not hasattr(obj, "id") or obj.id is None:
            object.__setattr__(obj, "id", uuid.uuid4())
        added.append(obj)

    db.add = MagicMock(side_effect=_add)
    db.add_all = MagicMock(side_effect=lambda objs: [_add(o) for o in objs])
    db._added = added
    return db


# ---------------------------------------------------------------------------
# _require_platform_key
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_platform_key_valid():
    with patch("app.api.v1.endpoints.admin.get_settings") as mock_settings:
        mock_settings.return_value.PLATFORM_API_KEY = "supersecret"
        # Should not raise
        await _require_platform_key(x_platform_key="supersecret")


@pytest.mark.asyncio
async def test_platform_key_invalid():
    with patch("app.api.v1.endpoints.admin.get_settings") as mock_settings:
        mock_settings.return_value.PLATFORM_API_KEY = "supersecret"
        with pytest.raises(HTTPException) as exc_info:
            await _require_platform_key(x_platform_key="wrongkey")
        assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_onboard_creates_tenant_single_club_owner():
    db = _make_db()
    body = _valid_request()

    with patch("app.api.v1.endpoints.admin.get_password_hash", return_value="hashed"):
        response = await onboard_tenant(body, db)

    assert response.tenant_id is not None
    assert len(response.club_ids) == 1
    assert response.owner_id is not None


@pytest.mark.asyncio
async def test_onboard_creates_multiple_clubs():
    db = _make_db(plan=PLAN_UNLIMITED)
    body = _valid_request(
        clubs=[
            ClubCreate(name="Club A", currency="GBP"),
            ClubCreate(name="Club B", currency="EUR", address="Madrid"),
            ClubCreate(name="Club C", currency="USD"),
        ]
    )

    with patch("app.api.v1.endpoints.admin.get_password_hash", return_value="hashed"):
        response = await onboard_tenant(body, db)

    assert len(response.club_ids) == 3


# ---------------------------------------------------------------------------
# Validation errors
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_onboard_plan_not_found():
    db = _make_db()
    db.get = AsyncMock(return_value=None)  # plan missing

    with pytest.raises(HTTPException) as exc_info:
        await onboard_tenant(_valid_request(), db)
    assert exc_info.value.status_code == 422
    assert "plan_id" in exc_info.value.detail


@pytest.mark.asyncio
async def test_onboard_exceeds_plan_club_limit():
    limited_plan = SimpleNamespace(id=PLAN_ID, name="starter", max_clubs=1, max_courts_per_club=4)
    db = _make_db(plan=limited_plan)
    body = _valid_request(
        clubs=[
            ClubCreate(name="Club 1"),
            ClubCreate(name="Club 2"),
        ]
    )

    with pytest.raises(HTTPException) as exc_info:
        await onboard_tenant(body, db)
    assert exc_info.value.status_code == 422
    errors = exc_info.value.detail["errors"]
    assert any("at most 1 club" in e["error"] for e in errors)


@pytest.mark.asyncio
async def test_onboard_duplicate_club_names_aggregated():
    db = _make_db(plan=PLAN_UNLIMITED)
    body = _valid_request(
        clubs=[
            ClubCreate(name="Club A"),
            ClubCreate(name="club a"),  # case-insensitive duplicate
            ClubCreate(name="Club B"),
        ]
    )

    with pytest.raises(HTTPException) as exc_info:
        await onboard_tenant(body, db)
    assert exc_info.value.status_code == 422
    errors = exc_info.value.detail["errors"]
    assert any("duplicate club name" in e["error"] for e in errors)


@pytest.mark.asyncio
async def test_onboard_aggregates_multiple_problems():
    """Plan-cap exceeded + duplicate names + subdomain conflict all reported together."""
    limited_plan = SimpleNamespace(id=PLAN_ID, name="starter", max_clubs=1, max_courts_per_club=4)
    db = _make_db(plan=limited_plan, subdomain_exists=True)
    body = _valid_request(
        clubs=[
            ClubCreate(name="Club A"),
            ClubCreate(name="Club A"),
        ]
    )

    with pytest.raises(HTTPException) as exc_info:
        await onboard_tenant(body, db)
    assert exc_info.value.status_code == 422
    errors = exc_info.value.detail["errors"]
    fields = {e["field"] for e in errors}
    assert "clubs" in fields
    assert "player_subdomain" in fields


@pytest.mark.asyncio
async def test_onboard_subdomain_conflict():
    db = _make_db(subdomain_exists=True)

    with pytest.raises(HTTPException) as exc_info:
        await onboard_tenant(_valid_request(), db)
    # Sole problem → 409 with a plain string detail
    assert exc_info.value.status_code == 409
    assert "padelkings" in exc_info.value.detail


@pytest.mark.asyncio
async def test_onboard_unlimited_plan_accepts_many_clubs():
    """max_clubs == -1 means unlimited."""
    db = _make_db(plan=PLAN_UNLIMITED)
    body = _valid_request(
        clubs=[ClubCreate(name=f"Club {i}") for i in range(10)]
    )

    with patch("app.api.v1.endpoints.admin.get_password_hash", return_value="hashed"):
        response = await onboard_tenant(body, db)

    assert len(response.club_ids) == 10


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------


def test_subdomain_normalises_uppercase():
    """Uppercase input is silently lowercased (DNS is case-insensitive)."""
    req = TenantOnboardRequest(
        name="X",
        trading_name="X",
        player_subdomain="UpperCase",
        staff_subdomain="UpperCase-Staff",
        plan_id=PLAN_ID,
        clubs=[ClubCreate(name="X")],
        owner=OwnerCreate(email="a@b.com", full_name="A", password="p"),
    )
    assert req.player_subdomain == "uppercase"
    assert req.staff_subdomain == "uppercase-staff"


def test_rejects_empty_clubs():
    with pytest.raises(Exception):
        TenantOnboardRequest(
            name="X",
            trading_name="X",
            player_subdomain="valid",
            staff_subdomain="valid-staff",
            plan_id=PLAN_ID,
            clubs=[],
            owner=OwnerCreate(email="a@b.com", full_name="A", password="p"),
        )


def test_subdomain_allows_hyphens():
    req = TenantOnboardRequest(
        name="X",
        trading_name="X",
        player_subdomain="my-club-name",
        staff_subdomain="my-club-staff",
        plan_id=PLAN_ID,
        clubs=[ClubCreate(name="X")],
        owner=OwnerCreate(email="a@b.com", full_name="A", password="p"),
    )
    assert req.player_subdomain == "my-club-name"
    assert req.staff_subdomain == "my-club-staff"


def test_rejects_player_subdomain_equal_to_staff_subdomain():
    with pytest.raises(Exception):
        TenantOnboardRequest(
            name="X",
            trading_name="X",
            player_subdomain="same",
            staff_subdomain="same",
            plan_id=PLAN_ID,
            clubs=[ClubCreate(name="X")],
            owner=OwnerCreate(email="a@b.com", full_name="A", password="p"),
        )
