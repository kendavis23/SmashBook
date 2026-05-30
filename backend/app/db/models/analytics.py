from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin


class CourtUtilisationSnapshot(Base, UUIDMixin):
    """Hourly (and daily-rollup) court utilisation snapshots written by the
    analytics worker — never by the API request path.

    Physical snapshot (not a materialized view) because ``total_slots`` and
    ``revenue_potential`` depend on operating-hours and pricing config *as they
    were at snapshot time*; those historical figures can't be reconstructed if a
    club later changes hours or prices. See DATA_MODEL_TARGET_STATE.md (G7).
    """

    __tablename__ = "court_utilisation_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "court_id",
            "snapshot_date",
            "hour_of_day",
            name="uq_court_utilisation_court_date_hour",
        ),
    )

    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    court_id = Column(UUID(as_uuid=True), ForeignKey("courts.id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    hour_of_day = Column(SmallInteger, nullable=True)  # 0–23; null = daily rollup
    day_of_week = Column(SmallInteger, nullable=False)  # 0=Mon … 6=Sun
    total_slots = Column(Integer, nullable=False)
    booked_slots = Column(Integer, nullable=False)
    utilisation_pct = Column(Numeric(5, 2), nullable=False)
    revenue_actual = Column(Numeric(10, 2), nullable=False)
    revenue_potential = Column(Numeric(10, 2), nullable=False)
    avg_booking_lead_time_h = Column(Numeric(6, 1), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    club = relationship("Club")
    court = relationship("Court")
