import enum
from sqlalchemy import Column, ForeignKey, Numeric, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class SkillChangeSource(str, enum.Enum):
    staff_manual = "staff_manual"
    ai_auto = "ai_auto"
    match_result = "match_result"


class SkillLevelHistory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "skill_level_history"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    previous_level = Column(Numeric(3, 1), nullable=True)
    new_level = Column(Numeric(3, 1), nullable=False)
    change_source = Column(Enum(SkillChangeSource), nullable=False, default=SkillChangeSource.staff_manual)
    # null when change_source = ai_auto
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    # FK to ai_inference_log added in G8 (table does not exist yet)
    ai_inference_id = Column(UUID(as_uuid=True), nullable=True)
    reason = Column(Text, nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="skill_history")
    club = relationship("Club")
