"""booking_credits_not_null

Revision ID: 2ea0416b9d4e
Revises: 07633e867b50
Create Date: 2026-05-08 14:46:37.149345

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2ea0416b9d4e'
down_revision: Union[str, None] = '07633e867b50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE membership_plans SET booking_credits_per_period = 0 WHERE booking_credits_per_period IS NULL")
    op.alter_column('membership_plans', 'booking_credits_per_period',
               existing_type=sa.INTEGER(),
               nullable=False,
               server_default='0')

    op.execute("UPDATE membership_subscriptions SET credits_remaining = 0 WHERE credits_remaining IS NULL")
    op.alter_column('membership_subscriptions', 'credits_remaining',
               existing_type=sa.INTEGER(),
               nullable=False,
               server_default='0')


def downgrade() -> None:
    op.alter_column('membership_subscriptions', 'credits_remaining',
               existing_type=sa.INTEGER(),
               nullable=True,
               server_default=None)
    op.alter_column('membership_plans', 'booking_credits_per_period',
               existing_type=sa.INTEGER(),
               nullable=True,
               server_default=None)
