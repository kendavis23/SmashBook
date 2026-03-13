"""pricing rule discount and dynamic pricing

Revision ID: c1d2e3f4a5b6
Revises: b9e1f2a3c4d5
Create Date: 2026-03-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = 'b9e1f2a3c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('pricing_rules', sa.Column('discounted_price', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('pricing_rules', sa.Column('surge_max_pct', sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column('pricing_rules', sa.Column('low_demand_min_pct', sa.Numeric(precision=5, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('pricing_rules', 'low_demand_min_pct')
    op.drop_column('pricing_rules', 'surge_max_pct')
    op.drop_column('pricing_rules', 'discounted_price')
