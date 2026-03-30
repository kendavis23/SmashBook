from sqlalchemy import Column, String, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, Text, SmallInteger, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin, TenantScopedMixin


class Club(Base, UUIDMixin, TimestampMixin, TenantScopedMixin):
    __tablename__ = "clubs"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=True)
    stripe_connect_account_id = Column(String(255), nullable=True)
    currency = Column(String(3), nullable=False, default="GBP")

    # Settings (merged from club_settings)
    booking_duration_minutes = Column(Integer, nullable=False, default=90)
    max_advance_booking_days = Column(Integer, nullable=False, default=14)
    min_booking_notice_hours = Column(Integer, nullable=False, default=2)
    max_bookings_per_player_per_week = Column(Integer, nullable=True)
    skill_level_min = Column(Numeric(3, 1), nullable=False, default=1.0)
    skill_level_max = Column(Numeric(3, 1), nullable=False, default=7.0)
    skill_range_allowed = Column(Numeric(3, 1), nullable=False, default=1.5)
    open_games_enabled = Column(Boolean, nullable=False, default=True)
    min_players_to_confirm = Column(Integer, nullable=False, default=4)
    auto_cancel_hours_before = Column(Integer, nullable=True)
    cancellation_notice_hours = Column(Integer, nullable=False, default=48)
    cancellation_refund_pct = Column(Integer, nullable=False, default=100)
    reminder_hours_before = Column(Integer, nullable=False, default=24)
    waitlist_enabled = Column(Boolean, nullable=False, default=True)
    default_skill_range_above = Column(Numeric(3, 1), nullable=False, default=0.5)
    default_skill_range_below = Column(Numeric(3, 1), nullable=False, default=1.0)

    tenant = relationship("Tenant", back_populates="clubs")
    operating_hours = relationship("OperatingHours", back_populates="club")
    pricing_rules = relationship("PricingRule", back_populates="club")
    courts = relationship("Court", back_populates="club")
    staff_profiles = relationship("StaffProfile", back_populates="club")
    bookings = relationship("Booking", back_populates="club")
    equipment = relationship("EquipmentInventory", back_populates="club")
    membership_plans = relationship("MembershipPlan", back_populates="club")
    membership_subscriptions = relationship("MembershipSubscription", back_populates="club")
    calendar_reservations = relationship("CalendarReservation", back_populates="club")


class OperatingHours(Base, UUIDMixin):
    __tablename__ = "operating_hours"

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    day_of_week = Column(SmallInteger, nullable=False)
    open_time = Column(Time, nullable=False)
    close_time = Column(Time, nullable=False)
    valid_from = Column(Date, nullable=True)
    valid_until = Column(Date, nullable=True)

    club = relationship("Club", back_populates="operating_hours")


class PricingRule(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "pricing_rules"

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)

    # Window definition
    label = Column(String(50), nullable=False)
    day_of_week = Column(SmallInteger, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    valid_from = Column(Date, nullable=True)
    valid_until = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # Base pricing
    price_per_slot = Column(Numeric(10, 2), nullable=False)

    # Surge pricing — activates when utilization >= surge_trigger_pct
    surge_trigger_pct = Column(Numeric(5, 2), nullable=True)
    surge_max_pct = Column(Numeric(5, 2), nullable=True)

    # Low-demand pricing — activates when utilization <= low_demand_trigger_pct
    low_demand_trigger_pct = Column(Numeric(5, 2), nullable=True)
    low_demand_min_pct = Column(Numeric(5, 2), nullable=True)

    # Flat incentive override (e.g. Happy Hour, promotional rate)
    incentive_price = Column(Numeric(10, 2), nullable=True)
    incentive_label = Column(String(100), nullable=True)
    incentive_expires_at = Column(DateTime(timezone=True), nullable=True)

    club = relationship("Club", back_populates="pricing_rules")
