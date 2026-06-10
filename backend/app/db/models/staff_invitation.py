import enum
from sqlalchemy import Column, String, ForeignKey, Enum, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin, TenantScopedMixin
from .staff import StaffRole


class StaffInvitationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    revoked = "revoked"
    expired = "expired"


class StaffInvitation(Base, UUIDMixin, TimestampMixin, TenantScopedMixin):
    """An invitation to onboard a user into a club as staff (Phase B).

    A dedicated table (rather than overloading ``staff_profiles.is_active``,
    which means "deactivated") so an existing tenant user can be promoted
    (player → front_desk) without an email round-trip. The service layer
    enforces ≤1 ``pending`` invitation per ``(club_id, email)``.
    """
    __tablename__ = "staff_invitations"
    __table_args__ = (
        Index("ix_staff_invitations_club_email", "club_id", "email"),
        Index("ix_staff_invitations_tenant_id", "tenant_id"),
    )

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    email = Column(String(255), nullable=False)
    role = Column(Enum(StaffRole), nullable=False)
    invited_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(
        Enum(StaffInvitationStatus),
        nullable=False,
        default=StaffInvitationStatus.pending,
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    accepted_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    club = relationship("Club")
