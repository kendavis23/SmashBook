"""Player-value analytics service (Sprint 7 / G7 — workstream B).

Reads the ``mv_player_value`` materialized view off the **read replica** and
serves three reports from it (per-member LTV, most-active players, inactive
members). The view is keyed ``(club_id, user_id)`` and already collapses
activity, spend, and membership per player; this service only filters, sorts,
and paginates that grain — it never touches live operational tables.

Display fields (``full_name`` / ``email``) are joined live from ``users`` rather
than denormalised into the view, so they are never stale and no PII sits in the
MV. The per-player RFV scores (``mv_player_rfv``) are LEFT-joined on
``(club_id, user_id)`` for display only — nullable, never used to filter/sort, so
the enrichment is additive and shared by all three row-based reports (LTV,
most-active, inactive-members). The ``value/by-group`` roll-up does not read RFV.
Tenant isolation: the views carry ``club_id`` but not ``tenant_id`` — the caller
passes a ``club_id`` it has already authorised.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import (
    Integer,
    asc,
    case,
    cast,
    column,
    desc,
    func,
    literal,
    nullsfirst,
    nullslast,
    select,
    table,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas.player import (
    GroupDimension,
    GroupValueReport,
    GroupValueRow,
    InactiveMembersReport,
    PlayerActivityLeaderboard,
    PlayerSort,
    PlayerValueLeaderboard,
    PlayerValueRow,
)
from app.db.models.user import User

_NON_MEMBER_LABEL = "Non-member"

# Static labels for the two enumerable dimensions; membership_tier labels are the
# plan name itself (or Non-member), so they are not table-driven.
_GROUP_LABELS = {
    "paid_member": "Paid member",
    "non_member": _NON_MEMBER_LABEL,
    "active": "Active",
    "lapsed": "Lapsed",
    "never_played": "Never played",
}

_COLUMNS = (
    "club_id",
    "user_id",
    "first_played_at",
    "last_played_at",
    "bookings_played",
    "played_last_30d",
    "played_last_90d",
    "lifetime_gross",
    "lifetime_refunds",
    "lifetime_spend",
    "payments_count",
    "currency",
    "is_paid_member",
    "membership_plan_name",
)

_WINDOW_COLUMN = {30: "played_last_30d", 90: "played_last_90d"}

# RFV pre-aggregate (``mv_player_rfv``), LEFT-joined onto the per-player rows for
# display only — never used to filter, sort, or paginate, so it cannot change
# which rows a report returns or their order (keeps the enrichment additive).
_RFV_COLUMNS = (
    "club_id",
    "user_id",
    "recency_score",
    "frequency_score",
    "value_score",
    "rfv_total",
    "rfv_cell",
)


def _mv():
    """Lightweight read-only handle on the materialized view. Uses ``table()``
    (not an ORM model) so Alembic autogenerate never tries to manage the view."""
    return table("mv_player_value", *(column(c) for c in _COLUMNS))


def _rfv():
    """Read-only handle on the ``mv_player_rfv`` pre-aggregate view."""
    return table("mv_player_rfv", *(column(c) for c in _RFV_COLUMNS))


def _d(value) -> Decimal:
    return Decimal(value) if value is not None else Decimal("0")


class PlayerValueService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.mv = _mv()
        self.rfv = _rfv()

    def _select_row(self):
        """SELECT list joining the MV to ``users`` for display fields and to
        ``mv_player_rfv`` for the (nullable) RFV scores. Both joins are LEFT
        joins, so neither can drop or duplicate a player-value row. The RFV view
        is keyed ``(club_id, user_id)``, so the join matches on both — a user can
        belong to multiple clubs, and joining on ``user_id`` alone would pull a
        different club's scores."""
        mv = self.mv
        rfv = self.rfv
        return select(
            mv.c.user_id,
            User.full_name,
            User.email,
            mv.c.is_paid_member,
            mv.c.membership_plan_name,
            mv.c.first_played_at,
            mv.c.last_played_at,
            mv.c.bookings_played,
            mv.c.played_last_30d,
            mv.c.played_last_90d,
            mv.c.lifetime_gross,
            mv.c.lifetime_refunds,
            mv.c.lifetime_spend,
            mv.c.payments_count,
            mv.c.currency,
            rfv.c.recency_score,
            rfv.c.frequency_score,
            rfv.c.value_score,
            rfv.c.rfv_total,
            rfv.c.rfv_cell,
        ).select_from(
            mv.outerjoin(User, User.id == mv.c.user_id).outerjoin(
                rfv,
                (rfv.c.club_id == mv.c.club_id) & (rfv.c.user_id == mv.c.user_id),
            )
        )

    @staticmethod
    def _opt_int(value) -> int | None:
        return int(value) if value is not None else None

    @staticmethod
    def _to_row(r) -> PlayerValueRow:
        return PlayerValueRow(
            user_id=r[0],
            full_name=r[1],
            email=r[2],
            is_paid_member=bool(r[3]),
            membership_plan_name=r[4],
            first_played_at=r[5],
            last_played_at=r[6],
            bookings_played=int(r[7] or 0),
            played_last_30d=int(r[8] or 0),
            played_last_90d=int(r[9] or 0),
            lifetime_gross=_d(r[10]),
            lifetime_refunds=_d(r[11]),
            lifetime_spend=_d(r[12]),
            payments_count=int(r[13] or 0),
            currency=r[14],
            recency_score=PlayerValueService._opt_int(r[15]),
            frequency_score=PlayerValueService._opt_int(r[16]),
            value_score=PlayerValueService._opt_int(r[17]),
            rfv_total=PlayerValueService._opt_int(r[18]),
            rfv_cell=r[19],
        )

    async def leaderboard(
        self,
        club_id: uuid.UUID,
        members_only: bool,
        sort: PlayerSort,
        limit: int,
        offset: int,
    ) -> PlayerValueLeaderboard:
        """Per-player lifetime value, highest first (the LTV view)."""
        mv = self.mv
        order = {
            PlayerSort.lifetime_spend: desc(mv.c.lifetime_spend),
            PlayerSort.bookings_played: desc(mv.c.bookings_played),
            PlayerSort.last_played_at: nullslast(desc(mv.c.last_played_at)),
        }[sort]

        count_stmt = select(func.count()).select_from(mv).where(mv.c.club_id == club_id)
        if members_only:
            count_stmt = count_stmt.where(mv.c.is_paid_member.is_(True))
        total_records = (await self.db.execute(count_stmt)).scalar_one()

        stmt = self._select_row().where(mv.c.club_id == club_id)
        if members_only:
            stmt = stmt.where(mv.c.is_paid_member.is_(True))
        stmt = stmt.order_by(order, asc(mv.c.user_id)).limit(limit).offset(offset)

        rows = (await self.db.execute(stmt)).all()
        return PlayerValueLeaderboard(
            club_id=club_id,
            members_only=members_only,
            sort=sort,
            limit=limit,
            offset=offset,
            total_records=int(total_records or 0),
            rows=[self._to_row(r) for r in rows],
        )

    async def most_active(
        self,
        club_id: uuid.UUID,
        window_days: int,
        limit: int,
        offset: int,
    ) -> PlayerActivityLeaderboard:
        """Most-active players, ranked by bookings in the chosen window."""
        mv = self.mv
        window_col = mv.c[_WINDOW_COLUMN[window_days]]

        total_records = (
            await self.db.execute(
                select(func.count())
                .select_from(mv)
                .where(mv.c.club_id == club_id, window_col > 0)
            )
        ).scalar_one()

        stmt = (
            self._select_row()
            .where(mv.c.club_id == club_id, window_col > 0)
            .order_by(desc(window_col), asc(mv.c.user_id))
            .limit(limit)
            .offset(offset)
        )
        rows = (await self.db.execute(stmt)).all()
        return PlayerActivityLeaderboard(
            club_id=club_id,
            window_days=window_days,
            limit=limit,
            offset=offset,
            total_records=int(total_records or 0),
            rows=[self._to_row(r) for r in rows],
        )

    async def inactive_members(
        self,
        club_id: uuid.UUID,
        inactive_days: int,
        limit: int,
        offset: int,
    ) -> InactiveMembersReport:
        """Paid members who have not played since ``now - inactive_days``
        (never-played members included). Longest-gone first."""
        mv = self.mv
        cutoff = datetime.now(timezone.utc) - timedelta(days=inactive_days)
        inactive_pred = mv.c.last_played_at.is_(None) | (mv.c.last_played_at < cutoff)
        member_pred = mv.c.is_paid_member.is_(True)

        member_count = (
            await self.db.execute(
                select(func.count())
                .select_from(mv)
                .where(mv.c.club_id == club_id, member_pred)
            )
        ).scalar_one()
        inactive_count = (
            await self.db.execute(
                select(func.count())
                .select_from(mv)
                .where(mv.c.club_id == club_id, member_pred, inactive_pred)
            )
        ).scalar_one()

        stmt = (
            self._select_row()
            .where(mv.c.club_id == club_id, member_pred, inactive_pred)
            # never-played (NULL) are the most inactive -> first
            .order_by(nullsfirst(asc(mv.c.last_played_at)), asc(mv.c.user_id))
            .limit(limit)
            .offset(offset)
        )
        rows = (await self.db.execute(stmt)).all()
        return InactiveMembersReport(
            club_id=club_id,
            inactive_days=inactive_days,
            cutoff=cutoff,
            member_count=int(member_count or 0),
            inactive_count=int(inactive_count or 0),
            total_records=int(inactive_count or 0),
            limit=limit,
            offset=offset,
            rows=[self._to_row(r) for r in rows],
        )

    def _group_expr(self, dimension: GroupDimension, inactive_days: int):
        """The SQL grouping key for a dimension — all derived from columns already
        on ``mv_player_value`` (no segmentation table)."""
        mv = self.mv
        if dimension is GroupDimension.membership_tier:
            return func.coalesce(mv.c.membership_plan_name, _NON_MEMBER_LABEL)
        if dimension is GroupDimension.member_status:
            return case(
                (mv.c.is_paid_member.is_(True), literal("paid_member")),
                else_=literal("non_member"),
            )
        # activity_status
        cutoff = datetime.now(timezone.utc) - timedelta(days=inactive_days)
        return case(
            (mv.c.last_played_at.is_(None), literal("never_played")),
            (mv.c.last_played_at < cutoff, literal("lapsed")),
            else_=literal("active"),
        )

    async def group_value(
        self,
        club_id: uuid.UUID,
        dimension: GroupDimension,
        inactive_days: int,
        currency: str | None,
    ) -> GroupValueReport:
        """Lifetime value rolled up by a grouping dimension — group LTV. Pure
        ``GROUP BY`` over the per-player view; groups ordered by total spend."""
        mv = self.mv
        group_key = self._group_expr(dimension, inactive_days).label("group_key")
        paid_int = cast(mv.c.is_paid_member, Integer)
        total_spend = func.sum(mv.c.lifetime_spend)

        rows = (
            await self.db.execute(
                select(
                    group_key,
                    func.count().label("player_count"),
                    func.sum(paid_int).label("paid_member_count"),
                    total_spend.label("total_lifetime_spend"),
                    func.sum(mv.c.lifetime_refunds).label("total_lifetime_refunds"),
                    func.sum(mv.c.bookings_played).label("total_bookings_played"),
                )
                .where(mv.c.club_id == club_id)
                .group_by(group_key)
                .order_by(desc(total_spend))
            )
        ).all()

        return GroupValueReport(
            club_id=club_id,
            dimension=dimension,
            inactive_days=inactive_days,
            currency=currency,
            rows=[self._to_group_row(r) for r in rows],
        )

    @staticmethod
    def _to_group_row(r) -> GroupValueRow:
        key = str(r[0])
        count = int(r[1] or 0)
        total = _d(r[3])
        avg = (total / count).quantize(Decimal("0.01")) if count else Decimal("0")
        return GroupValueRow(
            group_key=key,
            group_label=_GROUP_LABELS.get(key, key),
            player_count=count,
            paid_member_count=int(r[2] or 0),
            total_lifetime_spend=total,
            avg_lifetime_spend=avg,
            total_lifetime_refunds=_d(r[4]),
            total_bookings_played=int(r[5] or 0),
        )
