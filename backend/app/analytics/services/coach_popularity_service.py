"""Coach-popularity analytics service (Sprint 7 / G7).

Reads the ``mv_coach_popularity`` materialized view off the **read replica** and
serves the coach-popularity leaderboard from it. The view is keyed
``(club_id, staff_profile_id)`` and already collapses lesson volume, player reach,
repeat business, and revenue per coach; this service only joins the coach's
display name, derives ``return_rate``, sorts, and paginates — it never touches
live operational tables.

Display fields (``coach_name`` / ``is_active``) are joined live from
``staff_profiles`` ⋈ ``users`` rather than denormalised into the view, so they are
never stale and no PII sits in the MV. Tenant isolation: the view carries
``club_id`` but not ``tenant_id`` — the caller passes a ``club_id`` it has already
authorised.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import (
    Float,
    cast,
    column,
    desc,
    func,
    nullslast,
    select,
    table,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas.coach import (
    CoachPopularityLeaderboard,
    CoachPopularityRow,
    CoachSort,
)
from app.db.models.staff import StaffProfile
from app.db.models.user import User

_COLUMNS = (
    "club_id",
    "staff_profile_id",
    "sessions",
    "first_session_at",
    "last_session_at",
    "sessions_last_30d",
    "sessions_last_90d",
    "distinct_players",
    "repeat_players",
    "total_attendances",
    "lesson_revenue",
    "currency",
)


def _mv():
    """Lightweight read-only handle on the materialized view. Uses ``table()``
    (not an ORM model) so Alembic autogenerate never tries to manage the view."""
    return table("mv_coach_popularity", *(column(c) for c in _COLUMNS))


def _d(value) -> Decimal:
    return Decimal(value) if value is not None else Decimal("0")


class CoachPopularityService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.mv = _mv()

    def _return_rate_expr(self):
        """repeat_players / distinct_players as a float, NULL when no players (so
        it sorts last). Computed in SQL so the leaderboard can order by it."""
        mv = self.mv
        return cast(mv.c.repeat_players, Float) / func.nullif(mv.c.distinct_players, 0)

    def _select_row(self):
        """SELECT list joining the MV to ``staff_profiles`` ⋈ ``users`` for the
        coach's display name. LEFT joins so a deactivated/edited coach is never
        dropped from the report."""
        mv = self.mv
        return select(
            mv.c.staff_profile_id,
            StaffProfile.user_id,
            User.full_name,
            StaffProfile.is_active,
            mv.c.sessions,
            mv.c.first_session_at,
            mv.c.last_session_at,
            mv.c.sessions_last_30d,
            mv.c.sessions_last_90d,
            mv.c.distinct_players,
            mv.c.repeat_players,
            mv.c.total_attendances,
            mv.c.lesson_revenue,
            mv.c.currency,
        ).select_from(
            mv.outerjoin(
                StaffProfile, StaffProfile.id == mv.c.staff_profile_id
            ).outerjoin(User, User.id == StaffProfile.user_id)
        )

    @staticmethod
    def _to_row(r) -> CoachPopularityRow:
        distinct_players = int(r[9] or 0)
        repeat_players = int(r[10] or 0)
        return_rate = (repeat_players / distinct_players) if distinct_players else 0.0
        return CoachPopularityRow(
            staff_profile_id=r[0],
            user_id=r[1],
            coach_name=r[2],
            is_active=r[3],
            sessions=int(r[4] or 0),
            first_session_at=r[5],
            last_session_at=r[6],
            sessions_last_30d=int(r[7] or 0),
            sessions_last_90d=int(r[8] or 0),
            distinct_players=distinct_players,
            repeat_players=repeat_players,
            return_rate=return_rate,
            total_attendances=int(r[11] or 0),
            lesson_revenue=_d(r[12]),
            currency=r[13],
        )

    async def leaderboard(
        self,
        club_id: uuid.UUID,
        sort: CoachSort,
        limit: int,
        offset: int,
    ) -> CoachPopularityLeaderboard:
        """Coaches ranked by the chosen metric, highest first."""
        mv = self.mv
        order = {
            CoachSort.sessions: desc(mv.c.sessions),
            CoachSort.distinct_players: desc(mv.c.distinct_players),
            CoachSort.repeat_players: desc(mv.c.repeat_players),
            CoachSort.return_rate: nullslast(desc(self._return_rate_expr())),
            CoachSort.lesson_revenue: desc(mv.c.lesson_revenue),
            CoachSort.last_session_at: nullslast(desc(mv.c.last_session_at)),
        }[sort]

        total_records = (
            await self.db.execute(
                select(func.count()).select_from(mv).where(mv.c.club_id == club_id)
            )
        ).scalar_one()

        stmt = (
            self._select_row()
            .where(mv.c.club_id == club_id)
            .order_by(order, mv.c.staff_profile_id)
            .limit(limit)
            .offset(offset)
        )
        rows = (await self.db.execute(stmt)).all()
        return CoachPopularityLeaderboard(
            club_id=club_id,
            sort=sort,
            limit=limit,
            offset=offset,
            total_records=int(total_records or 0),
            rows=[self._to_row(r) for r in rows],
        )
