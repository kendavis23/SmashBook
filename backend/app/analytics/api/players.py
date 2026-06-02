"""Player-value analytics endpoints (Sprint 7 / G7 — workstream B).

All routes read the ``mv_player_value`` materialized view only (never live
``bookings`` / ``payments`` / ``membership_subscriptions``) off the read replica,
scoped to the caller's tenant. The view is refreshed nightly by
``app/analytics/workers/refresh_views.py``.

Final paths: ``/api/v1/analytics/players/...``

Three reports off one view:
  * GET /clubs/{id}/value             — per-player LTV leaderboard (?members_only)
  * GET /clubs/{id}/most-active       — most-active players (?window_days=30|90)
  * GET /clubs/{id}/inactive-members  — paid members idle >= ?inactive_days
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas.player import (
    InactiveMembersReport,
    PlayerActivityLeaderboard,
    PlayerSort,
    PlayerValueLeaderboard,
)
from app.analytics.services.player_value_service import PlayerValueService
from app.api.v1.dependencies.auth import require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.club import Club
from app.db.models.tenant import Tenant
from app.db.session import get_read_db

router = APIRouter(prefix="/players", tags=["analytics-players"])


async def _load_club(db: AsyncSession, club_id: uuid.UUID, tenant: Tenant) -> Club:
    """Load a club, enforcing tenant isolation. 404 if it isn't this tenant's."""
    club = (
        await db.execute(
            select(Club).where(Club.id == club_id, Club.tenant_id == tenant.id)
        )
    ).scalar_one_or_none()
    if club is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )
    return club


@router.get("/clubs/{club_id}/value", response_model=PlayerValueLeaderboard)
async def club_player_value(
    club_id: uuid.UUID,
    members_only: bool = Query(False),
    sort: PlayerSort = Query(PlayerSort.lifetime_spend),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Per-player lifetime value (net realised spend), highest first.
    ``?members_only=true`` restricts to paid members (the per-member LTV view)."""
    await _load_club(db, club_id, tenant)
    return await PlayerValueService(db).leaderboard(
        club_id, members_only, sort, limit, offset
    )


@router.get("/clubs/{club_id}/most-active", response_model=PlayerActivityLeaderboard)
async def club_most_active_players(
    club_id: uuid.UUID,
    window_days: int = Query(30),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Most-active players, ranked by on-court bookings in the window."""
    if window_days not in (30, 90):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="window_days must be 30 or 90",
        )
    await _load_club(db, club_id, tenant)
    return await PlayerValueService(db).most_active(
        club_id, window_days, limit, offset
    )


@router.get("/clubs/{club_id}/inactive-members", response_model=InactiveMembersReport)
async def club_inactive_members(
    club_id: uuid.UUID,
    inactive_days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Paid members who have not played within ``inactive_days`` (including those
    who never played) — the non-AI churn-risk list. Longest-gone first."""
    await _load_club(db, club_id, tenant)
    return await PlayerValueService(db).inactive_members(
        club_id, inactive_days, limit, offset
    )
