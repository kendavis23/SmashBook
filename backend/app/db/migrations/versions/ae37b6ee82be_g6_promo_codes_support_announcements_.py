"""g6_promo_codes_support_announcements_skill_history

Revision ID: ae37b6ee82be
Revises: 92c0f1557d7e
Create Date: 2026-05-30 09:20:17.744155

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'ae37b6ee82be'
down_revision: Union[str, None] = '92c0f1557d7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### Create new enum types first (must exist before columns reference them) ###
    postgresql.ENUM('percentage', 'fixed_amount', name='promodiscounttype').create(op.get_bind())
    postgresql.ENUM('all', 'off_peak', 'open_game', 'lesson', 'tournament', name='promoappliesto').create(op.get_bind())
    postgresql.ENUM('open', 'in_progress', 'resolved', 'closed', name='supportticketstatus').create(op.get_bind())
    postgresql.ENUM('low', 'medium', 'high', name='supportticketpriority').create(op.get_bind())
    postgresql.ENUM('staff', 'ai', 'hybrid', name='supporthandledby').create(op.get_bind())
    postgresql.ENUM('player', 'staff', 'ai', name='messagesendertype').create(op.get_bind())
    postgresql.ENUM('staff_manual', 'ai_auto', 'match_result', name='skillchangesource').create(op.get_bind())

    op.create_table('announcements',
    sa.Column('club_id', sa.UUID(), nullable=False),
    sa.Column('author_user_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('is_published', sa.Boolean(), nullable=False),
    sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['author_user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_announcements_club_id', 'announcements', ['club_id'], unique=False)
    op.create_table('promo_codes',
    sa.Column('club_id', sa.UUID(), nullable=False),
    sa.Column('code', sa.String(length=50), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('discount_type', postgresql.ENUM('percentage', 'fixed_amount', name='promodiscounttype', create_type=False), nullable=False),
    sa.Column('discount_value', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('max_uses', sa.Integer(), nullable=True),
    sa.Column('uses_count', sa.Integer(), nullable=False),
    sa.Column('max_uses_per_player', sa.Integer(), nullable=True),
    sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True),
    sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
    sa.Column('applies_to', postgresql.ENUM('all', 'off_peak', 'open_game', 'lesson', 'tournament', name='promoappliesto', create_type=False), nullable=False),
    sa.Column('min_booking_value', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_by', sa.UUID(), nullable=False),
    sa.Column('campaign_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('club_id', 'code', name='uq_promo_codes_club_code')
    )
    op.create_index('ix_promo_codes_club_id', 'promo_codes', ['club_id'], unique=False)
    op.create_table('support_tickets',
    sa.Column('club_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('booking_id', sa.UUID(), nullable=True),
    sa.Column('subject', sa.String(length=255), nullable=True),
    sa.Column('status', postgresql.ENUM('open', 'in_progress', 'resolved', 'closed', name='supportticketstatus', create_type=False), nullable=False),
    sa.Column('priority', postgresql.ENUM('low', 'medium', 'high', name='supportticketpriority', create_type=False), nullable=False),
    sa.Column('assigned_to', sa.UUID(), nullable=True),
    sa.Column('handled_by', postgresql.ENUM('staff', 'ai', 'hybrid', name='supporthandledby', create_type=False), nullable=False),
    sa.Column('resolution_summary', sa.Text(), nullable=True),
    sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
    sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ),
    sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ticket_club_status', 'support_tickets', ['club_id', 'status', 'priority'], unique=False)
    op.create_table('support_messages',
    sa.Column('ticket_id', sa.UUID(), nullable=False),
    sa.Column('sender_user_id', sa.UUID(), nullable=True),
    sa.Column('sender_type', postgresql.ENUM('player', 'staff', 'ai', name='messagesendertype', create_type=False), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('ai_inference_id', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['sender_user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_support_messages_ticket_id', 'support_messages', ['ticket_id'], unique=False)
    op.add_column('bookings', sa.Column('promo_code_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_bookings_promo_code_id', 'bookings', 'promo_codes', ['promo_code_id'], ['id'])
    # club_id is a NOT NULL FK with no backfill source (it was removed in the prior
    # simplification, so existing rows carry no club reference). The table is empty at
    # G6 time; no server_default is possible for a FK, so it is added NOT NULL directly.
    op.add_column('skill_level_history', sa.Column('club_id', sa.UUID(), nullable=False))
    op.add_column('skill_level_history', sa.Column('change_source', postgresql.ENUM('staff_manual', 'ai_auto', 'match_result', name='skillchangesource', create_type=False), nullable=False, server_default='staff_manual'))
    op.add_column('skill_level_history', sa.Column('ai_inference_id', sa.UUID(), nullable=True))
    op.alter_column('skill_level_history', 'assigned_by',
               existing_type=sa.UUID(),
               nullable=True)
    op.create_foreign_key('fk_skill_level_history_club_id', 'skill_level_history', 'clubs', ['club_id'], ['id'])
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint('fk_skill_level_history_club_id', 'skill_level_history', type_='foreignkey')
    op.alter_column('skill_level_history', 'assigned_by',
               existing_type=sa.UUID(),
               nullable=False)
    op.drop_column('skill_level_history', 'ai_inference_id')
    op.drop_column('skill_level_history', 'change_source')
    op.drop_column('skill_level_history', 'club_id')
    op.drop_constraint('fk_bookings_promo_code_id', 'bookings', type_='foreignkey')
    op.drop_column('bookings', 'promo_code_id')
    op.drop_index('ix_support_messages_ticket_id', table_name='support_messages')
    op.drop_table('support_messages')
    op.drop_index('ix_ticket_club_status', table_name='support_tickets')
    op.drop_table('support_tickets')
    op.drop_index('ix_promo_codes_club_id', table_name='promo_codes')
    op.drop_table('promo_codes')
    op.drop_index('ix_announcements_club_id', table_name='announcements')
    op.drop_table('announcements')

    op.execute('DROP TYPE IF EXISTS skillchangesource')
    op.execute('DROP TYPE IF EXISTS messagesendertype')
    op.execute('DROP TYPE IF EXISTS supporthandledby')
    op.execute('DROP TYPE IF EXISTS supportticketpriority')
    op.execute('DROP TYPE IF EXISTS supportticketstatus')
    op.execute('DROP TYPE IF EXISTS promoappliesto')
    op.execute('DROP TYPE IF EXISTS promodiscounttype')
    # ### end Alembic commands ###
