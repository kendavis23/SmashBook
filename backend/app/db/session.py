from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from .models.base import Base
from app.core.config import get_settings

settings = get_settings()

# Primary (read/write) engine - Cloud SQL via Cloud SQL Auth Proxy
engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG, pool_size=10, max_overflow=20)

# Read replica engine - routed to Cloud SQL read replica
read_engine = create_async_engine(settings.DATABASE_READ_REPLICA_URL, echo=settings.DEBUG, pool_size=10, max_overflow=20)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
AsyncReadSessionLocal = async_sessionmaker(read_engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_read_db() -> AsyncSession:
    """Read replica session - use for GET endpoints and reports."""
    async with AsyncReadSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
