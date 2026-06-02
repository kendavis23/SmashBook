"""Player-value analytics endpoints (Sprint 7 / G7 — workstream B).

All routes read the ``mv_player_value`` materialized view only (never live
``bookings`` / ``payments`` / ``membership_subscriptions``) off the read replica,
scoped to the caller's tenant. The view is refreshed nightly by
``app/analytics/workers/refresh_views.py``.

Final paths: ``/api/v1/analytics/players/...``

Per-player reports (workstream B) off ``mv_player_value``:
  * GET /clubs/{id}/value             — per-player LTV leaderboard (?members_only)
  * GET /clubs/{id}/most-active       — most-active players (?window_days=30|90)
  * GET /clubs/{id}/inactive-members  — paid members idle >= ?inactive_days

Club-level flow reports (workstream A) off ``mv_club_active_player_day`` /
``mv_club_signups_day``:
  * GET /clubs/{id}/active            — active-players KPI (trailing window)
  * GET /clubs/{id}/active/timeseries — active players per calendar bucket
  * GET /clubs/{id}/signups           — new paid-member sign-ups over time
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas.player import (
    GroupDimension,
    GroupValueReport,
    InactiveMembersReport,
    PlayerActivityLeaderboard,
    PlayerSort,
    PlayerValueLeaderboard,
)
from app.analytics.schemas.player_flow import (
    ActivePlayersKpi,
    ActivePlayersTimeseries,
    FlowGranularity,
    SignupsTimeseries,
)
from app.analytics.services.player_flow_service import PlayerFlowService
from app.analytics.services.player_value_service import PlayerValueService
from app.api.v1.dependencies.auth import require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.club import Club
from app.db.models.tenant import Tenant
from app.db.session import get_read_db

router = APIRouter(prefix="/players", tags=["analytics-players"])

_MAX_RANGE_DAYS = 366
_DEFAULT_RANGE_DAYS = 30


def _resolve_range(date_from: date | None, date_to: date | None) -> tuple[date, date]:
    today = datetime.now(timezone.utc).date()
    end = date_to or today
    start = date_from or (end - timedelta(days=_DEFAULT_RANGE_DAYS))
    if start > end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="date_from must be on or before date_to",
        )
    if (end - start).days > _MAX_RANGE_DAYS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Date range exceeds the {_MAX_RANGE_DAYS}-day maximum",
        )
    return start, end


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


@router.get("/clubs/{club_id}/value/by-group", response_model=GroupValueReport)
async def club_player_value_by_group(
    club_id: uuid.UUID,
    dimension: GroupDimension = Query(GroupDimension.membership_tier),
    inactive_days: int = Query(30, ge=1, le=365),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Lifetime value rolled up by a grouping dimension — "financial results per
    group of members". ``inactive_days`` only applies to the ``activity_status``
    dimension (active/lapsed split)."""
    club = await _load_club(db, club_id, tenant)
    return await PlayerValueService(db).group_value(
        club_id, dimension, inactive_days, club.currency
    )


# ---------------------------------------------------------------------------
# Workstream A — club-level player-flow metrics
# ---------------------------------------------------------------------------


@router.get("/clubs/{club_id}/active", response_model=ActivePlayersKpi)
async def club_active_players(
    club_id: uuid.UUID,
    window_days: int = Query(30, ge=1, le=365),
    as_of: Optional[date] = Query(None),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Distinct players on court in the trailing ``window_days`` ending ``as_of``
    (default today) — the "active players over the last N days" headline."""
    as_of = as_of or datetime.now(timezone.utc).date()
    await _load_club(db, club_id, tenant)
    return await PlayerFlowService(db).active_kpi(club_id, as_of, window_days)


@router.get("/clubs/{club_id}/active/timeseries", response_model=ActivePlayersTimeseries)
async def club_active_players_timeseries(
    club_id: uuid.UUID,
    granularity: FlowGranularity = Query(FlowGranularity.week),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Distinct active players per calendar bucket (WAP/MAP). Buckets are
    calendar periods, not a trailing window."""
    start, end = _resolve_range(date_from, date_to)
    await _load_club(db, club_id, tenant)
    return await PlayerFlowService(db).active_timeseries(
        club_id, granularity, start, end
    )


@router.get("/clubs/{club_id}/signups", response_model=SignupsTimeseries)
async def club_member_signups(
    club_id: uuid.UUID,
    granularity: FlowGranularity = Query(FlowGranularity.month),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """New paid-member sign-ups over time, plus the range total."""
    start, end = _resolve_range(date_from, date_to)
    await _load_club(db, club_id, tenant)
    return await PlayerFlowService(db).signups_timeseries(
        club_id, granularity, start, end
    )
