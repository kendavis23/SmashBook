"""
Unit tests for POST /api/v1/courts and PATCH /api/v1/courts/{court_id}.

The database session is mocked — no real Postgres needed.
"""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.courts import create_court, update_court
from app.db.models.court import Court, SurfaceType
from app.schemas.court import CourtCreate, CourtUpdate


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

PLAN_ID = uuid.uuid4()
TENANT_ID = uuid.uuid4()
CLUB_ID = uuid.uuid4()

PLAN_UNLIMITED = SimpleNamespace(id=PLAN_ID, name="pro", max_courts_per_club=-1)
PLAN_LIMITED = SimpleNamespace(id=PLAN_ID, name="starter", max_courts_per_club=4)

TENANT = SimpleNamespace(id=TENANT_ID, plan_id=PLAN_ID)
CURRENT_USER = SimpleNamespace(id=uuid.uuid4())

_CLUB = SimpleNamespace(id=CLUB_ID, tenant_id=TENANT_ID, name="Test Club")


def _make_create_db(plan=PLAN_UNLIMITED, club=_CLUB, current_court_count: int = 0):
    """Return a minimal AsyncSession mock for create_court."""
    db = AsyncMock()

    # db.get returns plan
    db.get = AsyncMock(return_value=plan)

    # First execute() call returns club lookup; second returns court count
    club_scalar = MagicMock()
    club_scalar.scalar_one_or_none.return_value = club

    count_scalar = MagicMock()
    count_scalar.scalar_one.return_value = current_court_count

    db.execute = AsyncMock(side_effect=[club_scalar, count_scalar])
    db.flush = AsyncMock()

    added = []

    def _add(obj):
        if not getattr(obj, "id", None):
            object.__setattr__(obj, "id", uuid.uuid4())
        added.append(obj)

    db.add = MagicMock(side_effect=_add)
    db._added = added
    return db


def _body(**kwargs) -> CourtCreate:
    defaults = dict(
        club_id=CLUB_ID,
        name="Court 1",
        surface_type=SurfaceType.indoor,
    )
    defaults.update(kwargs)
    return CourtCreate(**defaults)


def _make_update_db(court=None):
    """Return a db mock for update_court; execute() returns the given court or None."""
    db = AsyncMock()
    scalar = MagicMock()
    scalar.scalar_one_or_none.return_value = court
    db.execute = AsyncMock(return_value=scalar)
    db.flush = AsyncMock()
    return db


