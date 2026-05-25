"""tenant_trading_name_player_staff_subdomains

Adds `trading_name` (public-facing brand), renames `subdomain` to
`player_subdomain`, and adds `staff_subdomain` for the staff portal URL.

Backfill rules for existing rows:
- `trading_name` <- existing `name`
- `staff_subdomain` <- `<player_subdomain>-staff`  (placeholder; admins should
  patch this to the real staff subdomain after deploy)

Cross-row cross-column uniqueness (a string can appear in at most one of
`player_subdomain`/`staff_subdomain` across all tenants) is enforced in the
application layer (see app/api/v1/endpoints/admin.py). The CHECK constraint
below only enforces that the two values differ on the same row.

Revision ID: ac339fc8a081
Revises: 32204403280f
Create Date: 2026-05-25 13:19:56.073927

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac339fc8a081'
down_revision: Union[str, None] = '32204403280f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop the old uniqueness on subdomain so we can rename cleanly.
    op.drop_constraint('tenants_subdomain_key', 'tenants', type_='unique')

    # 2. Rename subdomain -> player_subdomain (preserves data).
    op.alter_column('tenants', 'subdomain', new_column_name='player_subdomain')

    # 3. trading_name: add nullable, backfill from name, then set NOT NULL.
    op.add_column('tenants', sa.Column('trading_name', sa.String(length=255), nullable=True))
    op.execute("UPDATE tenants SET trading_name = name WHERE trading_name IS NULL")
    op.alter_column('tenants', 'trading_name', nullable=False)

    # 4. staff_subdomain: add nullable, backfill with a deterministic placeholder,
    #    then set NOT NULL. Operators will patch the real value via PATCH /admin/tenants.
    op.add_column('tenants', sa.Column('staff_subdomain', sa.String(length=100), nullable=True))
    op.execute(
        "UPDATE tenants "
        "SET staff_subdomain = player_subdomain || '-staff' "
        "WHERE staff_subdomain IS NULL"
    )
    op.alter_column('tenants', 'staff_subdomain', nullable=False)

    # 5. Re-add unique constraints with explicit names.
    op.create_unique_constraint('tenants_player_subdomain_key', 'tenants', ['player_subdomain'])
    op.create_unique_constraint('tenants_staff_subdomain_key', 'tenants', ['staff_subdomain'])

    # 6. CHECK: same row's player and staff subdomains must differ.
    op.create_check_constraint(
        'tenants_player_staff_subdomain_distinct',
        'tenants',
        'player_subdomain <> staff_subdomain',
    )


def downgrade() -> None:
    op.drop_constraint('tenants_player_staff_subdomain_distinct', 'tenants', type_='check')
    op.drop_constraint('tenants_staff_subdomain_key', 'tenants', type_='unique')
    op.drop_column('tenants', 'staff_subdomain')
    op.drop_column('tenants', 'trading_name')
    op.drop_constraint('tenants_player_subdomain_key', 'tenants', type_='unique')
    op.alter_column('tenants', 'player_subdomain', new_column_name='subdomain')
    op.create_unique_constraint('tenants_subdomain_key', 'tenants', ['subdomain'])
