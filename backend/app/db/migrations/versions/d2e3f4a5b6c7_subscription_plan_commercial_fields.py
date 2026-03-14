"""subscription plan commercial fields

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-03-14 00:00:00.000000

Adds commercial/pricing fields to subscription_plans:
- max_staff_users: staff seat cap per tenant (-1 = unlimited)
- white_label_enabled: platform white-labelling toggle
- analytics_enabled: advanced reporting toggle
- setup_fee: one-time onboarding charge
- trial_days: free trial length in days
- booking_fee_pct: % taken from each court booking
- revenue_share_pct: % of total club revenue
- third_party_revenue_share_pct: % of 3rd-party revenue (lessons, retail, etc.)
- overage_fee_per_booking: flat fee charged when booking limits are exceeded
- max_api_calls_per_month: API rate limit (NULL = unlimited)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Feature flags
    op.add_column("subscription_plans", sa.Column("max_staff_users", sa.Integer(), nullable=False, server_default="-1"))
    op.add_column("subscription_plans", sa.Column("white_label_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("subscription_plans", sa.Column("analytics_enabled", sa.Boolean(), nullable=False, server_default="false"))

    # Pricing
    op.add_column("subscription_plans", sa.Column("setup_fee", sa.Numeric(precision=10, scale=2), nullable=False, server_default="0"))
    op.add_column("subscription_plans", sa.Column("trial_days", sa.Integer(), nullable=False, server_default="0"))

    # Revenue share / transaction fees
    op.add_column("subscription_plans", sa.Column("booking_fee_pct", sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column("subscription_plans", sa.Column("revenue_share_pct", sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column("subscription_plans", sa.Column("third_party_revenue_share_pct", sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column("subscription_plans", sa.Column("overage_fee_per_booking", sa.Numeric(precision=10, scale=2), nullable=True))

    # API limits
    op.add_column("subscription_plans", sa.Column("max_api_calls_per_month", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("subscription_plans", "max_api_calls_per_month")
    op.drop_column("subscription_plans", "overage_fee_per_booking")
    op.drop_column("subscription_plans", "third_party_revenue_share_pct")
    op.drop_column("subscription_plans", "revenue_share_pct")
    op.drop_column("subscription_plans", "booking_fee_pct")
    op.drop_column("subscription_plans", "trial_days")
    op.drop_column("subscription_plans", "setup_fee")
    op.drop_column("subscription_plans", "analytics_enabled")
    op.drop_column("subscription_plans", "white_label_enabled")
    op.drop_column("subscription_plans", "max_staff_users")
