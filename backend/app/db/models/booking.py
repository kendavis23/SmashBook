import enum
from sqlalchemy import Column, String, Integer, ForeignKey, Numeric, Text, Boolean, Enum, DateTime, Date, Time, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class BookingType(str, enum.Enum):
    regular = "regular"
    lesson_individual = "lesson_individual"
    lesson_group = "lesson_group"
    corporate_event = "corporate_event"
    tournament = "tournament"


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class PlayerRole(str, enum.Enum):
    organiser = "organiser"
    player = "player"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    refunded = "refunded"


class InviteStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class WaitlistStatus(str, enum.Enum):
    waiting = "waiting"
    offered = "offered"
    booked = "booked"
    expired = "expired"


class DiscountSource(str, enum.Enum):
    membership = "membership"
    campaign = "campaign"
    promo_code = "promo_code"
    staff_manual = "staff_manual"
    ai_gap_offer = "ai_gap_offer"


class Booking(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "bookings"
    __table_args__ = (
        Index("ix_bookings_court_window", "court_id", "start_datetime", "end_datetime"),
        Index("ix_bookings_club_status", "club_id", "status"),
        Index("ix_bookings_club_start", "club_id", "start_datetime"),
    )

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    court_id = Column(UUID(as_uuid=True), ForeignKey("courts.id"), nullable=False)
    booking_type = Column(Enum(BookingType), nullable=False)
    status = Column(Enum(BookingStatus), nullable=False, default=BookingStatus.pending)
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    staff_profile_id = Column(UUID(as_uuid=True), ForeignKey("staff_profiles.id"), nullable=True)
    event_name = Column(String(255), nullable=True)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    max_players = Column(Integer, nullable=True)
    min_skill_level = Column(Numeric(3, 1), nullable=True)
    max_skill_level = Column(Numeric(3, 1), nullable=True)
    notes = Column(Text, nullable=True)
    total_price = Column(Numeric(10, 2), nullable=True)
    is_open_game = Column(Boolean, nullable=False, default=False)
    is_recurring = Column(Boolean, nullable=False, default=False)
    recurrence_rule = Column(Text, nullable=True)
    video_upload_path = Column(String(500), nullable=True)  # GCS path
    discount_amount = Column(Numeric(10, 2), nullable=True)
    discount_source = Column(Enum(DiscountSource), nullable=True)
    membership_subscription_id = Column(UUID(as_uuid=True), ForeignKey("membership_subscriptions.id"), nullable=True)

    club = relationship("Club", back_populates="bookings")
    court = relationship("Court", back_populates="bookings")
    staff_profile = relationship("StaffProfile", back_populates="bookings")
    players = relationship("BookingPlayer", back_populates="booking")
    equipment_rentals = relationship("EquipmentRental", back_populates="booking")
    payments = relationship("Payment", back_populates="booking")


class BookingPlayer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "booking_players"
    __table_args__ = (
        UniqueConstraint("booking_id", "user_id", name="uq_booking_players_booking_user"),
    )

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(Enum(PlayerRole), nullable=False)
    payment_status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.pending)
    amount_due = Column(Numeric(10, 2), nullable=False)
    invite_status = Column(Enum(InviteStatus), nullable=False, default=InviteStatus.accepted)

    booking = relationship("Booking", back_populates="players")
    user = relationship("User")


class WaitlistEntry(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "waitlist_entries"

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    court_id = Column(UUID(as_uuid=True), ForeignKey("courts.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    desired_date = Column(Date, nullable=False)
    desired_start_time = Column(Time, nullable=True)
    desired_end_time = Column(Time, nullable=True)
    status = Column(Enum(WaitlistStatus), nullable=False, default=WaitlistStatus.waiting)
    offered_booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    offer_expires_at = Column(DateTime(timezone=True), nullable=True)
    notified_at = Column(DateTime(timezone=True), nullable=True)

    club = relationship("Club")
    court = relationship("Court")
    user = relationship("User")
    offered_booking = relationship("Booking", foreign_keys=[offered_booking_id])
