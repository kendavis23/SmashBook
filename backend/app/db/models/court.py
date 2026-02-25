import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin


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


class CourtBlackout(Base, UUIDMixin):
    __tablename__ = "court_blackouts"

    court_id = Column(UUID(as_uuid=True), ForeignKey("courts.id"), nullable=False)
    start_datetime = Column(String, nullable=False)
    end_datetime = Column(String, nullable=False)
    reason = Column(Text, nullable=True)

    court = relationship("Court", back_populates="blackouts")
