from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class SubscriptionPlan(Base, UUIDMixin):
    __tablename__ = "subscription_plans"

    name = Column(String(100), nullable=False)
    max_clubs = Column(Integer, nullable=False)            # -1 = unlimited
    max_courts_per_club = Column(Integer, nullable=False)  # -1 = unlimited
    max_staff_users = Column(Integer, nullable=False, default=-1)  # -1 = unlimited
    open_games_feature = Column(Boolean, nullable=False, default=False)
    waitlist_feature = Column(Boolean, nullable=False, default=False)
    white_label_enabled = Column(Boolean, nullable=False, default=False)
    analytics_enabled = Column(Boolean, nullable=False, default=False)

    # Pricing
    price_per_month = Column(Numeric(10, 2), nullable=False)
    setup_fee = Column(Numeric(10, 2), nullable=False, default=0)
    trial_days = Column(Integer, nullable=False, default=0)

    # Revenue share / transaction fees (NULL = not applicable for this plan)
    booking_fee_pct = Column(Numeric(5, 2), nullable=True)           # % of each court booking
    revenue_share_pct = Column(Numeric(5, 2), nullable=True)         # % of total club revenue
    third_party_revenue_share_pct = Column(Numeric(5, 2), nullable=True)  # % of lessons/retail/etc
    overage_fee_per_booking = Column(Numeric(10, 2), nullable=True)  # flat fee beyond plan limits

    # API / integration limits
    max_api_calls_per_month = Column(Integer, nullable=True)         # NULL = unlimited

    tenants = relationship("Tenant", back_populates="plan")


class Tenant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tenants"

    name = Column(String(255), nullable=False)
    subdomain = Column(String(100), nullable=False, unique=True)
    custom_domain = Column(String(255), nullable=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    subscription_start_date = Column(DateTime(timezone=True), nullable=True)  # NULL until tenant goes live

    plan = relationship("SubscriptionPlan", back_populates="tenants")
    clubs = relationship("Club", back_populates="tenant")
    users = relationship("User", back_populates="tenant")
