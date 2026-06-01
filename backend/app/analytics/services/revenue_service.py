"""
Revenue-by-club analytics service (Sprint 7 / G7 — "Financials by club").

Reads the two revenue materialized views off the **read replica** and rolls
them up for the API. The views already collapse ``payments`` ⋈ ``bookings`` ∪
embedded equipment into one row per (club, day, revenue_type, currency); this
service only ever SUMs over that pre-aggregated grain — it never averages a
per-row figure and never touches live operational tables.

Two parallel views, selected by ``basis``:
  * service -> mv_revenue_by_club_day_service  (bucketed by booking start)
  * cash    -> mv_revenue_by_club_day_cash      (bucketed by payment created_at)

Tenant isolation: the views carry ``club_id`` but not ``tenant_id``. Club-scoped
callers must pass a ``club_id`` they have already authorized; the cross-club
method joins ``clubs`` and filters on ``tenant_id``.
"""
from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, asc, cast, column, desc, func, select, table
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas.revenue import (
    ClubRevenueByType,
    ClubRevenueComparisonRow,
    ClubRevenueSummary,
    ClubRevenueTimeseries,
    Granularity,
    RevenueBasis,
    RevenueByTypeRow,
    RevenueTimeseriesPoint,
    TenantRevenueComparison,
)
from app.db.models.club import Club

_COLUMNS = (
    "club_id",
    "revenue_date",
    "revenue_type",
    "currency",
    "gross_amount",
    "refund_amount",
    "net_amount",
    "transaction_count",
)


def _mv(name: str):
    """Lightweight read-only handle on a materialized view. Uses ``table()`` (not
    an ORM model) so Alembic autogenerate never tries to manage the view."""
    return table(name, *(column(c) for c in _COLUMNS))


_MV_BY_BASIS = {
    RevenueBasis.service: _mv("mv_revenue_by_club_day_service"),
    RevenueBasis.cash: _mv("mv_revenue_by_club_day_cash"),
}


def _d(value) -> Decimal:
    return Decimal(value) if value is not None else Decimal("0")


