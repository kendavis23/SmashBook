"""G4_payments_platform_fees_wallets_bookings

Revision ID: 8582075732fe
Revises: 62a903cfb227
Create Date: 2026-03-30 14:46:15.548928

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8582075732fe'
down_revision: Union[str, None] = '62a903cfb227'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums before columns that use them
    postgresql.ENUM('open', 'under_review', 'won', 'lost', name='disputestatus').create(op.get_bind())
    postgresql.ENUM('booking_fee', 'revenue_share', 'third_party_share', name='platformfeetype').create(op.get_bind())
    postgresql.ENUM('membership', 'campaign', 'promo_code', 'staff_manual', 'ai_gap_offer', name='discountsource').create(op.get_bind())

    op.create_table('platform_fees',
    sa.Column('tenant_id', sa.UUID(), nullable=False),
    sa.Column('payment_id', sa.UUID(), nullable=False),
    sa.Column('fee_type', postgresql.ENUM('booking_fee', 'revenue_share', 'third_party_share', name='platformfeetype', create_type=False), nullable=False),
    sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('pct_applied', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.add_column('bookings', sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('bookings', sa.Column('discount_source', postgresql.ENUM('membership', 'campaign', 'promo_code', 'staff_manual', 'ai_gap_offer', name='discountsource', create_type=False), nullable=True))
    op.add_column('bookings', sa.Column('membership_subscription_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_bookings_membership_subscription', 'bookings', 'membership_subscriptions', ['membership_subscription_id'], ['id'])

    # club_id added as nullable to allow safe backfill on existing rows
    op.add_column('payments', sa.Column('club_id', sa.UUID(), nullable=True))
    op.add_column('payments', sa.Column('failure_reason', sa.Text(), nullable=True))
    op.add_column('payments', sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('payments', sa.Column('next_retry_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('payments', sa.Column('anomaly_flagged', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('payments', sa.Column('anomaly_reason', sa.Text(), nullable=True))
    op.add_column('payments', sa.Column('dispute_status', postgresql.ENUM('open', 'under_review', 'won', 'lost', name='disputestatus', create_type=False), nullable=True))
    op.create_foreign_key('fk_payments_club', 'payments', 'clubs', ['club_id'], ['id'])

    op.add_column('wallets', sa.Column('auto_topup_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('wallets', sa.Column('auto_topup_threshold', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('wallets', sa.Column('auto_topup_amount', sa.Numeric(precision=10, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('wallets', 'auto_topup_amount')
    op.drop_column('wallets', 'auto_topup_threshold')
    op.drop_column('wallets', 'auto_topup_enabled')

    op.drop_constraint('fk_payments_club', 'payments', type_='foreignkey')
    op.drop_column('payments', 'dispute_status')
    op.drop_column('payments', 'anomaly_reason')
    op.drop_column('payments', 'anomaly_flagged')
    op.drop_column('payments', 'next_retry_at')
    op.drop_column('payments', 'retry_count')
    op.drop_column('payments', 'failure_reason')
    op.drop_column('payments', 'club_id')

    op.drop_constraint('fk_bookings_membership_subscription', 'bookings', type_='foreignkey')
    op.drop_column('bookings', 'membership_subscription_id')
    op.drop_column('bookings', 'discount_source')
    op.drop_column('bookings', 'discount_amount')

    op.drop_table('platform_fees')

    op.execute('DROP TYPE IF EXISTS discountsource')
    op.execute('DROP TYPE IF EXISTS platformfeetype')
    op.execute('DROP TYPE IF EXISTS disputestatus')
