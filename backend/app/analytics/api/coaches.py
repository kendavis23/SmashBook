"""Coach-popularity analytics endpoints (Sprint 7 / G7).

Reads the ``mv_coach_popularity`` materialized view only (never live ``bookings``
/ ``payments``) off the read replica, scoped to the caller's tenant. The view is
refreshed nightly by ``app/analytics/workers/refresh_views.py``.

Final paths: ``/api/v1/analytics/coaches/...``

  * GET /clubs/{id}/popularity — coach leaderboard ranked by ?sort
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas.coach import CoachPopularityLeaderboard, CoachSort
from app.analytics.services.coach_popularity_service import CoachPopularityService
from app.api.v1.dependencies.auth import require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.club import Club
from app.db.models.tenant import Tenant
from app.db.session import get_read_db

router = APIRouter(prefix="/coaches", tags=["analytics-coaches"])


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


@router.get("/clubs/{club_id}/popularity", response_model=CoachPopularityLeaderboard)
async def club_coach_popularity(
    club_id: uuid.UUID,
    sort: CoachSort = Query(CoachSort.sessions),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Coaches ranked by lesson volume, reach, repeat business, or revenue.
    Each row carries ``return_rate`` (``repeat_players / distinct_players``)."""
    await _load_club(db, club_id, tenant)
    return await CoachPopularityService(db).leaderboard(club_id, sort, limit, offset)
