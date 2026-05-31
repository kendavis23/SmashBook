"""
Court-utilisation analytics endpoints (Sprint 7 / G7).

All routes read ``court_utilisation_snapshots`` only — never live ``bookings`` —
off the read replica, and are scoped to the caller's tenant. The snapshot table
is populated by ``app/analytics/workers/snapshot_court_utilisation.py``.

Final paths: ``/api/v1/analytics/utilisation/...``

Aggregation note: percentages are always recomputed as ``SUM(booked)/SUM(total)``
over the grouped rows, never averaged from per-row percentages — averaging
percentages across windows of different sizes is wrong (Simpson's paradox).
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Numeric, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas.utilisation import (
    ClubCourtsUtilisation,
    ClubDailyUtilisation,
    ClubUtilisationHeatmap,
    CourtUtilisationSummary,
    DailyUtilisationPoint,
    HeatmapCell,
)
from app.api.v1.dependencies.auth import require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.db.models.analytics import CourtUtilisationSnapshot
from app.db.models.club import Club
from app.db.models.court import Court
from app.db.models.tenant import Tenant
from app.db.session import get_read_db

router = APIRouter(prefix="/utilisation", tags=["analytics-utilisation"])

_MAX_RANGE_DAYS = 366
_DEFAULT_RANGE_DAYS = 30


def _pct(booked, total):
    """SUM(booked)/SUM(total)*100 as a SQL expression, 0 when total is 0."""
    return func.coalesce(
        cast(func.sum(booked), Numeric) * 100 / func.nullif(func.sum(total), 0),
        0,
    )


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


@router.get("/clubs/{club_id}/daily", response_model=ClubDailyUtilisation)
async def club_daily_utilisation(
    club_id: uuid.UUID,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Daily utilisation for a club, summed across its courts (one point per day)."""
    start, end = _resolve_range(date_from, date_to)
    await _load_club(db, club_id, tenant)

    snap = CourtUtilisationSnapshot
    rows = (
        await db.execute(
            select(
                snap.snapshot_date,
                func.sum(snap.total_slots),
                func.sum(snap.booked_slots),
                func.sum(snap.revenue_actual),
                func.sum(snap.revenue_potential),
                _pct(snap.booked_slots, snap.total_slots),
            )
            .where(
                snap.club_id == club_id,
                snap.hour_of_day.is_(None),  # daily-rollup rows only
                snap.snapshot_date >= start,
                snap.snapshot_date <= end,
            )
            .group_by(snap.snapshot_date)
            .order_by(snap.snapshot_date)
        )
    ).all()

    points = [
        DailyUtilisationPoint(
            snapshot_date=r[0],
            total_slots=r[1] or 0,
            booked_slots=r[2] or 0,
            revenue_actual=r[3] or 0,
            revenue_potential=r[4] or 0,
            utilisation_pct=r[5] or 0,
        )
        for r in rows
    ]
    return ClubDailyUtilisation(
        club_id=club_id, date_from=start, date_to=end, points=points
    )


@router.get("/clubs/{club_id}/courts", response_model=ClubCourtsUtilisation)
async def club_courts_utilisation(
    club_id: uuid.UUID,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Per-court utilisation rolled up over the date range. Surfaces the
    busiest and most underused courts at a glance."""
    start, end = _resolve_range(date_from, date_to)
    await _load_club(db, club_id, tenant)

    snap = CourtUtilisationSnapshot
    rows = (
        await db.execute(
            select(
                Court.id,
                Court.name,
                func.sum(snap.total_slots),
                func.sum(snap.booked_slots),
                func.sum(snap.revenue_actual),
                func.sum(snap.revenue_potential),
                _pct(snap.booked_slots, snap.total_slots),
            )
            .join(snap, snap.court_id == Court.id)
            .where(
                snap.club_id == club_id,
                snap.hour_of_day.is_(None),
                snap.snapshot_date >= start,
                snap.snapshot_date <= end,
            )
            .group_by(Court.id, Court.name)
            .order_by(func.sum(snap.booked_slots).desc())
        )
    ).all()

    courts = [
        CourtUtilisationSummary(
            court_id=r[0],
            court_name=r[1],
            total_slots=r[2] or 0,
            booked_slots=r[3] or 0,
            revenue_actual=r[4] or 0,
            revenue_potential=r[5] or 0,
            utilisation_pct=r[6] or 0,
        )
        for r in rows
    ]
    return ClubCourtsUtilisation(
        club_id=club_id, date_from=start, date_to=end, courts=courts
    )


@router.get("/clubs/{club_id}/heatmap", response_model=ClubUtilisationHeatmap)
async def club_utilisation_heatmap(
    club_id: uuid.UUID,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    _staff=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Average utilisation by (day-of-week, hour-of-day) — the classic
    booking heatmap that reveals peak and dead hours."""
    start, end = _resolve_range(date_from, date_to)
    await _load_club(db, club_id, tenant)

    snap = CourtUtilisationSnapshot
    rows = (
        await db.execute(
            select(
                snap.day_of_week,
                snap.hour_of_day,
                func.sum(snap.total_slots),
                func.sum(snap.booked_slots),
                _pct(snap.booked_slots, snap.total_slots),
            )
            .where(
                snap.club_id == club_id,
                snap.hour_of_day.is_not(None),  # hourly rows only
                snap.snapshot_date >= start,
                snap.snapshot_date <= end,
            )
            .group_by(snap.day_of_week, snap.hour_of_day)
            .order_by(snap.day_of_week, snap.hour_of_day)
        )
    ).all()

    cells = [
        HeatmapCell(
            day_of_week=r[0],
            hour_of_day=r[1],
            total_slots=r[2] or 0,
            booked_slots=r[3] or 0,
            avg_utilisation_pct=r[4] or 0,
        )
        for r in rows
    ]
    return ClubUtilisationHeatmap(
        club_id=club_id, date_from=start, date_to=end, cells=cells
    )
