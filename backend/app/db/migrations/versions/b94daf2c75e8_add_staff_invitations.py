"""add_staff_invitations

Revision ID: b94daf2c75e8
Revises: 360c29cd9c05
Create Date: 2026-06-10 08:37:00.289182

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b94daf2c75e8'
down_revision: Union[str, None] = '360c29cd9c05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # `staffrole` already exists (used by staff_profiles) — reuse it with
    # create_type=False. Only the invitation-status enum is net-new.
    status_enum = postgresql.ENUM(
        'pending', 'accepted', 'revoked', 'expired',
        name='staffinvitationstatus',
    )
    status_enum.create(op.get_bind())

    op.create_table('staff_invitations',
    sa.Column('tenant_id', sa.UUID(), nullable=False),
    sa.Column('club_id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('role', postgresql.ENUM('trainer', 'ops_lead', 'admin', 'front_desk', name='staffrole', create_type=False), nullable=False),
    sa.Column('invited_by_user_id', sa.UUID(), nullable=False),
    sa.Column('status', postgresql.ENUM('pending', 'accepted', 'revoked', 'expired', name='staffinvitationstatus', create_type=False), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('accepted_user_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['accepted_user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ),
    sa.ForeignKeyConstraint(['invited_by_user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_staff_invitations_club_email', 'staff_invitations', ['club_id', 'email'], unique=False)
    op.create_index('ix_staff_invitations_tenant_id', 'staff_invitations', ['tenant_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_staff_invitations_tenant_id', table_name='staff_invitations')
    op.drop_index('ix_staff_invitations_club_email', table_name='staff_invitations')
    op.drop_table('staff_invitations')
    # `staffrole` is shared with staff_profiles — do NOT drop it here.
    op.execute('DROP TYPE IF EXISTS staffinvitationstatus')
