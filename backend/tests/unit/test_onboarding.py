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
    CourtCreate,
    OwnerCreate,
    TenantOnboardRequest,
)
from app.db.models.court import SurfaceType


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

PLAN_ID = uuid.uuid4()
PLAN = SimpleNamespace(id=PLAN_ID, name="starter", max_clubs=1, max_courts_per_club=4)
PLAN_UNLIMITED = SimpleNamespace(id=PLAN_ID, name="pro", max_clubs=-1, max_courts_per_club=-1)


def _valid_request(**overrides) -> TenantOnboardRequest:
    defaults = dict(
        name="Padel Kings",
        subdomain="padelkings",
        plan_id=PLAN_ID,
        club=ClubCreate(name="Padel Kings Club", currency="GBP"),
        courts=[CourtCreate(name="Court 1", surface_type=SurfaceType.indoor)],
        owner=OwnerCreate(email="owner@padelkings.com", full_name="King Owner", password="s3cret"),
    )
    defaults.update(overrides)
    return TenantOnboardRequest(**defaults)


def _make_db(plan=PLAN, subdomain_exists=False):
    """Return a minimal AsyncSession mock."""
    db = AsyncMock()

    # db.get(SubscriptionPlan, id) → plan
    db.get = AsyncMock(return_value=plan)

    # db.execute(select(Tenant)...) → scalar_one_or_none
    execute_result = MagicMock()
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
async def test_onboard_creates_tenant_club_courts_owner():
    db = _make_db()
    body = _valid_request()

    with patch("app.api.v1.endpoints.admin.get_password_hash", return_value="hashed"):
        response = await onboard_tenant(body, db)

    assert response.tenant_id is not None
    assert response.club_id is not None
    assert len(response.courts) == 1
    assert response.courts[0].name == "Court 1"
    assert response.courts[0].surface_type == SurfaceType.indoor


@pytest.mark.asyncio
async def test_onboard_creates_multiple_courts():
    db = _make_db(plan=PLAN_UNLIMITED)
    body = _valid_request(
        courts=[
            CourtCreate(name="Court A", surface_type=SurfaceType.indoor),
            CourtCreate(name="Court B", surface_type=SurfaceType.outdoor, has_lighting=True),
        ]
    )

    with patch("app.api.v1.endpoints.admin.get_password_hash", return_value="hashed"):
        response = await onboard_tenant(body, db)

    assert len(response.courts) == 2


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
async def test_onboard_exceeds_plan_court_limit():
    limited_plan = SimpleNamespace(id=PLAN_ID, name="starter", max_clubs=1, max_courts_per_club=1)
    db = _make_db(plan=limited_plan)
    body = _valid_request(
        courts=[
            CourtCreate(name="Court 1", surface_type=SurfaceType.indoor),
            CourtCreate(name="Court 2", surface_type=SurfaceType.indoor),
        ]
    )

    with pytest.raises(HTTPException) as exc_info:
        await onboard_tenant(body, db)
    assert exc_info.value.status_code == 422
    assert "1" in exc_info.value.detail  # mentions the limit


@pytest.mark.asyncio
async def test_onboard_subdomain_conflict():
    db = _make_db(subdomain_exists=True)

    with pytest.raises(HTTPException) as exc_info:
        await onboard_tenant(_valid_request(), db)
    assert exc_info.value.status_code == 409
    assert "padelkings" in exc_info.value.detail


@pytest.mark.asyncio
async def test_onboard_unlimited_plan_ignores_court_limit():
    """max_courts_per_club == -1 means unlimited."""
    db = _make_db(plan=PLAN_UNLIMITED)
    body = _valid_request(
        courts=[CourtCreate(name=f"Court {i}", surface_type=SurfaceType.indoor) for i in range(10)]
    )

    with patch("app.api.v1.endpoints.admin.get_password_hash", return_value="hashed"):
        response = await onboard_tenant(body, db)

    assert len(response.courts) == 10


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------


def test_subdomain_normalises_uppercase():
    """Uppercase input is silently lowercased (DNS is case-insensitive)."""
    req = TenantOnboardRequest(
        name="X",
        subdomain="UpperCase",
        plan_id=PLAN_ID,
        club=ClubCreate(name="X"),
        courts=[CourtCreate(name="C1", surface_type=SurfaceType.indoor)],
        owner=OwnerCreate(email="a@b.com", full_name="A", password="p"),
    )
    assert req.subdomain == "uppercase"


def test_subdomain_rejects_empty_courts():
    with pytest.raises(Exception):
        TenantOnboardRequest(
            name="X",
            subdomain="valid",
            plan_id=PLAN_ID,
            club=ClubCreate(name="X"),
            courts=[],
            owner=OwnerCreate(email="a@b.com", full_name="A", password="p"),
        )


def test_subdomain_allows_hyphens():
    req = TenantOnboardRequest(
        name="X",
        subdomain="my-club-name",
        plan_id=PLAN_ID,
        club=ClubCreate(name="X"),
        courts=[CourtCreate(name="C1", surface_type=SurfaceType.indoor)],
        owner=OwnerCreate(email="a@b.com", full_name="A", password="p"),
    )
    assert req.subdomain == "my-club-name"
