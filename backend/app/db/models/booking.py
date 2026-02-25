import enum
from sqlalchemy import Column, String, Integer, ForeignKey, Numeric, Text, Boolean, Enum
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


class Booking(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "bookings"

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    court_id = Column(UUID(as_uuid=True), ForeignKey("courts.id"), nullable=False)
    booking_type = Column(Enum(BookingType), nullable=False)
    status = Column(Enum(BookingStatus), nullable=False, default=BookingStatus.pending)
    start_datetime = Column(String, nullable=False)
    end_datetime = Column(String, nullable=False)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    staff_profile_id = Column(UUID(as_uuid=True), ForeignKey("staff_profiles.id"), nullable=True)
    event_name = Column(String(255), nullable=True)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    max_players = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    total_price = Column(Numeric(10, 2), nullable=True)
    is_open_game = Column(Boolean, nullable=False, default=False)
    is_recurring = Column(Boolean, nullable=False, default=False)
    recurrence_rule = Column(Text, nullable=True)
    video_upload_path = Column(String(500), nullable=True)  # GCS path

    club = relationship("Club", back_populates="bookings")
    court = relationship("Court", back_populates="bookings")
    staff_profile = relationship("StaffProfile", back_populates="bookings")
    players = relationship("BookingPlayer", back_populates="booking")
    equipment_rentals = relationship("EquipmentRental", back_populates="booking")
    payments = relationship("Payment", back_populates="booking")


class BookingPlayer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "booking_players"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(Enum(PlayerRole), nullable=False)
    payment_status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.pending)
    amount_due = Column(Numeric(10, 2), nullable=False)

    booking = relationship("Booking", back_populates="players")
    user = relationship("User", back_populates="booking_players")
