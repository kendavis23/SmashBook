"""remove_skill_filter_reservation_type

Revision ID: f80daf1c4ecb
Revises: 1065b10c5c74
Create Date: 2026-04-20 14:56:25.541191

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f80daf1c4ecb'
down_revision: Union[str, None] = '1065b10c5c74'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('calendar_reservations', 'skill_range_above')
    op.drop_column('calendar_reservations', 'anchor_skill_level')
    op.drop_column('calendar_reservations', 'skill_range_below')

    # Remove skill_filter from the calendarreservationtype enum.
    # PostgreSQL doesn't support DROP VALUE, so we rename, recreate, migrate, drop old.
    op.execute("DELETE FROM calendar_reservations WHERE reservation_type = 'skill_filter'")
    op.execute("ALTER TYPE calendarreservationtype RENAME TO calendarreservationtype_old")
    op.execute("CREATE TYPE calendarreservationtype AS ENUM ('training_block', 'private_hire', 'maintenance', 'tournament_hold')")
    op.execute("""
        ALTER TABLE calendar_reservations
        ALTER COLUMN reservation_type TYPE calendarreservationtype
        USING reservation_type::text::calendarreservationtype
    """)
    op.execute("DROP TYPE calendarreservationtype_old")


def downgrade() -> None:
    op.add_column('calendar_reservations', sa.Column('skill_range_below', sa.NUMERIC(precision=3, scale=1), autoincrement=False, nullable=True))
    op.add_column('calendar_reservations', sa.Column('anchor_skill_level', sa.NUMERIC(precision=3, scale=1), autoincrement=False, nullable=True))
    op.add_column('calendar_reservations', sa.Column('skill_range_above', sa.NUMERIC(precision=3, scale=1), autoincrement=False, nullable=True))

    op.execute("ALTER TYPE calendarreservationtype RENAME TO calendarreservationtype_old")
    op.execute("CREATE TYPE calendarreservationtype AS ENUM ('skill_filter', 'training_block', 'private_hire', 'maintenance', 'tournament_hold')")
    op.execute("""
        ALTER TABLE calendar_reservations
        ALTER COLUMN reservation_type TYPE calendarreservationtype
        USING reservation_type::text::calendarreservationtype
    """)
    op.execute("DROP TYPE calendarreservationtype_old")
