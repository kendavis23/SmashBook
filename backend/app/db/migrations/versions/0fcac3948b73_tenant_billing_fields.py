"""tenant_billing_fields

Revision ID: 0fcac3948b73
Revises: 3a758d32ab8d
Create Date: 2026-05-16 16:39:26.392249

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0fcac3948b73'
down_revision: Union[str, None] = '3a758d32ab8d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the SubscriptionStatus enum type before using it
    subscription_status = postgresql.ENUM(
        'trialing', 'active', 'past_due', 'canceled', 'suspended',
        name='subscriptionstatus',
    )
    subscription_status.create(op.get_bind())

    op.add_column('subscription_plans', sa.Column('stripe_price_id', sa.String(length=255), nullable=True))
    op.add_column('tenants', sa.Column('stripe_customer_id', sa.String(length=255), nullable=True))
    op.add_column('tenants', sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True))
    op.add_column('tenants', sa.Column(
        'subscription_status',
        sa.Enum('trialing', 'active', 'past_due', 'canceled', 'suspended', name='subscriptionstatus'),
        nullable=True,
    ))


def downgrade() -> None:
    op.drop_column('tenants', 'subscription_status')
    op.drop_column('tenants', 'stripe_subscription_id')
    op.drop_column('tenants', 'stripe_customer_id')
    op.drop_column('subscription_plans', 'stripe_price_id')
    op.execute('DROP TYPE IF EXISTS subscriptionstatus')
