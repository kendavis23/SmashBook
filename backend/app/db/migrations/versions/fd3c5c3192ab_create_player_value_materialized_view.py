"""create player_value materialized view

Revision ID: fd3c5c3192ab
Revises: 520ea227119a
Create Date: 2026-06-02 14:25:46.205749

The per-player value & recency rollup backing the "Player value" report
(G7 analytics, workstream B). One row per (club_id, user_id) — a point-in-time
*stock*, not a dated flow, refreshed nightly by
``app/analytics/workers/refresh_views.py``.

This single surface answers three reports via different filters/sorts:
  * inactive members  -> WHERE is_paid_member AND (last_played_at < cutoff OR NULL)
  * per-member LTV     -> ORDER BY lifetime_spend
  * most-active players-> ORDER BY played_last_30d

Three independent sub-aggregates are stitched on (club_id, user_id):

  activity  (booking_players ⋈ bookings) — who was actually on court. Counts
            only non-cancelled bookings that have already started
            (start_datetime <= now()); future reservations don't count as
            "played". Recency windows (30/90d) are relative to refresh time.
  spend     (payments) — net realised spend. Attributed via payments.user_id:
            bookings use split payments, so each player pays their own
            amount_due and payment.amount already embeds any equipment charge.
            States succeeded/refunded/partially_refunded (matches the revenue
            views); net = amount - refund_amount.
  member    (membership_subscriptions ⋈ membership_plans) — a "paid member" has
            an active subscription on a plan with price > 0 (the free default
            "basic" plan does not count).

The three are FULL-outer-stitched via a UNION-of-keys so a paid member who has
never played or paid still appears (last_played_at NULL, lifetime_spend 0) —
that row is the prime inactive-member case.

Hand-written DDL: materialized views are not ORM models, so autogenerate
produces nothing for them. The unique index on (club_id, user_id) is required
for REFRESH MATERIALIZED VIEW ... CONCURRENTLY.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'fd3c5c3192ab'
down_revision: Union[str, None] = '520ea227119a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_VIEW_NAME = "mv_player_value"

_VIEW_SQL = """
CREATE MATERIALIZED VIEW mv_player_value AS
WITH activity AS (
    SELECT
        b.club_id                       AS club_id,
        bp.user_id                      AS user_id,
        MIN(b.start_datetime)           AS first_played_at,
        MAX(b.start_datetime)           AS last_played_at,
        COUNT(*)                        AS bookings_played,
        COUNT(*) FILTER (
            WHERE b.start_datetime >= now() - interval '30 days'
        )                               AS played_last_30d,
        COUNT(*) FILTER (
            WHERE b.start_datetime >= now() - interval '90 days'
        )                               AS played_last_90d
    FROM booking_players bp
    JOIN bookings b ON b.id = bp.booking_id
    WHERE b.status IN ('confirmed', 'completed')
      AND b.start_datetime <= now()
    GROUP BY b.club_id, bp.user_id
),
spend AS (
    SELECT
        p.club_id                                    AS club_id,
        p.user_id                                    AS user_id,
        SUM(p.amount)                                AS lifetime_gross,
        SUM(COALESCE(p.refund_amount, 0))            AS lifetime_refunds,
        SUM(p.amount - COALESCE(p.refund_amount, 0)) AS lifetime_spend,
        COUNT(*)                                     AS payments_count,
        MIN(p.currency)                              AS currency
    FROM payments p
    WHERE p.state IN ('succeeded', 'refunded', 'partially_refunded')
    GROUP BY p.club_id, p.user_id
),
membership AS (
    SELECT
        ms.club_id                                                        AS club_id,
        ms.user_id                                                        AS user_id,
        bool_or(ms.status = 'active' AND mp.price > 0)                    AS is_paid_member,
        MAX(mp.name) FILTER (WHERE ms.status = 'active' AND mp.price > 0) AS membership_plan_name
    FROM membership_subscriptions ms
    JOIN membership_plans mp ON mp.id = ms.plan_id
    GROUP BY ms.club_id, ms.user_id
),
keys AS (
    SELECT club_id, user_id FROM activity
    UNION
    SELECT club_id, user_id FROM spend
    UNION
    SELECT club_id, user_id FROM membership
)
SELECT
    k.club_id,
    k.user_id,
    a.first_played_at,
    a.last_played_at,
    COALESCE(a.bookings_played, 0)::bigint          AS bookings_played,
    COALESCE(a.played_last_30d, 0)::bigint          AS played_last_30d,
    COALESCE(a.played_last_90d, 0)::bigint          AS played_last_90d,
    COALESCE(s.lifetime_gross, 0)::numeric(12, 2)   AS lifetime_gross,
    COALESCE(s.lifetime_refunds, 0)::numeric(12, 2) AS lifetime_refunds,
    COALESCE(s.lifetime_spend, 0)::numeric(12, 2)   AS lifetime_spend,
    COALESCE(s.payments_count, 0)::bigint           AS payments_count,
    s.currency,
    COALESCE(m.is_paid_member, false)               AS is_paid_member,
    m.membership_plan_name
FROM keys k
LEFT JOIN activity   a ON a.club_id = k.club_id AND a.user_id = k.user_id
LEFT JOIN spend      s ON s.club_id = k.club_id AND s.user_id = k.user_id
LEFT JOIN membership m ON m.club_id = k.club_id AND m.user_id = k.user_id
"""

# Unique index required for REFRESH ... CONCURRENTLY; (club_id, user_id) is the
# natural unique key of the view.
_INDEX_SQL = (
    "CREATE UNIQUE INDEX ix_mv_player_value_key "
    "ON mv_player_value (club_id, user_id)"
)


def upgrade() -> None:
    op.execute(_VIEW_SQL)
    op.execute(_INDEX_SQL)


def downgrade() -> None:
    op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {_VIEW_NAME}")