class RevenueService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _view(self, basis: RevenueBasis):
        return _MV_BY_BASIS[basis]

    async def timeseries(
        self,
        club_id: uuid.UUID,
        basis: RevenueBasis,
        granularity: Granularity,
        date_from: date,
        date_to: date,
    ) -> ClubRevenueTimeseries:
        mv = self._view(basis)
        # date_trunc needs a timestamp; PG casts date implicitly, then back to date.
        bucket = cast(func.date_trunc(granularity.value, mv.c.revenue_date), Date)
        rows = (
            await self.db.execute(
                select(
                    bucket.label("period_start"),
                    func.sum(mv.c.gross_amount),
                    func.sum(mv.c.refund_amount),
                    func.sum(mv.c.net_amount),
                    func.sum(mv.c.transaction_count),
                    func.min(mv.c.currency),
                )
                .where(
                    mv.c.club_id == club_id,
                    mv.c.revenue_date >= date_from,
                    mv.c.revenue_date <= date_to,
                )
                .group_by(bucket)
                .order_by(asc(bucket))
            )
        ).all()

        points = [
            RevenueTimeseriesPoint(
                period_start=r[0],
                gross_amount=_d(r[1]),
                refund_amount=_d(r[2]),
                net_amount=_d(r[3]),
                transaction_count=int(r[4] or 0),
            )
            for r in rows
        ]
        currency = rows[0][5] if rows else None
        return ClubRevenueTimeseries(
            club_id=club_id,
            basis=basis,
            granularity=granularity,
            date_from=date_from,
            date_to=date_to,
            currency=currency,
            points=points,
        )

    async def by_type(
        self,
        club_id: uuid.UUID,
        basis: RevenueBasis,
        date_from: date,
        date_to: date,
    ) -> ClubRevenueByType:
        rows = await self._by_type_rows(club_id, basis, date_from, date_to)
        currency = await self._club_currency(club_id, basis, date_from, date_to)
        return ClubRevenueByType(
            club_id=club_id,
            basis=basis,
            date_from=date_from,
            date_to=date_to,
            currency=currency,
            rows=rows,
        )

    async def summary(
        self,
        club_id: uuid.UUID,
        basis: RevenueBasis,
        date_from: date,
        date_to: date,
    ) -> ClubRevenueSummary:
        by_type = await self._by_type_rows(club_id, basis, date_from, date_to)
        gross = sum((r.gross_amount for r in by_type), Decimal("0"))
        refund = sum((r.refund_amount for r in by_type), Decimal("0"))
        net = sum((r.net_amount for r in by_type), Decimal("0"))
        tx = sum(r.transaction_count for r in by_type)
        avg_tx = (net / tx).quantize(Decimal("0.01")) if tx else Decimal("0")
        currency = await self._club_currency(club_id, basis, date_from, date_to)
        return ClubRevenueSummary(
            club_id=club_id,
            basis=basis,
            date_from=date_from,
            date_to=date_to,
            currency=currency,
            gross_amount=gross,
            refund_amount=refund,
            net_amount=net,
            transaction_count=tx,
            avg_transaction_value=avg_tx,
            by_type=by_type,
        )

    async def cross_club(
        self,
        tenant_id: uuid.UUID,
        basis: RevenueBasis,
        date_from: date,
        date_to: date,
    ) -> TenantRevenueComparison:
        """Per-club totals for the whole tenant — the multi-site ROI view.

        LEFT JOIN from clubs so a club with zero revenue in the window still
        appears (with zeroed totals), not silently dropped.
        """
        mv = self._view(basis)
        date_pred = (mv.c.revenue_date >= date_from) & (mv.c.revenue_date <= date_to)
        rows = (
            await self.db.execute(
                select(
                    Club.id,
                    Club.name,
                    func.min(Club.currency),
                    func.coalesce(func.sum(mv.c.gross_amount), 0),
                    func.coalesce(func.sum(mv.c.refund_amount), 0),
                    func.coalesce(func.sum(mv.c.net_amount), 0),
                    func.coalesce(func.sum(mv.c.transaction_count), 0),
                )
                .select_from(Club)
                .outerjoin(mv, (mv.c.club_id == Club.id) & date_pred)
                .where(Club.tenant_id == tenant_id)
                .group_by(Club.id, Club.name)
                .order_by(desc(func.coalesce(func.sum(mv.c.net_amount), 0)))
            )
        ).all()

        clubs = [
            ClubRevenueComparisonRow(
                club_id=r[0],
                club_name=r[1],
                currency=r[2],
                gross_amount=_d(r[3]),
                refund_amount=_d(r[4]),
                net_amount=_d(r[5]),
                transaction_count=int(r[6] or 0),
            )
            for r in rows
        ]
        return TenantRevenueComparison(
            basis=basis, date_from=date_from, date_to=date_to, clubs=clubs
        )

    # -- internals ----------------------------------------------------------

    async def _by_type_rows(
        self,
        club_id: uuid.UUID,
        basis: RevenueBasis,
        date_from: date,
        date_to: date,
    ) -> list[RevenueByTypeRow]:
        mv = self._view(basis)
        rows = (
            await self.db.execute(
                select(
                    mv.c.revenue_type,
                    func.sum(mv.c.gross_amount),
                    func.sum(mv.c.refund_amount),
                    func.sum(mv.c.net_amount),
                    func.sum(mv.c.transaction_count),
                )
                .where(
                    mv.c.club_id == club_id,
                    mv.c.revenue_date >= date_from,
                    mv.c.revenue_date <= date_to,
                )
                .group_by(mv.c.revenue_type)
                .order_by(desc(func.sum(mv.c.net_amount)))
            )
        ).all()
        return [
            RevenueByTypeRow(
                revenue_type=r[0],
                gross_amount=_d(r[1]),
                refund_amount=_d(r[2]),
                net_amount=_d(r[3]),
                transaction_count=int(r[4] or 0),
            )
            for r in rows
        ]

    async def _club_currency(
        self,
        club_id: uuid.UUID,
        basis: RevenueBasis,
        date_from: date,
        date_to: date,
    ) -> str | None:
        mv = self._view(basis)
        return (
            await self.db.execute(
                select(func.min(mv.c.currency)).where(
                    mv.c.club_id == club_id,
                    mv.c.revenue_date >= date_from,
                    mv.c.revenue_date <= date_to,
                )
            )
        ).scalar_one_or_none()
