"""Integration tests for club-level player-flow analytics (G7, workstream A).

Coverage
--------
GET /analytics/players/clubs/{id}/active             — role 403, tenant 404,
                                                       empty state, trailing-window
                                                       distinct count
GET /analytics/players/clubs/{id}/active/timeseries  — calendar-bucketed active
GET /analytics/players/clubs/{id}/signups            — paid-only sign-up totals

``mv_club_active_player_day`` and ``mv_club_signups_day`` are materialized views,
not ORM tables, so ``Base.metadata.create_all`` does not build them. The
``flow_views`` fixture creates them from the DDL frozen in the migration; seeded
tests ``REFRESH`` them after committing real rows.
"""
import importlib.util
import pathlib
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

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
from app.db.models.membership import (
    BillingPeriod,
    MembershipPlan,
    MembershipStatus,
    MembershipSubscription,
)
from app.db.models.user import TenantUserRole, User

NOW = datetime.now(timezone.utc)

_MIGRATIONS = pathlib.Path(__file__).resolve().parents[2] / "app" / "db" / "migrations" / "versions"


def _load_view_ddl():
    path = next(_MIGRATIONS.glob("*_create_club_player_flow_materialized_*.py"))
    spec = importlib.util.spec_from_file_location("_flow_mv_migration", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest_asyncio.fixture(scope="module")
async def flow_views(test_engine):
    """Create both player-flow materialized views in the test DB (once/module)."""
    mig = _load_view_ddl()
    async with test_engine.begin() as conn:
        for view in (mig._ACTIVE_VIEW, mig._SIGNUPS_VIEW):
            await conn.execute(text(f"DROP MATERIALIZED VIEW IF EXISTS {view}"))
        await conn.execute(text(mig._ACTIVE_SQL))
        await conn.execute(text(mig._ACTIVE_INDEX))
        await conn.execute(text(mig._SIGNUPS_SQL))
        await conn.execute(text(mig._SIGNUPS_INDEX))
    yield
    async with test_engine.begin() as conn:
        for view in (mig._SIGNUPS_VIEW, mig._ACTIVE_VIEW):
            await conn.execute(text(f"DROP MATERIALIZED VIEW IF EXISTS {view}"))


async def _refresh(test_engine):
    async with test_engine.begin() as conn:
        await conn.execute(text("REFRESH MATERIALIZED VIEW mv_club_active_player_day"))
        await conn.execute(text("REFRESH MATERIALIZED VIEW mv_club_signups_day"))


async def _make_user(session, tenant_id, name) -> User:
    u = User(
        tenant_id=tenant_id, email=f"{uuid.uuid4().hex[:8]}@example.com",
        full_name=name, hashed_password="x", role=TenantUserRole.player,
    )
    session.add(u)
    await session.flush()
    return u


async def _play(session, club_id, court_id, user, start):
    b = Booking(
        club_id=club_id, court_id=court_id, booking_type=BookingType.regular,
        status=BookingStatus.completed, start_datetime=start,
        end_datetime=start + timedelta(minutes=90), created_by_user_id=user.id,
    )
    session.add(b)
    await session.flush()
    session.add(BookingPlayer(
        booking_id=b.id, user_id=user.id, role=PlayerRole.organiser,
        amount_due=Decimal("0.00"),
    ))
    return b.id


async def _subscribe(session, club_id, user, plan, created_at):
    s = MembershipSubscription(
        user_id=user.id, plan_id=plan.id, club_id=club_id,
        status=MembershipStatus.active,
        current_period_start=created_at,
        current_period_end=created_at + timedelta(days=30),
        created_at=created_at,
    )
    session.add(s)
    await session.flush()
    return s.id


@pytest_asyncio.fixture
async def seeded_flow(club, player, test_session_factory, test_engine, flow_views):
    """A club with:

      active: player A on 2 distinct days (4 & 6 days ago), player B once
              (3 days ago) -> 2 distinct active players in the last 30 days.
      signups: 2 paid subscriptions (10 & 20 days ago) + 1 free-plan
               subscription (15 days ago, must NOT count) -> total 2.
    """
    async with test_session_factory() as session:
        court = Court(club_id=club.id, name="Flow Court", surface_type="indoor", is_active=True)
        session.add(court)
        await session.flush()

        paid_plan = MembershipPlan(
            club_id=club.id, name="Gold", billing_period=BillingPeriod.monthly,
            price=Decimal("20.00"), is_active=True,
        )
        free_plan = MembershipPlan(
            club_id=club.id, name="Basic", billing_period=BillingPeriod.monthly,
            price=Decimal("0.00"), is_active=True,
        )
        session.add_all([paid_plan, free_plan])
        await session.flush()

        user_b = await _make_user(session, club.tenant_id, "Player B")

        bk = []
        bk.append(await _play(session, club.id, court.id, player, NOW - timedelta(days=4)))
        bk.append(await _play(session, club.id, court.id, player, NOW - timedelta(days=6)))
        bk.append(await _play(session, club.id, court.id, user_b, NOW - timedelta(days=3)))

        subs = []
        subs.append(await _subscribe(session, club.id, player, paid_plan, NOW - timedelta(days=10)))
        subs.append(await _subscribe(session, club.id, user_b, paid_plan, NOW - timedelta(days=20)))
        subs.append(await _subscribe(session, club.id, user_b, free_plan, NOW - timedelta(days=15)))

        await session.commit()
        ids = {
            "court": court.id, "paid_plan": paid_plan.id, "free_plan": free_plan.id,
            "user_b": user_b.id, "bookings": bk, "subs": subs,
        }

    await _refresh(test_engine)
    yield ids

    async with test_session_factory() as session:
        await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id.in_(ids["bookings"])))
        await session.execute(sql_delete(Booking).where(Booking.id.in_(ids["bookings"])))
        await session.execute(sql_delete(MembershipSubscription).where(
            MembershipSubscription.id.in_(ids["subs"])
        ))
        await session.execute(sql_delete(MembershipPlan).where(
            MembershipPlan.id.in_([ids["paid_plan"], ids["free_plan"]])
        ))
        await session.execute(sql_delete(Court).where(Court.id == ids["court"]))
        obj = await session.get(User, ids["user_b"])
        if obj:
            await session.delete(obj)
        await session.commit()
    await _refresh(test_engine)


