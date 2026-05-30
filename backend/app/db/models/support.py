import enum
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class SupportTicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class SupportTicketPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class SupportHandledBy(str, enum.Enum):
    staff = "staff"
    ai = "ai"
    hybrid = "hybrid"


class MessageSenderType(str, enum.Enum):
    player = "player"
    staff = "staff"
    ai = "ai"


class Announcement(Base, UUIDMixin, TimestampMixin):
    """Club-wide post visible to all players (Migration group G6)."""
    __tablename__ = "announcements"
    __table_args__ = (
        Index("ix_announcements_club_id", "club_id"),
    )

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    author_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    is_published = Column(Boolean, nullable=False, default=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    club = relationship("Club")


class SupportTicket(Base, UUIDMixin, TimestampMixin):
    """Unified thread for support, casual chat, and booking inquiries (Migration group G6).

    `category`, `last_message_at` and chat-specific fields are added in G12.
    """
    __tablename__ = "support_tickets"
    __table_args__ = (
        Index("ix_ticket_club_status", "club_id", "status", "priority"),
    )

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    subject = Column(String(255), nullable=True)
    status = Column(Enum(SupportTicketStatus), nullable=False, default=SupportTicketStatus.open)
    priority = Column(Enum(SupportTicketPriority), nullable=False, default=SupportTicketPriority.medium)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    handled_by = Column(Enum(SupportHandledBy), nullable=False, default=SupportHandledBy.staff)
    resolution_summary = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    club = relationship("Club")
    messages = relationship("SupportMessage", back_populates="ticket")


class SupportMessage(Base, UUIDMixin):
    """A single message within a support/chat thread (Migration group G6).

    `intent` and `booking_id` are added in G12 for chat use cases.
    """
    __tablename__ = "support_messages"
    __table_args__ = (
        Index("ix_support_messages_ticket_id", "ticket_id"),
    )

    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support_tickets.id"), nullable=False)
    sender_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # null = AI agent
    sender_type = Column(Enum(MessageSenderType), nullable=False)
    body = Column(Text, nullable=False)
    # FK to ai_inference_log added in G8 (table does not exist yet)
    ai_inference_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ticket = relationship("SupportTicket", back_populates="messages")
