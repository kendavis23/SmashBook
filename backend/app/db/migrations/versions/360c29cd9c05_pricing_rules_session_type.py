"""pricing_rules_session_type

Revision ID: 360c29cd9c05
Revises: da94effd108c
Create Date: 2026-06-05 17:28:11.800697

Adds the activity dimension to pricing rules: a `session_type` column on
`pricing_rules` keyed on the existing `bookingtype` enum, so a club can price
each session type (regular match, individual/group lesson, train-and-play)
independently within the same time window.

Two-part change:
  1. Extend the existing `bookingtype` enum with `train_and_play`. ADD VALUE
     must be committed before the type is used, and cannot run inside the
     migration's transaction block — so it runs in an autocommit_block().
  2. Add `pricing_rules.session_type` referencing the (already existing)
     `bookingtype` type with create_type=False, server_default='regular' so
     every existing row backfills to regular-match pricing.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '360c29cd9c05'
down_revision: Union[str, None] = 'da94effd108c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add the new enum value in its own committed step (outside the
    #    migration transaction). IF NOT EXISTS keeps the migration idempotent.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE bookingtype ADD VALUE IF NOT EXISTS 'train_and_play'")

    # 2. Add the column referencing the existing bookingtype type. create_type
    #    must be False — the type already exists (it backs bookings.booking_type).
    bookingtype = postgresql.ENUM(name="bookingtype", create_type=False)
    op.add_column(
        "pricing_rules",
        sa.Column(
            "session_type",
            bookingtype,
            server_default="regular",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("pricing_rules", "session_type")
    # Note: Postgres cannot DROP a value from an enum type, so 'train_and_play'
    # remains on the bookingtype enum after downgrade. This is harmless and
    # standard — the value is simply unused by pricing_rules again.
