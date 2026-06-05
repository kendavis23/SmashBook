"""pricing_rules_label_enum

Revision ID: da94effd108c
Revises: 4d439313634d
Create Date: 2026-06-05 13:51:35.309047

Converts pricing_rules.label from free-text VARCHAR(50) to a fixed
`pricinglabel` Postgres enum ('peak', 'off_peak', 'standard').

Legacy free-text labels are remapped by time-of-day semantics before the
type is tightened:
  off_peak <- 'Off-Peak', 'Wknd AM'
  peak     <- 'Peak', 'Evening', 'Weekend', 'Wknd PM', 'Wknd Eve'
  standard <- any other previous value (catch-all)
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'da94effd108c'
down_revision: Union[str, None] = '4d439313634d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the enum type before the column can reference it.
    pricinglabel = postgresql.ENUM('peak', 'off_peak', 'standard', name='pricinglabel')
    pricinglabel.create(op.get_bind())

    # 2. Remap legacy free-text labels to the fixed set (time-of-day semantics).
    op.execute(
        "UPDATE pricing_rules SET label = 'off_peak' "
        "WHERE label IN ('Off-Peak', 'Wknd AM')"
    )
    op.execute(
        "UPDATE pricing_rules SET label = 'peak' "
        "WHERE label IN ('Peak', 'Evening', 'Weekend', 'Wknd PM', 'Wknd Eve')"
    )
    # Catch-all: anything not already mapped collapses to 'standard'.
    op.execute(
        "UPDATE pricing_rules SET label = 'standard' "
        "WHERE label NOT IN ('peak', 'off_peak')"
    )

    # 3. Tighten the column type now that every row holds a valid value.
    op.execute(
        "ALTER TABLE pricing_rules ALTER COLUMN label "
        "TYPE pricinglabel USING label::pricinglabel"
    )


def downgrade() -> None:
    # Revert to free text. The remapped values remain (the original free-text
    # labels are not recoverable), but the column is no longer constrained.
    op.execute(
        "ALTER TABLE pricing_rules ALTER COLUMN label "
        "TYPE VARCHAR(50) USING label::text"
    )
    op.execute("DROP TYPE IF EXISTS pricinglabel")
