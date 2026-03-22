"""g3_booking_skill_invite_waitlist

Revision ID: 62a903cfb227
Revises: 17206ff810ef
Create Date: 2026-03-22 21:27:27.530458

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '62a903cfb227'
down_revision: Union[str, None] = '17206ff810ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types explicitly before use — required when adding to existing tables
    # or when create_type auto-detection is unreliable with asyncpg.
    op.execute("CREATE TYPE invitestatus AS ENUM ('pending', 'accepted', 'declined')")
    op.execute("CREATE TYPE waitliststatus AS ENUM ('waiting', 'offered', 'booked', 'expired')")

    invite_enum = postgresql.ENUM('pending', 'accepted', 'declined', name='invitestatus', create_type=False)
    waitlist_enum = postgresql.ENUM('waiting', 'offered', 'booked', 'expired', name='waitliststatus', create_type=False)

    op.create_table('waitlist_entries',
    sa.Column('club_id', sa.UUID(), nullable=False),
    sa.Column('court_id', sa.UUID(), nullable=True),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('desired_date', sa.Date(), nullable=False),
    sa.Column('desired_start_time', sa.Time(), nullable=True),
    sa.Column('desired_end_time', sa.Time(), nullable=True),
    sa.Column('status', waitlist_enum, nullable=False),
    sa.Column('offered_booking_id', sa.UUID(), nullable=True),
    sa.Column('offer_expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('notified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ),
    sa.ForeignKeyConstraint(['court_id'], ['courts.id'], ),
    sa.ForeignKeyConstraint(['offered_booking_id'], ['bookings.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.add_column('booking_players', sa.Column('invite_status', invite_enum, nullable=False, server_default='accepted'))
    op.add_column('bookings', sa.Column('min_skill_level', sa.Numeric(precision=3, scale=1), nullable=True))
    op.add_column('bookings', sa.Column('max_skill_level', sa.Numeric(precision=3, scale=1), nullable=True))


def downgrade() -> None:
    op.drop_column('bookings', 'max_skill_level')
    op.drop_column('bookings', 'min_skill_level')
    op.drop_column('booking_players', 'invite_status')
    op.execute('DROP TYPE IF EXISTS invitestatus')
    op.drop_table('waitlist_entries')
    op.execute('DROP TYPE IF EXISTS waitliststatus')
