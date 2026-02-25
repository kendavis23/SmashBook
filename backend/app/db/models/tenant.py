from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class SubscriptionPlan(Base, UUIDMixin):
    __tablename__ = "subscription_plans"

    name = Column(String(100), nullable=False)
    max_clubs = Column(Integer, nullable=False)            # -1 = unlimited
    max_courts_per_club = Column(Integer, nullable=False)  # -1 = unlimited
    open_games_feature = Column(Boolean, nullable=False, default=False)
    waitlist_feature = Column(Boolean, nullable=False, default=False)
    price_per_month = Column(Numeric(10, 2), nullable=False)

    tenants = relationship("Tenant", back_populates="plan")


class Tenant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tenants"

    name = Column(String(255), nullable=False)
    subdomain = Column(String(100), nullable=False, unique=True)
    custom_domain = Column(String(255), nullable=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    plan = relationship("SubscriptionPlan", back_populates="tenants")
    clubs = relationship("Club", back_populates="tenant")
    users = relationship("User", back_populates="tenant")
    tenant_users = relationship("TenantUser", back_populates="tenant")
