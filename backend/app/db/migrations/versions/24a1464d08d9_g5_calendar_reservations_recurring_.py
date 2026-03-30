"""g5_calendar_reservations_recurring_bookings_equipment_updates

Revision ID: 24a1464d08d9
Revises: 8582075732fe
Create Date: 2026-03-30 16:24:02.970820

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '24a1464d08d9'
down_revision: Union[str, None] = '8582075732fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_calendar_reservation_type = postgresql.ENUM(
    'skill_filter', 'training_block', 'private_hire', 'maintenance', 'tournament_hold',
    name='calendarreservationtype',
)


def upgrade() -> None:
    _calendar_reservation_type.create(op.get_bind())

    op.create_table('calendar_reservations',
    sa.Column('club_id', sa.UUID(), nullable=False),
    sa.Column('court_id', sa.UUID(), nullable=True),
    sa.Column('reservation_type', postgresql.ENUM(
        'skill_filter', 'training_block', 'private_hire', 'maintenance', 'tournament_hold',
        name='calendarreservationtype', create_type=False,
    ), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('start_datetime', sa.DateTime(timezone=True), nullable=False),
    sa.Column('end_datetime', sa.DateTime(timezone=True), nullable=False),
    sa.Column('anchor_skill_level', sa.Numeric(precision=3, scale=1), nullable=True),
    sa.Column('skill_range_above', sa.Numeric(precision=3, scale=1), nullable=True),
    sa.Column('skill_range_below', sa.Numeric(precision=3, scale=1), nullable=True),
    sa.Column('allowed_booking_types', postgresql.ARRAY(sa.String()), nullable=True),
    sa.Column('is_recurring', sa.Boolean(), nullable=False),
    sa.Column('recurrence_rule', sa.Text(), nullable=True),
    sa.Column('recurrence_end_date', sa.Date(), nullable=True),
    sa.Column('created_by', sa.UUID(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ),
    sa.ForeignKeyConstraint(['court_id'], ['courts.id'], ),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.add_column('bookings', sa.Column('recurrence_end_date', sa.Date(), nullable=True))
    op.add_column('bookings', sa.Column('parent_booking_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_bookings_parent_booking', 'bookings', 'bookings', ['parent_booking_id'], ['id'])
    op.add_column('clubs', sa.Column('default_skill_range_above', sa.Numeric(precision=3, scale=1), nullable=False, server_default='0.5'))
    op.add_column('clubs', sa.Column('default_skill_range_below', sa.Numeric(precision=3, scale=1), nullable=False, server_default='1.0'))
    op.add_column('equipment_inventory', sa.Column('reorder_threshold', sa.Integer(), nullable=True))
    op.add_column('equipment_rentals', sa.Column('payment_status', sa.Enum('pending', 'paid', 'refunded', name='paymentstatus'), nullable=True))
    op.add_column('equipment_rentals', sa.Column('payment_id', sa.UUID(), nullable=True))
    op.add_column('equipment_rentals', sa.Column('damage_charge', sa.Numeric(precision=10, scale=2), nullable=True))
    op.create_foreign_key('fk_equipment_rentals_payment', 'equipment_rentals', 'payments', ['payment_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_equipment_rentals_payment', 'equipment_rentals', type_='foreignkey')
    op.drop_column('equipment_rentals', 'damage_charge')
    op.drop_column('equipment_rentals', 'payment_id')
    op.drop_column('equipment_rentals', 'payment_status')
    op.drop_column('equipment_inventory', 'reorder_threshold')
    op.drop_column('clubs', 'default_skill_range_below')
    op.drop_column('clubs', 'default_skill_range_above')
    op.drop_constraint('fk_bookings_parent_booking', 'bookings', type_='foreignkey')
    op.drop_column('bookings', 'parent_booking_id')
    op.drop_column('bookings', 'recurrence_end_date')
    op.drop_table('calendar_reservations')
    _calendar_reservation_type.drop(op.get_bind())
