"""Add membership schema

Revision ID: a1b2c3d4e5f6
Revises: f4a5b6c7d8e9
Create Date: 2026-03-19 00:00:00.000000

Changes:
- Create membership_plans     — club-defined subscription tiers
- Create membership_subscriptions — player subscriptions to a plan
- Create membership_credit_logs — immutable audit log for credit/pass usage
- Add PostgreSQL ENUMs: billingperiod, membershipstatus, credittype
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f4a5b6c7d8e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# PostgreSQL ENUM types
billing_period_enum = postgresql.ENUM(
    "monthly", "annual",
    name="billingperiod",
    create_type=False,
)
membership_status_enum = postgresql.ENUM(
    "trialing", "active", "paused", "cancelled", "expired",
    name="membershipstatus",
    create_type=False,
)
credit_type_enum = postgresql.ENUM(
    "booking_credit", "guest_pass",
    name="credittype",
    create_type=False,
)


def upgrade() -> None:
    # --- ENUMs ---
    billing_period_enum.create(op.get_bind(), checkfirst=True)
    membership_status_enum.create(op.get_bind(), checkfirst=True)
    credit_type_enum.create(op.get_bind(), checkfirst=True)

    # --- membership_plans ---
    op.create_table(
        "membership_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clubs.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("billing_period", billing_period_enum, nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("trial_days", sa.Integer, nullable=False, server_default="0"),
        sa.Column("booking_credits_per_period", sa.Integer, nullable=True),
        sa.Column("guest_passes_per_period", sa.Integer, nullable=True),
        sa.Column("discount_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("priority_booking_days", sa.Integer, nullable=True),
        sa.Column("max_active_members", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("stripe_price_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_membership_plans_club_id", "membership_plans", ["club_id"])

    # --- membership_subscriptions ---
    op.create_table(
        "membership_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("membership_plans.id"), nullable=False),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clubs.id"), nullable=False),
        sa.Column("status", membership_status_enum, nullable=False, server_default="active"),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancel_at_period_end", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("credits_remaining", sa.Integer, nullable=True),
        sa.Column("guest_passes_remaining", sa.Integer, nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_membership_subscriptions_user_id", "membership_subscriptions", ["user_id"])
    op.create_index("ix_membership_subscriptions_club_status", "membership_subscriptions", ["club_id", "status"])

    # --- membership_credit_logs ---
    op.create_table(
        "membership_credit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "subscription_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("membership_subscriptions.id"),
            nullable=False,
        ),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bookings.id"), nullable=True),
        sa.Column("credit_type", credit_type_enum, nullable=False),
        sa.Column("delta", sa.Integer, nullable=False),
        sa.Column("balance_after", sa.Integer, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        "ix_membership_credit_logs_subscription_id",
        "membership_credit_logs",
        ["subscription_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_membership_credit_logs_subscription_id", table_name="membership_credit_logs")
    op.drop_table("membership_credit_logs")

    op.drop_index("ix_membership_subscriptions_club_status", table_name="membership_subscriptions")
    op.drop_index("ix_membership_subscriptions_user_id", table_name="membership_subscriptions")
    op.drop_table("membership_subscriptions")

    op.drop_index("ix_membership_plans_club_id", table_name="membership_plans")
    op.drop_table("membership_plans")

    credit_type_enum.drop(op.get_bind(), checkfirst=True)
    membership_status_enum.drop(op.get_bind(), checkfirst=True)
    billing_period_enum.drop(op.get_bind(), checkfirst=True)
