import uuid
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class UUIDMixin:
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class TenantScopedMixin:
    """
    Marker mixin for models that are directly isolated by a ``tenant_id`` FK column.

    Models that inherit this mixin are expected to have a ``tenant_id`` column
    (added individually in each model so FK constraints stay explicit).
    Use ``tenant_clause(Model, tenant_id)`` from ``app.db.session`` to build
    the corresponding WHERE clause when querying these models.

    Models scoped *transitively* through ``club_id → clubs.tenant_id`` (e.g.
    Court, Booking) do NOT use this mixin; callers must join through Club.
    """

