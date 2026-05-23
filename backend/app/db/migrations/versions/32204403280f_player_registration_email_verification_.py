"""player_registration_email_verification_and_default_membership_plan

Revision ID: 32204403280f
Revises: a3ad99663232
Create Date: 2026-05-23 14:13:52.178944

Adds:
- users.email_verified_at — nullable timestamp set when the player clicks the
  email verification link. Login is blocked while NULL. Existing users are
  back-filled to NOW() so the new login gate doesn't lock anyone out on deploy.
- membership_plans.is_default — boolean flag marking the free basic plan
  auto-assigned to a player on email verification. Partial unique index ensures
  at most one default plan per club.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '32204403280f'
down_revision: Union[str, None] = 'a3ad99663232'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users.email_verified_at — nullable; back-fill existing rows to NOW() so
    # the new login gate doesn't reject any pre-existing user on first deploy.
    op.add_column(
        'users',
        sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL")

    # membership_plans.is_default — NOT NULL with server_default so existing rows
    # get a defined value. Partial unique index enforces ≤1 default plan per club.
    op.add_column(
        'membership_plans',
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(
        'uq_membership_plans_one_default_per_club',
        'membership_plans',
        ['club_id'],
        unique=True,
        postgresql_where=sa.text('is_default'),
    )


def downgrade() -> None:
    op.drop_index(
        'uq_membership_plans_one_default_per_club',
        table_name='membership_plans',
        postgresql_where=sa.text('is_default'),
    )
    op.drop_column('membership_plans', 'is_default')
    op.drop_column('users', 'email_verified_at')
