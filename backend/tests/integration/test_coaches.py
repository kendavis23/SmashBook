"""Integration tests for coach-popularity analytics endpoints (G7).

Coverage
--------
GET /analytics/coaches/clubs/{id}/popularity — role 403, tenant 404, empty
                                               state, measures + return_rate,
                                               ranking by sessions

Like the other analytics views, ``mv_coach_popularity`` is a materialized view,
not an ORM table, so ``Base.metadata.create_all`` does not build it. The
``coach_view`` fixture creates it from the exact DDL frozen in the migration
(single source of truth); seeded tests ``REFRESH`` it after committing real rows.
"""
import importlib.util
import pathlib
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import delete as sql_delete
from sqlalchemy import text

from app.db.models.booking import (
    Booking,
    BookingPlayer,
    BookingStatus,
    BookingType,
    PlayerRole,
)
from app.db.models.court import Court
from app.db.models.payment import Payment, PaymentMethod, PaymentState
from app.db.models.staff import StaffProfile, StaffRole
from app.db.models.user import TenantUserRole, User

NOW = datetime.now(timezone.utc)
RECENT = NOW - timedelta(days=5)  # a delivered (already-started) lesson

_MIGRATIONS = pathlib.Path(__file__).resolve().parents[2] / "app" / "db" / "migrations" / "versions"


def _load_view_ddl():
    """Import the frozen MV DDL constants from the create-view migration."""
    path = next(_MIGRATIONS.glob("*_create_coach_popularity_materialized_*.py"))
    spec = importlib.util.spec_from_file_location("_coach_mv_migration", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest_asyncio.fixture(scope="module")
async def coach_view(test_engine):
    """Create the coach_popularity materialized view in the test DB (per module)."""
    mig = _load_view_ddl()
    async with test_engine.begin() as conn:
        await conn.execute(text(f"DROP MATERIALIZED VIEW IF EXISTS {mig._VIEW_NAME}"))
        await conn.execute(text(mig._VIEW_SQL))
        await conn.execute(text(mig._INDEX_SQL))
    yield
    async with test_engine.begin() as conn:
        await conn.execute(text(f"DROP MATERIALIZED VIEW IF EXISTS {mig._VIEW_NAME}"))


async def _refresh(test_engine):
    async with test_engine.begin() as conn:
        await conn.execute(text("REFRESH MATERIALIZED VIEW mv_coach_popularity"))


async def _make_user(session, tenant_id, name) -> User:
    u = User(
        tenant_id=tenant_id,
        email=f"{uuid.uuid4().hex[:8]}@example.com",
        full_name=name,
        hashed_password="x",
        role=TenantUserRole.player,
    )
    session.add(u)
    await session.flush()
    return u


async def _lesson(session, club_id, court_id, coach_sp_id, players, btype, *, paid=None):
    """A delivered lesson led by ``coach_sp_id`` with the given player users.
    ``paid`` (optional) adds a succeeded payment on the booking by the first player."""
    b = Booking(
        club_id=club_id, court_id=court_id, booking_type=btype,
        status=BookingStatus.completed, start_datetime=RECENT,
        end_datetime=RECENT + timedelta(minutes=60),
        created_by_user_id=players[0].id, staff_profile_id=coach_sp_id,
    )
    session.add(b)
    await session.flush()
    for i, p in enumerate(players):
        session.add(BookingPlayer(
            booking_id=b.id, user_id=p.id,
            role=PlayerRole.organiser if i == 0 else PlayerRole.player,
            amount_due=Decimal("0.00"),
        ))
    if paid is not None:
        session.add(Payment(
            booking_id=b.id, club_id=club_id, user_id=players[0].id,
            amount=Decimal(paid), currency="GBP",
            payment_method=PaymentMethod.stripe_card, state=PaymentState.succeeded,
            created_at=RECENT,
        ))
    return b


@pytest_asyncio.fixture
async def seeded_coaches(club, test_session_factory, test_engine, coach_view):
    """A club with two coaches:

      Coach Z: 3 lessons; players P1, P2, P3; P1 attends twice (repeat).
               sessions=3, distinct=3, repeat=1, attendances=4, revenue=£60.
      Coach Y: 1 lesson; player P2 only.
               sessions=1, distinct=1, repeat=0, attendances=1, revenue=£10.
    """
    async with test_session_factory() as session:
        court = Court(club_id=club.id, name="Coach Court", surface_type="indoor", is_active=True)
        session.add(court)
        await session.flush()

        coach_z_user = await _make_user(session, club.tenant_id, "Coach Z")
        coach_y_user = await _make_user(session, club.tenant_id, "Coach Y")
        coach_z = StaffProfile(
            user_id=coach_z_user.id, club_id=club.id, role=StaffRole.trainer, is_active=True
        )
        coach_y = StaffProfile(
            user_id=coach_y_user.id, club_id=club.id, role=StaffRole.trainer, is_active=True
        )
        session.add_all([coach_z, coach_y])
        await session.flush()

        p1 = await _make_user(session, club.tenant_id, "Player 1")
        p2 = await _make_user(session, club.tenant_id, "Player 2")
        p3 = await _make_user(session, club.tenant_id, "Player 3")

        # Coach Z: 3 lessons, P1 attends two of them -> repeat client.
        await _lesson(session, club.id, court.id, coach_z.id, [p1], BookingType.lesson_individual, paid="40.00")
        await _lesson(session, club.id, court.id, coach_z.id, [p1, p2], BookingType.lesson_group)
        await _lesson(session, club.id, court.id, coach_z.id, [p3], BookingType.lesson_individual, paid="20.00")
        # Coach Y: 1 lesson with P2.
        await _lesson(session, club.id, court.id, coach_y.id, [p2], BookingType.lesson_individual, paid="10.00")

        await session.commit()
        ids = {
            "court": court.id,
            "coach_z_sp": coach_z.id, "coach_y_sp": coach_y.id,
            "coach_z_user": coach_z_user.id, "coach_y_user": coach_y_user.id,
            "players": [p1.id, p2.id, p3.id],
        }

    await _refresh(test_engine)
    yield ids

    async with test_session_factory() as session:
        await session.execute(sql_delete(Payment).where(Payment.club_id == club.id))
        # booking_players -> bookings cleared via club's bookings
        bk_ids = (await session.execute(
            text("SELECT id FROM bookings WHERE club_id = :c"), {"c": str(club.id)}
        )).scalars().all()
        if bk_ids:
            await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id.in_(bk_ids)))
            await session.execute(sql_delete(Booking).where(Booking.id.in_(bk_ids)))
        await session.execute(
            sql_delete(StaffProfile).where(StaffProfile.id.in_([ids["coach_z_sp"], ids["coach_y_sp"]]))
        )
        await session.execute(sql_delete(Court).where(Court.id == ids["court"]))
        for uid in [ids["coach_z_user"], ids["coach_y_user"], *ids["players"]]:
            obj = await session.get(User, uid)
            if obj:
                await session.delete(obj)
        await session.commit()
    await _refresh(test_engine)


