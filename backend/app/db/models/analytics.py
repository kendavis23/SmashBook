import enum

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
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


class RefreshStatus(str, enum.Enum):
    success = "success"
    failed = "failed"


class AnalyticsRefreshLog(Base, UUIDMixin):
    """Audit trail for materialized-view refreshes run by
    ``app/analytics/workers/refresh_views.py``.

    One row per (view, refresh attempt). On failure the worker also publishes to
    the ``analytics-alerts`` Pub/Sub topic; this table is the durable record used
    to answer "is the revenue report stale?" and to alert on repeated failures.
    Not tenant-scoped — views are tenant-wide aggregates and refresh is a
    platform operation.
    """

    __tablename__ = "analytics_refresh_log"
    __table_args__ = (
        Index("ix_analytics_refresh_log_view_started", "view_name", "started_at"),
    )

    view_name = Column(String(100), nullable=False)
    status = Column(Enum(RefreshStatus, name="refreshstatus"), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    row_count = Column(Integer, nullable=True)  # rows in the view after refresh
    error = Column(Text, nullable=True)  # exception text on failure
    triggered_by = Column(String(50), nullable=True)  # event_type / "manual"
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
