"""Player-value analytics service (Sprint 7 / G7 — workstream B).

Reads the ``mv_player_value`` materialized view off the **read replica** and
serves three reports from it (per-member LTV, most-active players, inactive
members). The view is keyed ``(club_id, user_id)`` and already collapses
activity, spend, and membership per player; this service only filters, sorts,
and paginates that grain — it never touches live operational tables.

Display fields (``full_name`` / ``email``) are joined live from ``users`` rather
than denormalised into the view, so they are never stale and no PII sits in the
MV. Tenant isolation: the view carries ``club_id`` but not ``tenant_id`` — the
caller passes a ``club_id`` it has already authorised.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import asc, column, desc, func, nullsfirst, nullslast, select, table
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas.player import (
    InactiveMembersReport,
    PlayerActivityLeaderboard,
    PlayerSort,
    PlayerValueLeaderboard,
    PlayerValueRow,
)
from app.db.models.user import User

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


def _mv():
    """Lightweight read-only handle on the materialized view. Uses ``table()``
    (not an ORM model) so Alembic autogenerate never tries to manage the view."""
    return table("mv_player_value", *(column(c) for c in _COLUMNS))


def _d(value) -> Decimal:
    return Decimal(value) if value is not None else Decimal("0")


class PlayerValueService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.mv = _mv()

    def _select_row(self):
        """SELECT list joining the MV to ``users`` for display fields."""
        mv = self.mv
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
        ).select_from(mv.outerjoin(User, User.id == mv.c.user_id))

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
            limit=limit,
            offset=offset,
            rows=[self._to_row(r) for r in rows],
        )
