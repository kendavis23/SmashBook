from collections.abc import AsyncIterator
from typing import Type
from uuid import UUID

from sqlalchemy import ColumnElement
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from .models.base import TenantScopedMixin
from app.core.config import get_settings

settings = get_settings()

# Primary (read/write) engine - Cloud SQL via Cloud SQL Auth Proxy
engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG, pool_size=10, max_overflow=20)

# Read replica engine - falls back to primary if replica URL is not set
_read_replica_url = settings.DATABASE_READ_REPLICA_URL or settings.DATABASE_URL
read_engine = create_async_engine(_read_replica_url, echo=settings.DEBUG, pool_size=10, max_overflow=20)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
AsyncReadSessionLocal = async_sessionmaker(read_engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_read_db() -> AsyncIterator[AsyncSession]:
    """Read replica session - use for GET endpoints and reports."""
    async with AsyncReadSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def tenant_clause(model: Type, tenant_id: UUID) -> ColumnElement:
    """
    Return a WHERE clause that scopes a query to the given tenant.

    Only works for models that carry a direct ``tenant_id`` column (i.e. those
    that inherit ``TenantScopedMixin``).  For models scoped transitively via
    ``club_id`` (Court, Booking, etc.) callers must join through Club.

    Example::

        stmt = select(Club).where(tenant_clause(Club, tenant.id))
    """
    if not issubclass(model, TenantScopedMixin):
        raise TypeError(
            f"{model.__name__} is not a TenantScopedMixin subclass. "
            "Join through Club to filter by tenant."
        )
    return model.tenant_id == tenant_id  # type: ignore[attr-defined]
