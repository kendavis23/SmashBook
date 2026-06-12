"""create player rfv materialized view

Revision ID: dff4cf6de626
Revises: 1f0263eec44b
Create Date: 2026-06-12 18:52:16.080960

The RFV (Recency / Frequency / Value) *pre-aggregate* backing G7 analytics —
one row per (club_id, user_id), refreshed nightly by
``app/analytics/workers/refresh_views.py``.

**Scope — a pre-aggregate, not a segmentation taxonomy.** This scores each
engaged player on three axes (1 = lowest .. 5 = highest) via per-club quintiles
and exposes the raw scores + their sum. It deliberately does **not** name
segments ("champions", "at risk", …) or build a cohort/segment taxonomy — that
structured player segmentation stays deferred (see the dropped ``player_segments``
decision in the root CLAUDE.md / DATA_MODEL_TARGET_STATE.md). The cell string
(e.g. "543") is offered as a stable grouping key; naming is left to consumers /
later AI.

Built on top of ``mv_player_value`` (not the base tables) — RFV is a derivation
of the same per-player stock. The three inputs:
  Recency   <- last_played_at   (more recent => higher score; NULL => lowest)
  Frequency <- bookings_played
  Value     <- lifetime_spend   (net realised spend)

Only *engaged* players are scored (``bookings_played > 0 OR lifetime_spend > 0``)
— scoring a club's never-active rows would collapse the quintiles. ``ntile(5)``
partitions per club so scores are relative within each club; with fewer than 5
players per club ntile spreads them across the low buckets, which is the correct
"not enough signal yet" behaviour.

**Refresh ordering matters:** this view reads ``mv_player_value``, so it must be
refreshed *after* it. The worker refreshes ``REFRESH_VIEWS`` sequentially in list
order and ``mv_player_rfv`` is registered immediately after ``mv_player_value``,
so each nightly run scores against the just-refreshed values.

Hand-written DDL: materialized views are not ORM models, so autogenerate
produces nothing. The unique index on (club_id, user_id) is required for
REFRESH MATERIALIZED VIEW ... CONCURRENTLY.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'dff4cf6de626'
down_revision: Union[str, None] = '1f0263eec44b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_VIEW_NAME = "mv_player_rfv"

_VIEW_SQL = """
CREATE MATERIALIZED VIEW mv_player_rfv AS
WITH base AS (
    SELECT
        club_id,
        user_id,
        last_played_at,
        bookings_played,
        lifetime_spend
    FROM mv_player_value
    WHERE bookings_played > 0 OR lifetime_spend > 0
),
scored AS (
    SELECT
        club_id,
        user_id,
        last_played_at,
        bookings_played,
        lifetime_spend,
        ntile(5) OVER (
            PARTITION BY club_id ORDER BY last_played_at ASC NULLS FIRST
        )::smallint AS recency_score,
        ntile(5) OVER (
            PARTITION BY club_id ORDER BY bookings_played ASC
        )::smallint AS frequency_score,
        ntile(5) OVER (
            PARTITION BY club_id ORDER BY lifetime_spend ASC
        )::smallint AS value_score
    FROM base
)
SELECT
    club_id,
    user_id,
    last_played_at,
    bookings_played,
    lifetime_spend,
    recency_score,
    frequency_score,
    value_score,
    (recency_score + frequency_score + value_score)::smallint AS rfv_total,
    (recency_score::text || frequency_score::text || value_score::text) AS rfv_cell
FROM scored
"""

# Unique index required for REFRESH ... CONCURRENTLY; (club_id, user_id) is the
# natural unique key of the view.
_INDEX_SQL = (
    "CREATE UNIQUE INDEX ix_mv_player_rfv_key "
    "ON mv_player_rfv (club_id, user_id)"
)


def upgrade() -> None:
    op.execute(_VIEW_SQL)
    op.execute(_INDEX_SQL)


def downgrade() -> None:
    op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {_VIEW_NAME}")
