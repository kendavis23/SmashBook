"""booking_player discount fields

Revision ID: b7c8d9e0f1a2
Revises: a4b5c6d7e8f9
Create Date: 2026-05-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'a4b5c6d7e8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('booking_players', sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('booking_players', sa.Column(
        'discount_source',
        postgresql.ENUM('membership', 'campaign', 'promo_code', 'staff_manual', 'ai_gap_offer', name='discountsource', create_type=False),
        nullable=True,
    ))


def downgrade() -> None:
    op.drop_column('booking_players', 'discount_source')
    op.drop_column('booking_players', 'discount_amount')
