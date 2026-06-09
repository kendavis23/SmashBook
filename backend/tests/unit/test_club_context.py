"""
Unit tests for resolve_club_context() in app.api.v1.dependencies.club_context.

The DB session is mocked — no Postgres required. Each db.execute() call returns
a result object whose scalar_one_or_none() yields the next queued value:
  1st call → the club lookup
  2nd call → the staff-profile lookup (only for non-owner/admin callers)
"""
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.v1.dependencies.club_context import resolve_club_context
from app.db.models.staff import StaffRole
from app.db.models.user import TenantUserRole, User


def _result(value):
    r = MagicMock()
    r.scalar_one_or_none.return_value = value
    return r


def _mock_db(*scalar_values) -> AsyncMock:
    db = AsyncMock()
    db.execute.side_effect = [_result(v) for v in scalar_values]
    return db


def _make_user(role: TenantUserRole) -> MagicMock:
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.role = role
    return user


def _make_tenant() -> MagicMock:
    tenant = MagicMock()
    tenant.id = uuid.uuid4()
    return tenant


def _make_club() -> MagicMock:
    club = MagicMock()
    club.id = uuid.uuid4()
    return club


def _make_staff_profile(role: StaffRole) -> MagicMock:
    sp = MagicMock()
    sp.role = role
    return sp


@pytest.mark.asyncio
async def test_owner_is_tenant_wide_no_staff_lookup():
    db = _mock_db(_make_club())  # only the club lookup happens
    user = _make_user(TenantUserRole.owner)
    ctx = await resolve_club_context(db, user, _make_tenant(), uuid.uuid4())
    assert ctx.effective_role == "owner"
    assert db.execute.await_count == 1  # never queried staff_profiles


@pytest.mark.asyncio
async def test_admin_is_tenant_wide():
    db = _mock_db(_make_club())
    user = _make_user(TenantUserRole.admin)
    ctx = await resolve_club_context(db, user, _make_tenant(), uuid.uuid4())
    assert ctx.effective_role == "admin"
    assert db.execute.await_count == 1


@pytest.mark.asyncio
async def test_staff_role_resolved_per_club():
    db = _mock_db(_make_club(), _make_staff_profile(StaffRole.trainer))
    user = _make_user(TenantUserRole.player)  # tenant role is irrelevant here
    ctx = await resolve_club_context(db, user, _make_tenant(), uuid.uuid4())
    assert ctx.effective_role == "trainer"
    assert db.execute.await_count == 2


@pytest.mark.asyncio
async def test_front_desk_role_resolved_per_club():
    db = _mock_db(_make_club(), _make_staff_profile(StaffRole.front_desk))
    user = _make_user(TenantUserRole.staff)
    ctx = await resolve_club_context(db, user, _make_tenant(), uuid.uuid4())
    assert ctx.effective_role == "front_desk"


@pytest.mark.asyncio
async def test_player_without_staff_profile_falls_back_to_player():
    db = _mock_db(_make_club(), None)  # no staff profile
    user = _make_user(TenantUserRole.player)
    ctx = await resolve_club_context(db, user, _make_tenant(), uuid.uuid4())
    assert ctx.effective_role == "player"


@pytest.mark.asyncio
async def test_non_staff_non_player_role_has_no_standing():
    # A 'trainer' tenant-role user with no staff profile at this club has no
    # effective role here (not owner/admin → not tenant-wide; not player/viewer).
    db = _mock_db(_make_club(), None)
    user = _make_user(TenantUserRole.trainer)
    ctx = await resolve_club_context(db, user, _make_tenant(), uuid.uuid4())
    assert ctx.effective_role is None


@pytest.mark.asyncio
async def test_cross_tenant_club_raises_404():
    db = _mock_db(None)  # club lookup scoped to tenant returns nothing
    user = _make_user(TenantUserRole.owner)
    with pytest.raises(HTTPException) as exc:
        await resolve_club_context(db, user, _make_tenant(), uuid.uuid4())
    assert exc.value.status_code == 404
