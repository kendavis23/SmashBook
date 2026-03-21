import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric, Enum, DateTime, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin, TenantScopedMixin


class TenantUserRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    staff = "staff"
    trainer = "trainer"
    ops_lead = "ops_lead"
    viewer = "viewer"
    player = "player"


class NotificationChannel(str, enum.Enum):
    push = "push"
    email = "email"
    sms = "sms"
    in_app = "in_app"


class User(Base, UUIDMixin, TimestampMixin, TenantScopedMixin):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    email = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(TenantUserRole), nullable=False, default=TenantUserRole.player)
    skill_level = Column(Numeric(3, 1), nullable=True)
    skill_assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    skill_assigned_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    stripe_customer_id = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    photo_url = Column(String(500), nullable=True)
    is_suspended = Column(Boolean, nullable=False, default=False)
    suspension_reason = Column(Text, nullable=True)
    default_payment_method_id = Column(String(255), nullable=True)
    preferred_notification_channel = Column(
        Enum(NotificationChannel), nullable=False, default=NotificationChannel.push
    )

    tenant = relationship("Tenant", back_populates="users")
    wallet = relationship("Wallet", back_populates="user", uselist=False)
    booking_players = relationship("BookingPlayer", back_populates="user")
    skill_history = relationship("SkillLevelHistory", foreign_keys="SkillLevelHistory.user_id", back_populates="user")
    membership_subscriptions = relationship("MembershipSubscription", back_populates="user")
