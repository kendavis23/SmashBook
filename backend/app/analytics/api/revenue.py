"""
Revenue ("Financials by club") analytics endpoints (Sprint 7 / G7).

All routes read the revenue materialized views only (never live ``payments`` /
``bookings``) off the read replica, scoped to the caller's tenant. The views are
refreshed by ``app/analytics/workers/refresh_views.py``.

Final paths: ``/api/v1/analytics/revenue/...``

``?basis=service|cash`` selects which view answers the query: ``service`` buckets
by booking start (accrual), ``cash`` by payment time. Totals are *transactional
revenue* — membership MRR is excluded (see REPORT_CATALOG.md).
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas.revenue import (
    ClubRevenueByType,
    ClubRevenueSummary,
    ClubRevenueTimeseries,
    Granularity,
    RevenueBasis,
    TenantRevenueComparison,
)
from app.analytics.services.revenue_service import RevenueService
from app.api.v1.dependencies.auth import require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.club import Club
from app.db.models.tenant import Tenant
from app.db.session import get_read_db

router = APIRouter(prefix="/revenue", tags=["analytics-revenue"])

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


@router.get("/clubs/{club_id}/timeseries", response_model=ClubRevenueTimeseries)
async def club_revenue_timeseries(
    club_id: uuid.UUID,
    granularity: Granularity = Query(Granularity.day),
    basis: RevenueBasis = Query(RevenueBasis.service),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Net/gross/refund revenue over time for a club, bucketed by granularity."""
    start, end = _resolve_range(date_from, date_to)
    await _load_club(db, club_id, tenant)
    return await RevenueService(db).timeseries(
        club_id, basis, granularity, start, end
    )


@router.get("/clubs/{club_id}/by-type", response_model=ClubRevenueByType)
async def club_revenue_by_type(
    club_id: uuid.UUID,
    basis: RevenueBasis = Query(RevenueBasis.service),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Revenue split across the six revenue types over the date range."""
    start, end = _resolve_range(date_from, date_to)
    await _load_club(db, club_id, tenant)
    return await RevenueService(db).by_type(club_id, basis, start, end)


@router.get("/clubs/{club_id}/summary", response_model=ClubRevenueSummary)
async def club_revenue_summary(
    club_id: uuid.UUID,
    basis: RevenueBasis = Query(RevenueBasis.service),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """KPI block for a club: gross / refunds / net / per-type / avg-per-transaction."""
    start, end = _resolve_range(date_from, date_to)
    await _load_club(db, club_id, tenant)
    return await RevenueService(db).summary(club_id, basis, start, end)


@router.get("/clubs", response_model=TenantRevenueComparison)
async def tenant_revenue_comparison(
    basis: RevenueBasis = Query(RevenueBasis.service),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Tenant-wide per-club comparison — the multi-site ROI view. Clubs with no
    revenue in the window still appear with zeroed totals."""
    start, end = _resolve_range(date_from, date_to)
    return await RevenueService(db).cross_club(tenant.id, basis, start, end)
