"""Simplify schema

Revision ID: c1d2e3f4a5b6
Revises: a1b2c3d4e5f6
Create Date: 2026-03-20 00:00:00.000000

Changes:
- Merge club_settings into clubs (drop club_settings table)
- Drop trainer_availability.club_id (derivable via staff_profile_id)
- Merge tenant_users into users.role (drop tenant_users table)
- Merge invoices into payments (drop invoices table)
- Drop skill_level_history.club_id (skill is tenant-scoped on users)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b2c3d4e5f6a1"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

tenant_user_role = sa.Enum(
    "owner", "admin", "staff", "trainer", "ops_lead", "viewer", "player",
    name="tenantuserrole",
)


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # 1. Merge club_settings → clubs                                       #
    # ------------------------------------------------------------------ #
    op.add_column("clubs", sa.Column("booking_duration_minutes", sa.Integer(), nullable=False, server_default="90"))
    op.add_column("clubs", sa.Column("max_advance_booking_days", sa.Integer(), nullable=False, server_default="14"))
    op.add_column("clubs", sa.Column("min_booking_notice_hours", sa.Integer(), nullable=False, server_default="2"))
    op.add_column("clubs", sa.Column("max_bookings_per_player_per_week", sa.Integer(), nullable=True))
    op.add_column("clubs", sa.Column("skill_level_min", sa.Numeric(precision=3, scale=1), nullable=False, server_default="1.0"))
    op.add_column("clubs", sa.Column("skill_level_max", sa.Numeric(precision=3, scale=1), nullable=False, server_default="7.0"))
    op.add_column("clubs", sa.Column("skill_range_allowed", sa.Numeric(precision=3, scale=1), nullable=False, server_default="1.5"))
    op.add_column("clubs", sa.Column("open_games_enabled", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("clubs", sa.Column("min_players_to_confirm", sa.Integer(), nullable=False, server_default="4"))
    op.add_column("clubs", sa.Column("auto_cancel_hours_before", sa.Integer(), nullable=True))
    op.add_column("clubs", sa.Column("cancellation_notice_hours", sa.Integer(), nullable=False, server_default="48"))
    op.add_column("clubs", sa.Column("cancellation_refund_pct", sa.Integer(), nullable=False, server_default="100"))
    op.add_column("clubs", sa.Column("reminder_hours_before", sa.Integer(), nullable=False, server_default="24"))
    op.add_column("clubs", sa.Column("waitlist_enabled", sa.Boolean(), nullable=False, server_default="true"))

    # Copy existing settings values into clubs before dropping the table
    op.execute("""
        UPDATE clubs c
        SET
            booking_duration_minutes     = cs.booking_duration_minutes,
            max_advance_booking_days     = cs.max_advance_booking_days,
            min_booking_notice_hours     = cs.min_booking_notice_hours,
            max_bookings_per_player_per_week = cs.max_bookings_per_player_per_week,
            skill_level_min              = cs.skill_level_min,
            skill_level_max              = cs.skill_level_max,
            skill_range_allowed          = cs.skill_range_allowed,
            open_games_enabled           = cs.open_games_enabled,
            min_players_to_confirm       = cs.min_players_to_confirm,
            auto_cancel_hours_before     = cs.auto_cancel_hours_before,
            cancellation_notice_hours    = cs.cancellation_notice_hours,
            cancellation_refund_pct      = cs.cancellation_refund_pct,
            reminder_hours_before        = cs.reminder_hours_before,
            waitlist_enabled             = cs.waitlist_enabled
        FROM club_settings cs
        WHERE cs.club_id = c.id
    """)

    op.drop_table("club_settings")

    # ------------------------------------------------------------------ #
    # 2. Drop trainer_availability.club_id                                 #
    # ------------------------------------------------------------------ #
    op.drop_constraint("trainer_availability_club_id_fkey", "trainer_availability", type_="foreignkey")
    op.drop_column("trainer_availability", "club_id")

    # ------------------------------------------------------------------ #
    # 3. Merge tenant_users → users.role                                   #
    # ------------------------------------------------------------------ #
    op.add_column("users", sa.Column("role", tenant_user_role, nullable=True))

    # Copy roles from tenant_users; default to 'player' for any user without a record
    op.execute("""
        UPDATE users u
        SET role = tu.role::tenantuserrole
        FROM tenant_users tu
        WHERE tu.user_id = u.id AND tu.tenant_id = u.tenant_id
    """)
    op.execute("UPDATE users SET role = 'player' WHERE role IS NULL")

    op.alter_column("users", "role", nullable=False)

    op.drop_table("tenant_users")

    # ------------------------------------------------------------------ #
    # 4. Merge invoices → payments                                         #
    # ------------------------------------------------------------------ #
    op.add_column("payments", sa.Column("stripe_invoice_id", sa.String(255), nullable=True))
    op.add_column("payments", sa.Column("stripe_receipt_url", sa.String(500), nullable=True))
    op.add_column("payments", sa.Column("pdf_storage_path", sa.String(500), nullable=True))

    # Copy invoice data into the matching payment row (matched via booking_id + user_id)
    op.execute("""
        UPDATE payments p
        SET
            stripe_invoice_id  = i.stripe_invoice_id,
            stripe_receipt_url = i.stripe_receipt_url,
            pdf_storage_path   = i.pdf_storage_path
        FROM invoices i
        WHERE i.booking_id = p.booking_id
          AND i.user_id    = p.user_id
    """)

    op.drop_table("invoices")

    # ------------------------------------------------------------------ #
    # 5. Drop skill_level_history.club_id                                  #
    # ------------------------------------------------------------------ #
    op.drop_constraint("skill_level_history_club_id_fkey", "skill_level_history", type_="foreignkey")
    op.drop_column("skill_level_history", "club_id")


def downgrade() -> None:
    # ------------------------------------------------------------------ #
    # 5. Restore skill_level_history.club_id                               #
    # ------------------------------------------------------------------ #
    op.add_column("skill_level_history", sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "skill_level_history_club_id_fkey", "skill_level_history", "clubs", ["club_id"], ["id"]
    )

    # ------------------------------------------------------------------ #
    # 4. Restore invoices table                                            #
    # ------------------------------------------------------------------ #
    op.create_table(
        "invoices",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("stripe_invoice_id", sa.String(255), nullable=True),
        sa.Column("stripe_receipt_url", sa.String(500), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="GBP"),
        sa.Column("pdf_storage_path", sa.String(500), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.drop_column("payments", "pdf_storage_path")
    op.drop_column("payments", "stripe_receipt_url")
    op.drop_column("payments", "stripe_invoice_id")

    # ------------------------------------------------------------------ #
    # 3. Restore tenant_users table                                        #
    # ------------------------------------------------------------------ #
    op.create_table(
        "tenant_users",
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", tenant_user_role, nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute("""
        INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
        SELECT gen_random_uuid(), tenant_id, id, role::tenantuserrole, now(), now()
        FROM users
    """)
    op.drop_column("users", "role")

    # ------------------------------------------------------------------ #
    # 2. Restore trainer_availability.club_id                              #
    # ------------------------------------------------------------------ #
    op.add_column("trainer_availability", sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.execute("""
        UPDATE trainer_availability ta
        SET club_id = sp.club_id
        FROM staff_profiles sp
        WHERE sp.id = ta.staff_profile_id
    """)
    op.alter_column("trainer_availability", "club_id", nullable=False)
    op.create_foreign_key(
        "trainer_availability_club_id_fkey", "trainer_availability", "clubs", ["club_id"], ["id"]
    )

    # ------------------------------------------------------------------ #
    # 1. Restore club_settings table                                       #
    # ------------------------------------------------------------------ #
    op.create_table(
        "club_settings",
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_duration_minutes", sa.Integer(), nullable=False, server_default="90"),
        sa.Column("max_advance_booking_days", sa.Integer(), nullable=False, server_default="14"),
        sa.Column("min_booking_notice_hours", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("max_bookings_per_player_per_week", sa.Integer(), nullable=True),
        sa.Column("skill_level_min", sa.Numeric(3, 1), nullable=False, server_default="1.0"),
        sa.Column("skill_level_max", sa.Numeric(3, 1), nullable=False, server_default="7.0"),
        sa.Column("skill_range_allowed", sa.Numeric(3, 1), nullable=False, server_default="1.5"),
        sa.Column("open_games_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("min_players_to_confirm", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("auto_cancel_hours_before", sa.Integer(), nullable=True),
        sa.Column("cancellation_notice_hours", sa.Integer(), nullable=False, server_default="48"),
        sa.Column("cancellation_refund_pct", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("reminder_hours_before", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("waitlist_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("club_id"),
    )
    op.execute("""
        INSERT INTO club_settings (
            id, club_id,
            booking_duration_minutes, max_advance_booking_days, min_booking_notice_hours,
            max_bookings_per_player_per_week, skill_level_min, skill_level_max,
            skill_range_allowed, open_games_enabled, min_players_to_confirm,
            auto_cancel_hours_before, cancellation_notice_hours, cancellation_refund_pct,
            reminder_hours_before, waitlist_enabled, created_at, updated_at
        )
        SELECT
            gen_random_uuid(), id,
            booking_duration_minutes, max_advance_booking_days, min_booking_notice_hours,
            max_bookings_per_player_per_week, skill_level_min, skill_level_max,
            skill_range_allowed, open_games_enabled, min_players_to_confirm,
            auto_cancel_hours_before, cancellation_notice_hours, cancellation_refund_pct,
            reminder_hours_before, waitlist_enabled, now(), now()
        FROM clubs
    """)

    for col in [
        "booking_duration_minutes", "max_advance_booking_days", "min_booking_notice_hours",
        "max_bookings_per_player_per_week", "skill_level_min", "skill_level_max",
        "skill_range_allowed", "open_games_enabled", "min_players_to_confirm",
        "auto_cancel_hours_before", "cancellation_notice_hours", "cancellation_refund_pct",
        "reminder_hours_before", "waitlist_enabled",
    ]:
        op.drop_column("clubs", col)
