"""create revenue_by_club materialized views

Revision ID: a04c76851993
Revises: b210c7b03579
Create Date: 2026-06-01 17:32:45.244606

Two parallel materialized views backing the "Financials by club" report
(G7 analytics). Identical schema; they differ only in which timestamp anchors
the club-local revenue_date bucket:

  * mv_revenue_by_club_day_service  -> bookings.start_datetime  (when the court
    time is delivered; "service"/accrual basis)
  * mv_revenue_by_club_day_cash     -> payments.created_at       (when the money
    actually moved; "cash" basis)

A single MV cannot carry two bucket dates without exploding cardinality, so we
keep two single-table views and let the API pick one via ?basis=service|cash.

Revenue attribution (subtract-embedded, locked 2026-06-01):
Equipment charges are NOT separate payments -- equipment_service adds
EquipmentRental.charge to the requesting player's BookingPlayer.amount_due, and
payment.amount == amount_due. So payments.amount already includes equipment. To
keep all six revenue types while having SUM(types) == SUM(payments.amount):

  equipment_portion(p) = SUM(equipment_rentals.charge) for rentals either
      explicitly linked (er.payment_id = p.id) or embedded in the same
      (booking_id, user_id) payment (er.payment_id IS NULL).
  court_portion(p)     = GREATEST(p.amount - equipment_portion(p), 0)

Refunds are attributed entirely to the booking-type (court) portion; the
equipment row carries refund_amount = 0. Membership MRR is intentionally
EXCLUDED (Stripe-only, no local payments row) -- totals are "transactional
revenue". Adding membership later is one more UNION branch, no schema change.

Hand-written DDL: materialized views are not ORM models, so autogenerate
produces nothing for them. The unique index on each view is required for
REFRESH MATERIALIZED VIEW ... CONCURRENTLY.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a04c76851993'
down_revision: Union[str, None] = 'b210c7b03579'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# The two views are identical except for the timestamp that anchors the
# club-local revenue_date. {bucket_ts} is substituted per view.
_VIEW_SQL = """
CREATE MATERIALIZED VIEW {view_name} AS
WITH paid AS (
    SELECT
        p.id                          AS payment_id,
        p.club_id                     AS club_id,
        p.amount                      AS amount,
        COALESCE(p.refund_amount, 0)  AS refund_amount,
        p.currency                    AS currency,
        b.booking_type::text          AS booking_type,
        ({bucket_ts} AT TIME ZONE c.timezone)::date AS revenue_date,
        COALESCE((
            SELECT SUM(er.charge)
            FROM equipment_rentals er
            WHERE er.payment_id = p.id
               OR (er.payment_id IS NULL
                   AND er.booking_id = p.booking_id
                   AND er.user_id = p.user_id)
        ), 0) AS equipment_amount
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN clubs    c ON c.id = p.club_id
    WHERE p.state IN ('succeeded', 'refunded', 'partially_refunded')
),
typed_rows AS (
    -- court / booking-type portion (payment.amount minus embedded equipment)
    SELECT
        club_id,
        revenue_date,
        booking_type                          AS revenue_type,
        currency,
        GREATEST(amount - equipment_amount, 0)                  AS gross_amount,
        refund_amount                                           AS refund_amount,
        GREATEST(amount - equipment_amount, 0) - refund_amount  AS net_amount,
        1                                                       AS transaction_count
    FROM paid
    UNION ALL
    -- equipment portion (own revenue_type; refunds not attributed here)
    SELECT
        club_id,
        revenue_date,
        'equipment'      AS revenue_type,
        currency,
        equipment_amount AS gross_amount,
        0                AS refund_amount,
        equipment_amount AS net_amount,
        1                AS transaction_count
    FROM paid
    WHERE equipment_amount > 0
)
SELECT
    club_id,
    revenue_date,
    revenue_type,
    currency,
    SUM(gross_amount)::numeric(12, 2)  AS gross_amount,
    SUM(refund_amount)::numeric(12, 2) AS refund_amount,
    SUM(net_amount)::numeric(12, 2)    AS net_amount,
    SUM(transaction_count)::bigint     AS transaction_count
FROM typed_rows
GROUP BY club_id, revenue_date, revenue_type, currency
"""

# Unique index required for REFRESH ... CONCURRENTLY. The GROUP BY key is the
# natural unique key of each view.
_INDEX_SQL = (
    "CREATE UNIQUE INDEX {index_name} "
    "ON {view_name} (club_id, revenue_date, revenue_type, currency)"
)

_VIEWS = {
    "mv_revenue_by_club_day_service": "b.start_datetime",
    "mv_revenue_by_club_day_cash": "p.created_at",
}


def upgrade() -> None:
    for view_name, bucket_ts in _VIEWS.items():
        op.execute(_VIEW_SQL.format(view_name=view_name, bucket_ts=bucket_ts))
        op.execute(
            _INDEX_SQL.format(
                index_name=f"ix_{view_name}_key",
                view_name=view_name,
            )
        )


def downgrade() -> None:
    for view_name in _VIEWS:
        op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {view_name}")
