from sqlalchemy import Column, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin


class SkillLevelHistory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "skill_level_history"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    previous_level = Column(Numeric(3, 1), nullable=True)
    new_level = Column(Numeric(3, 1), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="skill_history")