class TestRoleEnforcement:
    async def test_player_forbidden(self, client, player_headers, club, flow_views):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/active", headers=player_headers
        )
        assert resp.status_code == 403


class TestTenantIsolation:
    async def test_other_tenants_club_returns_404(
        self, client, staff_headers, test_session_factory, plan, flow_views
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
                f"/api/v1/analytics/players/clubs/{other_club_id}/signups",
                headers=staff_headers,
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
    async def test_active_zero(self, client, staff_headers, club, flow_views, test_engine):
        await _refresh(test_engine)
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/active", headers=staff_headers
        )
        assert resp.status_code == 200
        assert resp.json()["active_players"] == 0

    async def test_signups_empty(self, client, staff_headers, club, flow_views, test_engine):
        await _refresh(test_engine)
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/signups", headers=staff_headers
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_signups"] == 0
        assert body["points"] == []


class TestActivePlayers:
    async def test_trailing_window_distinct(self, client, staff_headers, club, seeded_flow):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/active?window_days=30",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        # A played on 2 days, B on 1 -> 3 presence rows but 2 distinct players.
        assert body["active_players"] == 2
        assert body["window_days"] == 30

    async def test_window_excludes_older(self, client, staff_headers, club, seeded_flow):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/active?window_days=2",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        # Nobody played in the last 2 days (earliest play was 3 days ago).
        assert resp.json()["active_players"] == 0

    async def test_timeseries_non_empty(self, client, staff_headers, club, seeded_flow):
        date_from = (NOW - timedelta(days=14)).date().isoformat()
        date_to = NOW.date().isoformat()
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/active/timeseries"
            f"?granularity=day&date_from={date_from}&date_to={date_to}",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        points = resp.json()["points"]
        assert len(points) >= 2
        assert all(p["active_players"] >= 1 for p in points)


class TestSignups:
    async def test_paid_only_total(self, client, staff_headers, club, seeded_flow):
        date_from = (NOW - timedelta(days=30)).date().isoformat()
        date_to = NOW.date().isoformat()
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/signups"
            f"?granularity=month&date_from={date_from}&date_to={date_to}",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        # 2 paid subscriptions; the free-plan one is excluded.
        assert resp.json()["total_signups"] == 2

    async def test_range_cap_rejected(self, client, staff_headers, club, flow_views):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/signups"
            f"?date_from=2020-01-01&date_to=2026-01-01",
            headers=staff_headers,
        )
        assert resp.status_code == 413
