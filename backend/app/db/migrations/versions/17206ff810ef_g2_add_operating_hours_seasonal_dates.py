"""G2_add_operating_hours_seasonal_dates

Revision ID: 17206ff810ef
Revises: 7f7915bed71a
Create Date: 2026-03-22 15:29:12.670431

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '17206ff810ef'
down_revision: Union[str, None] = '7f7915bed71a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('operating_hours', sa.Column('valid_from', sa.Date(), nullable=True))
    op.add_column('operating_hours', sa.Column('valid_until', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('operating_hours', 'valid_until')
    op.drop_column('operating_hours', 'valid_from')