_BASE = "/api/v1/analytics/coaches/clubs"


class TestRoleEnforcement:
    async def test_player_forbidden(self, client, player_headers, club, coach_view):
        resp = await client.get(f"{_BASE}/{club.id}/popularity", headers=player_headers)
        assert resp.status_code == 403


class TestTenantIsolation:
    async def test_other_tenants_club_returns_404(
        self, client, staff_headers, test_session_factory, plan, coach_view
    ):
        from app.db.models.club import Club
        from app.db.models.tenant import Tenant as TenantModel

        subdomain = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(
                name="Other Tenant", trading_name="Other Tenant",
                player_subdomain=subdomain, staff_subdomain=f"{subdomain}-staff",
                plan_id=plan.id, is_active=True,
            )
            session.add(t2)
            await session.flush()
            other_club = Club(tenant_id=t2.id, name="Other Club", currency="GBP")
            session.add(other_club)
            await session.commit()
            other_club_id, t2_id = other_club.id, t2.id

        try:
            resp = await client.get(
                f"{_BASE}/{other_club_id}/popularity", headers=staff_headers
            )
            assert resp.status_code == 404
        finally:
            async with test_session_factory() as session:
                await session.execute(sql_delete(Club).where(Club.id == other_club_id))
                obj = await session.get(TenantModel, t2_id)
                if obj:
                    await session.delete(obj)
                await session.commit()


class TestEmptyState:
    async def test_popularity_empty(self, client, staff_headers, club, coach_view, test_engine):
        await _refresh(test_engine)
        resp = await client.get(f"{_BASE}/{club.id}/popularity", headers=staff_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["rows"] == []
        assert body["total_records"] == 0


class TestCoachPopularity:
    async def test_measures_and_return_rate(self, client, staff_headers, club, seeded_coaches):
        resp = await client.get(f"{_BASE}/{club.id}/popularity", headers=staff_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_records"] == 2
        by_sp = {r["staff_profile_id"]: r for r in body["rows"]}

        z = by_sp[str(seeded_coaches["coach_z_sp"])]
        assert z["coach_name"] == "Coach Z"
        assert z["sessions"] == 3
        assert z["distinct_players"] == 3
        assert z["repeat_players"] == 1
        assert z["total_attendances"] == 4
        assert z["return_rate"] == pytest.approx(1 / 3)
        assert Decimal(z["lesson_revenue"]) == Decimal("60.00")

        y = by_sp[str(seeded_coaches["coach_y_sp"])]
        assert y["sessions"] == 1
        assert y["distinct_players"] == 1
        assert y["repeat_players"] == 0
        assert y["return_rate"] == 0.0
        assert Decimal(y["lesson_revenue"]) == Decimal("10.00")

    async def test_ranked_by_sessions_desc(self, client, staff_headers, club, seeded_coaches):
        resp = await client.get(
            f"{_BASE}/{club.id}/popularity?sort=sessions", headers=staff_headers
        )
        assert resp.status_code == 200
        rows = resp.json()["rows"]
        # Coach Z (3 sessions) ranks above Coach Y (1).
        assert rows[0]["staff_profile_id"] == str(seeded_coaches["coach_z_sp"])
        sessions = [r["sessions"] for r in rows]
        assert sessions == sorted(sessions, reverse=True)
