"""create club player-flow materialized views

Revision ID: 4d439313634d
Revises: fd3c5c3192ab
Create Date: 2026-06-02 14:44:32.664931

Two materialized views backing the club-level "player flow" report (G7
analytics, workstream A): active players and new member sign-ups. They live in
separate views because they have different grains.

  * mv_club_active_player_day  — grain (club_id, activity_date, user_id):
    one row per player per club-local day they were actually on court
    (booking_players ⋈ bookings, non-cancelled + already-started). A presence
    table: the distinct (club, day, player) set. The service derives both the
    trailing-window active KPI (COUNT(DISTINCT) over the last N days) and the
    calendar-bucketed active timeseries (WAP/MAP — COUNT(DISTINCT) per
    week/month) from it. Storing presence rows (not a precomputed rolling count)
    keeps the window flexible at query time and the view trivially refreshable.

  * mv_club_signups_day        — grain (club_id, signup_date):
    count of new *paid* membership subscription starts that club-local day
    (membership_subscriptions.created_at, plan price > 0; the free default
    "basic" plan does not count). An additive flow — the service SUMs it over
    the requested range/granularity.

Both bucket dates in the club's local timezone (date AT TIME ZONE clubs.timezone)
to match the revenue views. Hand-written DDL: materialized views are not ORM
models, so autogenerate produces nothing. The unique index on each is required
for REFRESH MATERIALIZED VIEW ... CONCURRENTLY.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '4d439313634d'
down_revision: Union[str, None] = 'fd3c5c3192ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_ACTIVE_VIEW = "mv_club_active_player_day"
_SIGNUPS_VIEW = "mv_club_signups_day"

# Presence rows: distinct (club, club-local day, player) for plays that have
# already happened. now() is evaluated at refresh time (nightly), so the
# trailing edge is at most one refresh stale — acceptable.
_ACTIVE_SQL = f"""
CREATE MATERIALIZED VIEW {_ACTIVE_VIEW} AS
SELECT DISTINCT
    b.club_id                                          AS club_id,
    (b.start_datetime AT TIME ZONE c.timezone)::date   AS activity_date,
    bp.user_id                                         AS user_id
FROM booking_players bp
JOIN bookings b ON b.id = bp.booking_id
JOIN clubs    c ON c.id = b.club_id
WHERE b.status IN ('confirmed', 'completed')
  AND b.start_datetime <= now()
"""

_SIGNUPS_SQL = f"""
CREATE MATERIALIZED VIEW {_SIGNUPS_VIEW} AS
SELECT
    ms.club_id                                       AS club_id,
    (ms.created_at AT TIME ZONE c.timezone)::date    AS signup_date,
    COUNT(*)::bigint                                 AS signups
FROM membership_subscriptions ms
JOIN membership_plans mp ON mp.id = ms.plan_id
JOIN clubs           c  ON c.id = ms.club_id
WHERE mp.price > 0
GROUP BY ms.club_id, (ms.created_at AT TIME ZONE c.timezone)::date
"""

# Unique indexes required for REFRESH ... CONCURRENTLY; each is the natural key.
_ACTIVE_INDEX = (
    f"CREATE UNIQUE INDEX ix_{_ACTIVE_VIEW}_key "
    f"ON {_ACTIVE_VIEW} (club_id, activity_date, user_id)"
)
_SIGNUPS_INDEX = (
    f"CREATE UNIQUE INDEX ix_{_SIGNUPS_VIEW}_key "
    f"ON {_SIGNUPS_VIEW} (club_id, signup_date)"
)


def upgrade() -> None:
    op.execute(_ACTIVE_SQL)
    op.execute(_ACTIVE_INDEX)
    op.execute(_SIGNUPS_SQL)
    op.execute(_SIGNUPS_INDEX)


def downgrade() -> None:
    op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {_SIGNUPS_VIEW}")
    op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {_ACTIVE_VIEW}")