def _make_court(**kwargs):
    defaults = dict(
        id=uuid.uuid4(),
        club_id=CLUB_ID,
        name="Court 1",
        surface_type=SurfaceType.indoor,
        has_lighting=False,
        lighting_surcharge=None,
        is_active=True,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


# ---------------------------------------------------------------------------
# POST /courts — create_court happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_court_returns_court_with_correct_name():
    db = _make_create_db()
    result = await create_court(_body(name="Court A"), CURRENT_USER, TENANT, db)
    assert result.name == "Court A"


@pytest.mark.asyncio
async def test_create_court_sets_club_id():
    db = _make_create_db()
    result = await create_court(_body(), CURRENT_USER, TENANT, db)
    assert result.club_id == CLUB_ID


@pytest.mark.asyncio
async def test_create_court_sets_surface_type():
    db = _make_create_db()
    result = await create_court(_body(surface_type=SurfaceType.crystal), CURRENT_USER, TENANT, db)
    assert result.surface_type == SurfaceType.crystal


@pytest.mark.asyncio
async def test_create_court_defaults_has_lighting_to_false():
    db = _make_create_db()
    result = await create_court(_body(), CURRENT_USER, TENANT, db)
    assert result.has_lighting is False


@pytest.mark.asyncio
async def test_create_court_accepts_lighting_surcharge():
    from decimal import Decimal
    db = _make_create_db()
    result = await create_court(_body(has_lighting=True, lighting_surcharge=Decimal("5.00")), CURRENT_USER, TENANT, db)
    assert result.has_lighting is True
    assert result.lighting_surcharge == Decimal("5.00")


@pytest.mark.asyncio
async def test_create_court_defaults_is_active_to_true():
    db = _make_create_db()
    result = await create_court(_body(), CURRENT_USER, TENANT, db)
    assert result.is_active is True


@pytest.mark.asyncio
async def test_create_court_adds_court_to_session():
    db = _make_create_db()
    await create_court(_body(), CURRENT_USER, TENANT, db)
    assert len(db._added) == 1
    assert isinstance(db._added[0], Court)


@pytest.mark.asyncio
async def test_create_court_flushes():
    db = _make_create_db()
    await create_court(_body(), CURRENT_USER, TENANT, db)
    db.flush.assert_awaited_once()


# ---------------------------------------------------------------------------
# POST /courts — club not found / wrong tenant
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_court_raises_404_when_club_not_found():
    db = _make_create_db(club=None)
    with pytest.raises(HTTPException) as exc_info:
        await create_court(_body(), CURRENT_USER, TENANT, db)
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# POST /courts — plan limit enforcement
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_court_raises_403_at_plan_limit():
    db = _make_create_db(plan=PLAN_LIMITED, current_court_count=4)
    with pytest.raises(HTTPException) as exc_info:
        await create_court(_body(), CURRENT_USER, TENANT, db)
    assert exc_info.value.status_code == 403
    assert "starter" in exc_info.value.detail


@pytest.mark.asyncio
async def test_create_court_succeeds_one_below_plan_limit():
    db = _make_create_db(plan=PLAN_LIMITED, current_court_count=3)
    result = await create_court(_body(), CURRENT_USER, TENANT, db)
    assert result.name == "Court 1"


@pytest.mark.asyncio
async def test_create_court_unlimited_plan_always_succeeds():
    db = _make_create_db(plan=PLAN_UNLIMITED, current_court_count=999)
    result = await create_court(_body(), CURRENT_USER, TENANT, db)
    assert result.club_id == CLUB_ID


# ---------------------------------------------------------------------------
# PATCH /courts/{court_id} — update_court happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_court_renames_court():
    court = _make_court(name="Old Name")
    db = _make_update_db(court)
    result = await update_court(court.id, CourtUpdate(name="New Name"), CURRENT_USER, TENANT, db)
    assert result.name == "New Name"


@pytest.mark.asyncio
async def test_update_court_changes_surface_type():
    court = _make_court(surface_type=SurfaceType.indoor)
    db = _make_update_db(court)
    result = await update_court(court.id, CourtUpdate(surface_type=SurfaceType.outdoor), CURRENT_USER, TENANT, db)
    assert result.surface_type == SurfaceType.outdoor


@pytest.mark.asyncio
async def test_update_court_enables_lighting():
    court = _make_court(has_lighting=False)
    db = _make_update_db(court)
    result = await update_court(court.id, CourtUpdate(has_lighting=True), CURRENT_USER, TENANT, db)
    assert result.has_lighting is True


@pytest.mark.asyncio
async def test_update_court_deactivates_court():
    court = _make_court(is_active=True)
    db = _make_update_db(court)
    result = await update_court(court.id, CourtUpdate(is_active=False), CURRENT_USER, TENANT, db)
    assert result.is_active is False


@pytest.mark.asyncio
async def test_update_court_ignores_none_fields():
    court = _make_court(name="Keep Me", surface_type=SurfaceType.crystal)
    db = _make_update_db(court)
    result = await update_court(court.id, CourtUpdate(is_active=False), CURRENT_USER, TENANT, db)
    assert result.name == "Keep Me"
    assert result.surface_type == SurfaceType.crystal


@pytest.mark.asyncio
async def test_update_court_flushes_on_success():
    court = _make_court()
    db = _make_update_db(court)
    await update_court(court.id, CourtUpdate(name="X"), CURRENT_USER, TENANT, db)
    db.flush.assert_awaited_once()


# ---------------------------------------------------------------------------
# PATCH /courts/{court_id} — not found
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_court_raises_404_when_not_found():
    db = _make_update_db(court=None)
    with pytest.raises(HTTPException) as exc_info:
        await update_court(uuid.uuid4(), CourtUpdate(name="X"), CURRENT_USER, TENANT, db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_update_court_no_flush_on_404():
    db = _make_update_db(court=None)
    with pytest.raises(HTTPException):
        await update_court(uuid.uuid4(), CourtUpdate(name="X"), CURRENT_USER, TENANT, db)
    db.flush.assert_not_awaited()
