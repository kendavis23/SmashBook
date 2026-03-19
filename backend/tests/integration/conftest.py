"""
Integration test configuration.

Design
------
- Uses the real test PostgreSQL database (DATABASE_URL from root conftest.py env vars).
- Tables are created once per session via create_all (idempotent).
- All tables are truncated at session start for a clean slate.
- Seed fixtures commit data so TenantMiddleware — which opens its own AsyncSession via
  the module-level AsyncSessionLocal in app.db.session — can resolve tenants from the
  X-Tenant-ID header without any patching.
- FastAPI dependency overrides redirect get_db / get_read_db to sessions from the same
  test engine so route-level DB operations run inside the test database.
- Seed fixtures use UUID-suffixed values (emails, subdomains) to avoid unique-constraint
  conflicts across tests within the same session.
- Each seed fixture cleans up its own data on teardown via _cleanup_tenant, which deletes
  in FK-safe order.

Event-loop note
---------------
pytest.ini sets asyncio_default_fixture_loop_scope = session and
asyncio_default_test_loop_scope = session so that all async fixtures and tests share one
event loop. This is required because asyncpg connection pools are tied to the event loop
on which they are first used; mixing loop scopes would cause "attached to a different
event loop" errors.

Extending cleanup
-----------------
When new test files add endpoints that create bookings, staff profiles, skill history, etc.,
extend _cleanup_tenant below to delete those FK children before deleting Club/User/Tenant.
"""

import os
import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy import delete as sql_delete
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.security import create_access_token, get_password_hash
from app.db.models.base import Base
from app.db.models.club import Club, ClubSettings, OperatingHours, PricingRule
from app.db.models.membership import MembershipPlan
from app.db.models.court import Court, CourtBlackout
from app.db.models.tenant import SubscriptionPlan, Tenant
from app.db.models.user import TenantUser, TenantUserRole, User
from app.db.models.wallet import Wallet
from app.db.session import get_db, get_read_db
from app.main import app

TEST_DB_URL = os.environ["DATABASE_URL"]


# ---------------------------------------------------------------------------
# Engine + schema lifecycle  (session-scoped: created once per pytest run)
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Truncate all tables for a clean slate at the start of this test session.
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def test_session_factory(test_engine):
    return async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


# ---------------------------------------------------------------------------
# FastAPI client with DB dependency overrides  (function-scoped)
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def client(test_session_factory):
    """
    AsyncClient wired to the FastAPI app.

    get_db and get_read_db are overridden so route handlers use the test DB.
    Each override opens a fresh session per request, matching the behaviour of
    the real get_db / get_read_db generators.  Overrides are cleared after each
    test to avoid cross-test pollution.
    """

    async def override_get_db():
        async with test_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def override_get_read_db():
        async with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_read_db] = override_get_read_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Cleanup helper
# ---------------------------------------------------------------------------


async def _cleanup_tenant(tenant_id: uuid.UUID, session_factory) -> None:
    """
    Delete all data for a tenant in FK-safe order.

    Called from the tenant fixture teardown.  By this point, the individual
    user/club fixtures have already run their own teardown — this function
    handles anything left behind (e.g. users created by /auth/register tests).

    Extend this function as new test files add endpoints that create bookings,
    staff profiles, skill history, payments, etc.
    """
    async with session_factory() as session:
        club_ids = (
            await session.execute(select(Club.id).where(Club.tenant_id == tenant_id))
        ).scalars().all()

        user_ids = (
            await session.execute(select(User.id).where(User.tenant_id == tenant_id))
        ).scalars().all()

        # --- Clubs: delete FK children before the club row ---
        if club_ids:
            court_ids = (
                await session.execute(
                    select(Court.id).where(Court.club_id.in_(club_ids))
                )
            ).scalars().all()
            if court_ids:
                await session.execute(
                    sql_delete(CourtBlackout).where(
                        CourtBlackout.court_id.in_(court_ids)
                    )
                )
                await session.execute(
                    sql_delete(Court).where(Court.club_id.in_(club_ids))
                )
            await session.execute(
                sql_delete(ClubSettings).where(ClubSettings.club_id.in_(club_ids))
            )
            await session.execute(
                sql_delete(OperatingHours).where(OperatingHours.club_id.in_(club_ids))
            )
            await session.execute(
                sql_delete(PricingRule).where(PricingRule.club_id.in_(club_ids))
            )
            await session.execute(
                sql_delete(MembershipPlan).where(MembershipPlan.club_id.in_(club_ids))
            )
            await session.execute(
                sql_delete(Club).where(Club.tenant_id == tenant_id)
            )

        # --- Users: delete FK children before the user row ---
        if user_ids:
            await session.execute(
                sql_delete(Wallet).where(Wallet.user_id.in_(user_ids))
            )
        await session.execute(
            sql_delete(TenantUser).where(TenantUser.tenant_id == tenant_id)
        )
        if user_ids:
            await session.execute(
                sql_delete(User).where(User.tenant_id == tenant_id)
            )

        # --- Tenant ---
        obj = await session.get(Tenant, tenant_id)
        if obj:
            await session.delete(obj)

        await session.commit()


