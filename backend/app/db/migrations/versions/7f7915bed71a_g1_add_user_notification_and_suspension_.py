"""g1_add_user_notification_and_suspension_fields

Revision ID: 7f7915bed71a
Revises: b2c3d4e5f6a1
Create Date: 2026-03-21 20:34:28.033796

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '7f7915bed71a'
down_revision: Union[str, None] = 'b2c3d4e5f6a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the NotificationChannel enum type before using it
    notificationchannel = postgresql.ENUM('push', 'email', 'sms', 'in_app', name='notificationchannel')
    notificationchannel.create(op.get_bind())

    op.add_column('users', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('photo_url', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('is_suspended', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('suspension_reason', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('default_payment_method_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column(
        'preferred_notification_channel',
        sa.Enum('push', 'email', 'sms', 'in_app', name='notificationchannel'),
        nullable=False,
        server_default='push',
    ))


def downgrade() -> None:
    op.drop_column('users', 'preferred_notification_channel')
    op.drop_column('users', 'default_payment_method_id')
    op.drop_column('users', 'suspension_reason')
    op.drop_column('users', 'is_suspended')
    op.drop_column('users', 'photo_url')
    op.drop_column('users', 'phone')
    op.execute('DROP TYPE IF EXISTS notificationchannel')
