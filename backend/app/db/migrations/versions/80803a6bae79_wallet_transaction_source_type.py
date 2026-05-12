"""wallet_transaction_source_type

Revision ID: 80803a6bae79
Revises: b7c8d9e0f1a2
Create Date: 2026-05-12 18:57:04.319621

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '80803a6bae79'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

wallettransactionsource = postgresql.ENUM(
    'booking', 'membership', 'invoice', 'manual',
    name='wallettransactionsource',
)


def upgrade() -> None:
    wallettransactionsource.create(op.get_bind())
    op.add_column('wallet_transactions', sa.Column('source_type', sa.Enum('booking', 'membership', 'invoice', 'manual', name='wallettransactionsource'), nullable=True))
    op.add_column('wallet_transactions', sa.Column('source_id', sa.UUID(), nullable=True))


def downgrade() -> None:
    op.drop_column('wallet_transactions', 'source_id')
    op.drop_column('wallet_transactions', 'source_type')
    op.execute('DROP TYPE IF EXISTS wallettransactionsource')
