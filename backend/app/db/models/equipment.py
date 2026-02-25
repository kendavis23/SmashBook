import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Numeric, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class ItemType(str, enum.Enum):
    racket = "racket"
    ball_tube = "ball_tube"
    other = "other"


class ItemCondition(str, enum.Enum):
    good = "good"
    fair = "fair"
    damaged = "damaged"
    retired = "retired"


class EquipmentInventory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "equipment_inventory"

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    item_type = Column(Enum(ItemType), nullable=False)
    name = Column(String(100), nullable=False)
    quantity_total = Column(Integer, nullable=False)
    quantity_available = Column(Integer, nullable=False)
    rental_price = Column(Numeric(10, 2), nullable=False)
    condition = Column(Enum(ItemCondition), nullable=False)
    notes = Column(Text, nullable=True)

    club = relationship("Club", back_populates="equipment")
    rentals = relationship("EquipmentRental", back_populates="equipment")


class EquipmentRental(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "equipment_rentals"

    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment_inventory.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    charge = Column(Numeric(10, 2), nullable=False)
    damage_reported = Column(Boolean, nullable=False, default=False)
    damage_notes = Column(Text, nullable=True)
    returned_at = Column(String, nullable=True)

    booking = relationship("Booking", back_populates="equipment_rentals")
    equipment = relationship("EquipmentInventory", back_populates="rentals")
