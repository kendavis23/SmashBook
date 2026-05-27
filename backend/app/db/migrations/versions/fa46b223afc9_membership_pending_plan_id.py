"""membership_pending_plan_id

Revision ID: fa46b223afc9
Revises: ac339fc8a081
Create Date: 2026-05-27 07:18:34.982384

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa46b223afc9'
down_revision: Union[str, None] = 'ac339fc8a081'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'membership_subscriptions',
        sa.Column('pending_plan_id', sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        'fk_membership_subscriptions_pending_plan_id',
        'membership_subscriptions',
        'membership_plans',
        ['pending_plan_id'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_membership_subscriptions_pending_plan_id',
        'membership_subscriptions',
        type_='foreignkey',
    )
    op.drop_column('membership_subscriptions', 'pending_plan_id')
