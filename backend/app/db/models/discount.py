import enum
from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, DateTime, ForeignKey, Enum, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class PromoDiscountType(str, enum.Enum):
    percentage = "percentage"
    fixed_amount = "fixed_amount"


class PromoAppliesTo(str, enum.Enum):
    all = "all"
    off_peak = "off_peak"
    open_game = "open_game"
    lesson = "lesson"
    tournament = "tournament"


class PromoCode(Base, UUIDMixin, TimestampMixin):
    """Club-scoped promotional discount code (Migration group G6)."""
    __tablename__ = "promo_codes"
    __table_args__ = (
        UniqueConstraint("club_id", "code", name="uq_promo_codes_club_code"),
        Index("ix_promo_codes_club_id", "club_id"),
    )

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    code = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    discount_type = Column(Enum(PromoDiscountType), nullable=False)
    discount_value = Column(Numeric(10, 2), nullable=False)
    max_uses = Column(Integer, nullable=True)              # NULL = unlimited
    uses_count = Column(Integer, nullable=False, default=0)
    max_uses_per_player = Column(Integer, nullable=True)
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    applies_to = Column(Enum(PromoAppliesTo), nullable=False, default=PromoAppliesTo.all)
    min_booking_value = Column(Numeric(10, 2), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    # FK to campaigns added in G10 (table does not exist yet)
    campaign_id = Column(UUID(as_uuid=True), nullable=True)

    club = relationship("Club")