# ---------------------------------------------------------------------------
# Seed fixtures  (function-scoped: unique data per test, cleaned up on teardown)
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def plan(test_session_factory):
    async with test_session_factory() as session:
        p = SubscriptionPlan(
            name="Pro Test Plan",
            max_clubs=-1,
            max_courts_per_club=-1,
            max_staff_users=-1,
            open_games_feature=True,
            waitlist_feature=True,
            white_label_enabled=False,
            analytics_enabled=True,
            price_per_month=Decimal("99.00"),
            setup_fee=Decimal("0.00"),
            trial_days=14,
        )
        session.add(p)
        await session.commit()
        await session.refresh(p)

    yield p

    async with test_session_factory() as session:
        obj = await session.get(SubscriptionPlan, p.id)
        if obj:
            await session.delete(obj)
            await session.commit()


@pytest_asyncio.fixture
async def tenant(plan, test_session_factory):
    subdomain = f"testclub-{uuid.uuid4().hex[:8]}"
    async with test_session_factory() as session:
        t = Tenant(
            name="Test Club",
            subdomain=subdomain,
            plan_id=plan.id,
            is_active=True,
        )
        session.add(t)
        await session.commit()
        await session.refresh(t)

    yield t

    await _cleanup_tenant(t.id, test_session_factory)


async def _create_user(
    tenant_id: uuid.UUID,
    email_prefix: str,
    full_name: str,
    role: TenantUserRole,
    session_factory,
) -> User:
    async with session_factory() as session:
        user = User(
            tenant_id=tenant_id,
            email=f"{email_prefix}-{uuid.uuid4().hex[:6]}@test.com",
            full_name=full_name,
            hashed_password=get_password_hash("Test1234!"),
            is_active=True,
        )
        session.add(user)
        await session.flush()
        session.add(TenantUser(tenant_id=tenant_id, user_id=user.id, role=role))
        await session.commit()
        await session.refresh(user)
    return user


async def _delete_user(user_id: uuid.UUID, session_factory) -> None:
    async with session_factory() as session:
        await session.execute(
            sql_delete(Wallet).where(Wallet.user_id == user_id)
        )
        await session.execute(
            sql_delete(TenantUser).where(TenantUser.user_id == user_id)
        )
        obj = await session.get(User, user_id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest_asyncio.fixture
async def player(tenant, test_session_factory):
    user = await _create_user(
        tenant.id, "player", "Test Player", TenantUserRole.player, test_session_factory
    )
    yield user
    await _delete_user(user.id, test_session_factory)


@pytest_asyncio.fixture
async def staff(tenant, test_session_factory):
    user = await _create_user(
        tenant.id, "staff", "Test Staff", TenantUserRole.staff, test_session_factory
    )
    yield user
    await _delete_user(user.id, test_session_factory)


@pytest_asyncio.fixture
async def admin(tenant, test_session_factory):
    user = await _create_user(
        tenant.id, "admin", "Test Admin", TenantUserRole.admin, test_session_factory
    )
    yield user
    await _delete_user(user.id, test_session_factory)


# ---------------------------------------------------------------------------
# Auth header helpers  (synchronous: pre-signed JWT, skips login round-trip)
# ---------------------------------------------------------------------------


@pytest.fixture
def player_headers(player, tenant):
    token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}


@pytest.fixture
def staff_headers(staff, tenant):
    token = create_access_token({"sub": str(staff.id), "tid": str(tenant.id)})
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}


@pytest.fixture
def admin_headers(admin, tenant):
    token = create_access_token({"sub": str(admin.id), "tid": str(tenant.id)})
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}


# ---------------------------------------------------------------------------
# Club seed fixture
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def club(tenant, test_session_factory):
    async with test_session_factory() as session:
        c = Club(
            tenant_id=tenant.id,
            name="Test Club HQ",
            address="1 Test Street",
            currency="GBP",
        )
        session.add(c)
        await session.flush()
        session.add(ClubSettings(club_id=c.id))
        await session.commit()
        await session.refresh(c)

    yield c

    async with test_session_factory() as session:
        court_ids = (
            await session.execute(select(Court.id).where(Court.club_id == c.id))
        ).scalars().all()
        if court_ids:
            await session.execute(
                sql_delete(CourtBlackout).where(CourtBlackout.court_id.in_(court_ids))
            )
            await session.execute(sql_delete(Court).where(Court.club_id == c.id))
        await session.execute(
            sql_delete(ClubSettings).where(ClubSettings.club_id == c.id)
        )
        await session.execute(
            sql_delete(OperatingHours).where(OperatingHours.club_id == c.id)
        )
        await session.execute(
            sql_delete(PricingRule).where(PricingRule.club_id == c.id)
        )
        await session.execute(
            sql_delete(MembershipPlan).where(MembershipPlan.club_id == c.id)
        )
        obj = await session.get(Club, c.id)
        if obj:
            await session.delete(obj)
        await session.commit()
