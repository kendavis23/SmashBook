import enum
from sqlalchemy import Column, String, ForeignKey, Numeric, Integer, Boolean, Text, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class BillingPeriod(str, enum.Enum):
    monthly = "monthly"
    annual = "annual"


class MembershipStatus(str, enum.Enum):
    trialing = "trialing"
    active = "active"
    paused = "paused"
    cancelled = "cancelled"
    expired = "expired"


class CreditType(str, enum.Enum):
    booking_credit = "booking_credit"
    guest_pass = "guest_pass"


class MembershipPlan(Base, UUIDMixin, TimestampMixin):
    """Club-defined membership tier (e.g. Silver / Gold / Platinum)."""
    __tablename__ = "membership_plans"

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    billing_period = Column(Enum(BillingPeriod), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    trial_days = Column(Integer, nullable=False, default=0)

    # Booking entitlements per billing period
    booking_credits_per_period = Column(Integer, nullable=True)   # NULL = unlimited
    guest_passes_per_period = Column(Integer, nullable=True)      # NULL = none

    # Pricing benefits
    discount_pct = Column(Numeric(5, 2), nullable=True)           # % off court bookings
    priority_booking_days = Column(Integer, nullable=True)        # extra advance-booking window

    # Capacity cap
    max_active_members = Column(Integer, nullable=True)           # NULL = unlimited

    is_active = Column(Boolean, nullable=False, default=True)
    stripe_price_id = Column(String(255), nullable=True)          # Stripe recurring Price ID

    club = relationship("Club", back_populates="membership_plans")
    subscriptions = relationship("MembershipSubscription", back_populates="plan")


class MembershipSubscription(Base, UUIDMixin, TimestampMixin):
    """A player's active subscription to a MembershipPlan."""
    __tablename__ = "membership_subscriptions"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("membership_plans.id"), nullable=False)
    # Denormalised for tenant-scoping queries without joining through plan
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)

    status = Column(Enum(MembershipStatus), nullable=False, default=MembershipStatus.active)
    current_period_start = Column(DateTime(timezone=True), nullable=False)
    current_period_end = Column(DateTime(timezone=True), nullable=False)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Rolling credit balances for the current billing period
    credits_remaining = Column(Integer, nullable=True)        # NULL when plan has unlimited credits
    guest_passes_remaining = Column(Integer, nullable=True)   # NULL when plan has no guest passes

    stripe_subscription_id = Column(String(255), nullable=True)

    user = relationship("User", back_populates="membership_subscriptions")
    plan = relationship("MembershipPlan", back_populates="subscriptions")
    club = relationship("Club", back_populates="membership_subscriptions")
    credit_logs = relationship("MembershipCreditLog", back_populates="subscription")


class MembershipCreditLog(Base, UUIDMixin):
    """Immutable audit log for booking-credit and guest-pass usage."""
    __tablename__ = "membership_credit_logs"

    subscription_id = Column(UUID(as_uuid=True), ForeignKey("membership_subscriptions.id"), nullable=False)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    credit_type = Column(Enum(CreditType), nullable=False)
    delta = Column(Integer, nullable=False)          # negative = used, positive = restored/reset
    balance_after = Column(Integer, nullable=False)  # snapshot for audit trail
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

    subscription = relationship("MembershipSubscription", back_populates="credit_logs")
    booking = relationship("Booking")
