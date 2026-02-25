import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Text, SmallInteger, Date, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class StaffRole(str, enum.Enum):
    trainer = "trainer"
    ops_lead = "ops_lead"
    admin = "admin"
    front_desk = "front_desk"


class StaffProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "staff_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    role = Column(Enum(StaffRole), nullable=False)
    bio = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    club = relationship("Club", back_populates="staff_profiles")
    availability = relationship("TrainerAvailability", back_populates="staff_profile")
    bookings = relationship("Booking", back_populates="staff_profile")


class TrainerAvailability(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "trainer_availability"

    staff_profile_id = Column(UUID(as_uuid=True), ForeignKey("staff_profiles.id"), nullable=False)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    day_of_week = Column(SmallInteger, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    set_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_until = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    staff_profile = relationship("StaffProfile", back_populates="availability")
