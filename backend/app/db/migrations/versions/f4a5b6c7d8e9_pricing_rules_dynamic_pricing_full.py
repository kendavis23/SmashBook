"""pricing_rules: full dynamic pricing support

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-03-15 00:00:00.000000

Changes to pricing_rules:
- Rename discounted_price → incentive_price (flat promotional override)
- Add surge_trigger_pct   — utilization % at which surge pricing activates
- Add low_demand_trigger_pct — utilization % below which discount activates
- Add incentive_label     — human-readable name for the incentive (e.g. "Happy Hour")
- Add incentive_expires_at — when the flat incentive price expires (null = indefinite)
- Add valid_from / valid_until — optional date range for seasonal rules (null = always active)
- Add is_active           — soft-disable a rule without deleting it
- Add created_at / updated_at — audit timestamps (mirrors TimestampMixin)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f4a5b6c7d8e9"
down_revision: Union[str, None] = "e3f4a5b6c7d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename discounted_price → incentive_price
    op.alter_column("pricing_rules", "discounted_price", new_column_name="incentive_price")

    # Surge pricing trigger
    op.add_column(
        "pricing_rules",
        sa.Column("surge_trigger_pct", sa.Numeric(5, 2), nullable=True),
    )

    # Low-demand pricing trigger
    op.add_column(
        "pricing_rules",
        sa.Column("low_demand_trigger_pct", sa.Numeric(5, 2), nullable=True),
    )

    # Incentive metadata
    op.add_column(
        "pricing_rules",
        sa.Column("incentive_label", sa.String(100), nullable=True),
    )
    op.add_column(
        "pricing_rules",
        sa.Column("incentive_expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Seasonal date range
    op.add_column(
        "pricing_rules",
        sa.Column("valid_from", sa.Date(), nullable=True),
    )
    op.add_column(
        "pricing_rules",
        sa.Column("valid_until", sa.Date(), nullable=True),
    )

    # Soft-disable flag
    op.add_column(
        "pricing_rules",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    # Audit timestamps
    op.add_column(
        "pricing_rules",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.add_column(
        "pricing_rules",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_column("pricing_rules", "updated_at")
    op.drop_column("pricing_rules", "created_at")
    op.drop_column("pricing_rules", "is_active")
    op.drop_column("pricing_rules", "valid_until")
    op.drop_column("pricing_rules", "valid_from")
    op.drop_column("pricing_rules", "incentive_expires_at")
    op.drop_column("pricing_rules", "incentive_label")
    op.drop_column("pricing_rules", "low_demand_trigger_pct")
    op.drop_column("pricing_rules", "surge_trigger_pct")
    op.alter_column("pricing_rules", "incentive_price", new_column_name="discounted_price")
