"""create coach popularity materialized view

Revision ID: 1f0263eec44b
Revises: b94daf2c75e8
Create Date: 2026-06-12 18:50:56.188702

The coach-popularity & return-rate rollup backing the "Coach popularity" report
(G7 analytics). One row per (club_id, staff_profile_id) — a point-in-time
*stock*, refreshed nightly by ``app/analytics/workers/refresh_views.py``.

A "coaching session" is a lesson booking led by a staff member: a row in
``bookings`` with ``booking_type IN (lesson_individual, lesson_group,
train_and_play)`` and a non-null ``staff_profile_id``, restricted (like the
other player views) to non-cancelled bookings that have already started
(``status IN (confirmed, completed)`` and ``start_datetime <= now()``) so future
reservations don't count as delivered coaching.

Measures per coach:
  sessions / first_session_at / last_session_at / sessions_last_30d /
  sessions_last_90d   — volume + recency, from the lesson bookings themselves.
  distinct_players     — distinct players coached (booking_players ⋈ lessons).
  repeat_players       — of those, how many took >= 2 lessons with this coach.
  total_attendances    — sum of per-player lesson counts (a player who took 3
                         lessons counts 3) — the player-side volume.
  lesson_revenue       — net realised revenue on the coach's lesson bookings
                         (payments by booking_id, states succeeded/refunded/
                         partially_refunded, net of refunds). Membership MRR
                         excluded, matching the revenue & player-value views.

**return_rate is NOT stored** — it is repeat_players / distinct_players, derived
by the service so the view keeps numerator and denominator separate (same rule
as the revenue view's avg-per-transaction: never bake a ratio that callers may
want to re-roll across coaches).

Coach display names are joined live from ``users`` (via ``staff_profiles``) by
the service — no PII denormalised into the view, matching ``mv_player_value``.

Hand-written DDL: materialized views are not ORM models, so autogenerate
produces nothing. The unique index on (club_id, staff_profile_id) is required
for REFRESH MATERIALIZED VIEW ... CONCURRENTLY.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '1f0263eec44b'
down_revision: Union[str, None] = 'b94daf2c75e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_VIEW_NAME = "mv_coach_popularity"

_VIEW_SQL = """
CREATE MATERIALIZED VIEW mv_coach_popularity AS
WITH lessons AS (
    SELECT
        b.id               AS booking_id,
        b.club_id          AS club_id,
        b.staff_profile_id AS staff_profile_id,
        b.start_datetime   AS start_datetime
    FROM bookings b
    WHERE b.booking_type IN ('lesson_individual', 'lesson_group', 'train_and_play')
      AND b.staff_profile_id IS NOT NULL
      AND b.status IN ('confirmed', 'completed')
      AND b.start_datetime <= now()
),
sessions AS (
    SELECT
        l.club_id,
        l.staff_profile_id,
        COUNT(*)                AS sessions,
        MIN(l.start_datetime)   AS first_session_at,
        MAX(l.start_datetime)   AS last_session_at,
        COUNT(*) FILTER (
            WHERE l.start_datetime >= now() - interval '30 days'
        )                       AS sessions_last_30d,
        COUNT(*) FILTER (
            WHERE l.start_datetime >= now() - interval '90 days'
        )                       AS sessions_last_90d
    FROM lessons l
    GROUP BY l.club_id, l.staff_profile_id
),
coach_player AS (
    -- per coach per player: how many distinct lessons that player took
    SELECT
        l.club_id,
        l.staff_profile_id,
        bp.user_id,
        COUNT(DISTINCT l.booking_id) AS lessons_with_coach
    FROM lessons l
    JOIN booking_players bp ON bp.booking_id = l.booking_id
    GROUP BY l.club_id, l.staff_profile_id, bp.user_id
),
players AS (
    SELECT
        cp.club_id,
        cp.staff_profile_id,
        COUNT(*)                                            AS distinct_players,
        COUNT(*) FILTER (WHERE cp.lessons_with_coach >= 2)  AS repeat_players,
        SUM(cp.lessons_with_coach)                          AS total_attendances
    FROM coach_player cp
    GROUP BY cp.club_id, cp.staff_profile_id
),
revenue AS (
    SELECT
        l.club_id,
        l.staff_profile_id,
        SUM(p.amount - COALESCE(p.refund_amount, 0)) AS lesson_revenue,
        MIN(p.currency)                              AS currency
    FROM lessons l
    JOIN payments p
      ON p.booking_id = l.booking_id
     AND p.state IN ('succeeded', 'refunded', 'partially_refunded')
    GROUP BY l.club_id, l.staff_profile_id
)
SELECT
    s.club_id,
    s.staff_profile_id,
    s.sessions::bigint                                   AS sessions,
    s.first_session_at,
    s.last_session_at,
    s.sessions_last_30d::bigint                          AS sessions_last_30d,
    s.sessions_last_90d::bigint                          AS sessions_last_90d,
    COALESCE(pl.distinct_players, 0)::bigint             AS distinct_players,
    COALESCE(pl.repeat_players, 0)::bigint               AS repeat_players,
    COALESCE(pl.total_attendances, 0)::bigint            AS total_attendances,
    COALESCE(r.lesson_revenue, 0)::numeric(12, 2)        AS lesson_revenue,
    r.currency
FROM sessions s
LEFT JOIN players pl
       ON pl.club_id = s.club_id AND pl.staff_profile_id = s.staff_profile_id
LEFT JOIN revenue r
       ON r.club_id = s.club_id AND r.staff_profile_id = s.staff_profile_id
"""

# Unique index required for REFRESH ... CONCURRENTLY; (club_id, staff_profile_id)
# is the natural unique key of the view.
_INDEX_SQL = (
    "CREATE UNIQUE INDEX ix_mv_coach_popularity_key "
    "ON mv_coach_popularity (club_id, staff_profile_id)"
)


def upgrade() -> None:
    op.execute(_VIEW_SQL)
    op.execute(_INDEX_SQL)


def downgrade() -> None:
    op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {_VIEW_NAME}")
