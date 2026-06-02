"""Club-level player-flow analytics service (Sprint 7 / G7 — workstream A).

Serves active-player and new-member-signup metrics off two materialized views
read from the **read replica**:

  * ``mv_club_active_player_day`` — presence grain ``(club_id, activity_date,
    user_id)``. The active KPI counts distinct players over a trailing window;
    the active timeseries counts distinct players per calendar bucket. Both are
    ``COUNT(DISTINCT user_id)`` — never summed across days (a player active on
    several days is one active player).
  * ``mv_club_signups_day`` — flow grain ``(club_id, signup_date, signups)``.
    Additive: the service ``SUM``s it over the requested range/granularity.

Tenant isolation: the views carry ``club_id`` but not ``tenant_id`` — the caller
passes a ``club_id`` it has already authorised.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta

from sqlalchemy import Date, asc, cast, column, func, select, table
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas.player_flow import (
    ActivePlayersKpi,
    ActivePlayersPoint,
    ActivePlayersTimeseries,
    FlowGranularity,
    SignupsPoint,
    SignupsTimeseries,
)

_ACTIVE_COLUMNS = ("club_id", "activity_date", "user_id")
_SIGNUPS_COLUMNS = ("club_id", "signup_date", "signups")


def _active_mv():
    return table("mv_club_active_player_day", *(column(c) for c in _ACTIVE_COLUMNS))


def _signups_mv():
    return table("mv_club_signups_day", *(column(c) for c in _SIGNUPS_COLUMNS))


class PlayerFlowService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def active_kpi(
        self, club_id: uuid.UUID, as_of: date, window_days: int
    ) -> ActivePlayersKpi:
        """Distinct players on court in the trailing ``window_days`` ending
        ``as_of`` (inclusive of ``as_of``, exclusive of the day before the
        window opens)."""
        mv = _active_mv()
        start = as_of - timedelta(days=window_days)
        count = (
            await self.db.execute(
                select(func.count(func.distinct(mv.c.user_id))).where(
                    mv.c.club_id == club_id,
                    mv.c.activity_date > start,
                    mv.c.activity_date <= as_of,
                )
            )
        ).scalar_one()
        return ActivePlayersKpi(
            club_id=club_id,
            as_of=as_of,
            window_days=window_days,
            active_players=int(count or 0),
        )

    async def active_timeseries(
        self,
        club_id: uuid.UUID,
        granularity: FlowGranularity,
        date_from: date,
        date_to: date,
    ) -> ActivePlayersTimeseries:
        """Distinct active players per calendar bucket (WAP/MAP)."""
        mv = _active_mv()
        bucket = cast(func.date_trunc(granularity.value, mv.c.activity_date), Date)
        rows = (
            await self.db.execute(
                select(bucket.label("period_start"), func.count(func.distinct(mv.c.user_id)))
                .where(
                    mv.c.club_id == club_id,
                    mv.c.activity_date >= date_from,
                    mv.c.activity_date <= date_to,
                )
                .group_by(bucket)
                .order_by(asc(bucket))
            )
        ).all()
        return ActivePlayersTimeseries(
            club_id=club_id,
            granularity=granularity,
            date_from=date_from,
            date_to=date_to,
            points=[
                ActivePlayersPoint(period_start=r[0], active_players=int(r[1] or 0))
                for r in rows
            ],
        )

    async def signups_timeseries(
        self,
        club_id: uuid.UUID,
        granularity: FlowGranularity,
        date_from: date,
        date_to: date,
    ) -> SignupsTimeseries:
        """New paid-member sign-ups per bucket, plus the range total."""
        mv = _signups_mv()
        bucket = cast(func.date_trunc(granularity.value, mv.c.signup_date), Date)
        rows = (
            await self.db.execute(
                select(bucket.label("period_start"), func.sum(mv.c.signups))
                .where(
                    mv.c.club_id == club_id,
                    mv.c.signup_date >= date_from,
                    mv.c.signup_date <= date_to,
                )
                .group_by(bucket)
                .order_by(asc(bucket))
            )
        ).all()
        points = [
            SignupsPoint(period_start=r[0], signups=int(r[1] or 0)) for r in rows
        ]
        return SignupsTimeseries(
            club_id=club_id,
            granularity=granularity,
            date_from=date_from,
            date_to=date_to,
            total_signups=sum(p.signups for p in points),
            points=points,
        )
