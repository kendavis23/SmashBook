"""fix datetime types and add indexes

Revision ID: b9e1f2a3c4d5
Revises: 4f3a53db6bd2
Create Date: 2026-03-01 00:00:00.000000

Changes:
- Convert String datetime columns to TIMESTAMPTZ (bookings, court_blackouts, users, equipment_rentals)
- Convert String time columns to TIME (trainer_availability)
- Convert all created_at/updated_at columns from TIMESTAMP to TIMESTAMPTZ
- Add UniqueConstraint(tenant_id, email) on users
- Add UniqueConstraint(booking_id, user_id) on booking_players
- Add indexes on bookings for court conflict detection and club dashboards
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b9e1f2a3c4d5"
down_revision: Union[str, None] = "4f3a53db6bd2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables that have created_at / updated_at from TimestampMixin
_TIMESTAMP_TABLES = [
    "tenants",
    "clubs",
    "users",
    "club_settings",
    "staff_profiles",
    "trainer_availability",
    "bookings",
    "booking_players",
    "equipment_inventory",
    "equipment_rentals",
    "skill_level_history",
    "wallets",
    "wallet_transactions",
    "payments",
    "invoices",
    "tenant_users",
]


def upgrade() -> None:
    # ── Convert String → TIMESTAMPTZ ────────────────────────────────────────

    for col in ("start_datetime", "end_datetime"):
        op.alter_column(
            "bookings",
            col,
            existing_type=sa.String(),
            type_=sa.DateTime(timezone=True),
            postgresql_using=f"{col}::timestamptz",
            nullable=False,
        )

    for col in ("start_datetime", "end_datetime"):
        op.alter_column(
            "court_blackouts",
            col,
            existing_type=sa.String(),
            type_=sa.DateTime(timezone=True),
            postgresql_using=f"{col}::timestamptz",
            nullable=False,
        )

    op.alter_column(
        "users",
        "skill_assigned_at",
        existing_type=sa.String(),
        type_=sa.DateTime(timezone=True),
        postgresql_using="skill_assigned_at::timestamptz",
        nullable=True,
    )

    op.alter_column(
        "equipment_rentals",
        "returned_at",
        existing_type=sa.String(),
        type_=sa.DateTime(timezone=True),
        postgresql_using="returned_at::timestamptz",
        nullable=True,
    )

    # ── Convert String → TIME ────────────────────────────────────────────────

    for col in ("start_time", "end_time"):
        op.alter_column(
            "trainer_availability",
            col,
            existing_type=sa.String(),
            type_=sa.Time(),
            postgresql_using=f"{col}::time",
            nullable=False,
        )

    # ── Convert TIMESTAMP → TIMESTAMPTZ for all audit columns ───────────────

    for table in _TIMESTAMP_TABLES:
        op.alter_column(
            table,
            "created_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            postgresql_using="created_at AT TIME ZONE 'UTC'",
            nullable=False,
        )
        op.alter_column(
            table,
            "updated_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            postgresql_using="updated_at AT TIME ZONE 'UTC'",
            nullable=False,
        )

    # ── Unique constraints ───────────────────────────────────────────────────

    op.create_unique_constraint("uq_users_tenant_email", "users", ["tenant_id", "email"])
    op.create_unique_constraint(
        "uq_booking_players_booking_user", "booking_players", ["booking_id", "user_id"]
    )

    # ── Indexes for court conflict detection and dashboard queries ───────────

    op.create_index(
        "ix_bookings_court_window",
        "bookings",
        ["court_id", "start_datetime", "end_datetime"],
    )
    op.create_index("ix_bookings_club_status", "bookings", ["club_id", "status"])
    op.create_index("ix_bookings_club_start", "bookings", ["club_id", "start_datetime"])


def downgrade() -> None:
    op.drop_index("ix_bookings_club_start", table_name="bookings")
    op.drop_index("ix_bookings_club_status", table_name="bookings")
    op.drop_index("ix_bookings_court_window", table_name="bookings")

    op.drop_constraint("uq_booking_players_booking_user", "booking_players", type_="unique")
    op.drop_constraint("uq_users_tenant_email", "users", type_="unique")

    for table in _TIMESTAMP_TABLES:
        op.alter_column(table, "created_at", existing_type=sa.DateTime(timezone=True), type_=sa.DateTime(), nullable=False)
        op.alter_column(table, "updated_at", existing_type=sa.DateTime(timezone=True), type_=sa.DateTime(), nullable=False)

    for col in ("start_time", "end_time"):
        op.alter_column("trainer_availability", col, existing_type=sa.Time(), type_=sa.String(), nullable=False)

    op.alter_column("equipment_rentals", "returned_at", existing_type=sa.DateTime(timezone=True), type_=sa.String(), nullable=True)
    op.alter_column("users", "skill_assigned_at", existing_type=sa.DateTime(timezone=True), type_=sa.String(), nullable=True)

    for col in ("start_datetime", "end_datetime"):
        op.alter_column("court_blackouts", col, existing_type=sa.DateTime(timezone=True), type_=sa.String(), nullable=False)

    for col in ("start_datetime", "end_datetime"):
        op.alter_column("bookings", col, existing_type=sa.DateTime(timezone=True), type_=sa.String(), nullable=False)
