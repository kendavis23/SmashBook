import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric, Enum, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class TenantUserRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    staff = "staff"
    trainer = "trainer"
    ops_lead = "ops_lead"
    viewer = "viewer"
    player = "player"


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    email = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    skill_level = Column(Numeric(3, 1), nullable=True)
    skill_assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    skill_assigned_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    stripe_customer_id = Column(String(255), nullable=True)

    tenant = relationship("Tenant", back_populates="users")
    tenant_users = relationship("TenantUser", foreign_keys="TenantUser.user_id", back_populates="user")
    wallet = relationship("Wallet", back_populates="user", uselist=False)
    booking_players = relationship("BookingPlayer", back_populates="user")
    skill_history = relationship("SkillLevelHistory", foreign_keys="SkillLevelHistory.user_id", back_populates="user")


class TenantUser(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tenant_users"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(Enum(TenantUserRole), nullable=False)

    tenant = relationship("Tenant", back_populates="tenant_users")
    user = relationship("User", foreign_keys=[user_id], back_populates="tenant_users")
