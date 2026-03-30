import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric, Text, Enum, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class CalendarReservationType(str, enum.Enum):
    skill_filter = "skill_filter"
    training_block = "training_block"
    private_hire = "private_hire"
    maintenance = "maintenance"
    tournament_hold = "tournament_hold"


class SurfaceType(str, enum.Enum):
    indoor = "indoor"
    outdoor = "outdoor"
    crystal = "crystal"
    artificial_grass = "artificial_grass"


class Court(Base, UUIDMixin):
    __tablename__ = "courts"

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    name = Column(String(100), nullable=False)
    surface_type = Column(Enum(SurfaceType), nullable=False)
    has_lighting = Column(Boolean, nullable=False, default=False)
    lighting_surcharge = Column(Numeric(10, 2), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    club = relationship("Club", back_populates="courts")
    blackouts = relationship("CourtBlackout", back_populates="court")
    bookings = relationship("Booking", back_populates="court")
    calendar_reservations = relationship("CalendarReservation", back_populates="court")


class CourtBlackout(Base, UUIDMixin):
    __tablename__ = "court_blackouts"

    court_id = Column(UUID(as_uuid=True), ForeignKey("courts.id"), nullable=False)
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=False)
    reason = Column(Text, nullable=True)

    court = relationship("Court", back_populates="blackouts")


class CalendarReservation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "calendar_reservations"

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    court_id = Column(UUID(as_uuid=True), ForeignKey("courts.id"), nullable=True)
    reservation_type = Column(Enum(CalendarReservationType), nullable=False)
    title = Column(String(255), nullable=False)
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=False)
    anchor_skill_level = Column(Numeric(3, 1), nullable=True)
    skill_range_above = Column(Numeric(3, 1), nullable=True)
    skill_range_below = Column(Numeric(3, 1), nullable=True)
    allowed_booking_types = Column(ARRAY(String), nullable=True)
    is_recurring = Column(Boolean, nullable=False, default=False)
    recurrence_rule = Column(Text, nullable=True)
    recurrence_end_date = Column(Date, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    club = relationship("Club", back_populates="calendar_reservations")
    court = relationship("Court", back_populates="calendar_reservations")
