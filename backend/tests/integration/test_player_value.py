"""Integration tests for player-value analytics endpoints (G7, workstream B).

Coverage
--------
GET /analytics/players/clubs/{id}/value             — role 403, tenant 404,
                                                       empty state, LTV sort,
                                                       members_only filter
GET /analytics/players/clubs/{id}/most-active        — recent-activity ranking,
                                                       window validation
GET /analytics/players/clubs/{id}/inactive-members   — never-played + lapsed
                                                       members, denominator count

Like the revenue views, ``mv_player_value`` is a materialized view, not an ORM
table, so ``Base.metadata.create_all`` does not build it. The ``player_view``
fixture creates it from the exact DDL frozen in the migration (single source of
truth); seeded tests ``REFRESH`` it after committing real rows.
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
from app.db.models.payment import Payment, PaymentMethod, PaymentState
from app.db.models.user import TenantUserRole, User

NOW = datetime.now(timezone.utc)
RECENT = NOW - timedelta(days=5)  # played within 30d
STALE = NOW - timedelta(days=120)  # played > 90d ago

_MIGRATIONS = pathlib.Path(__file__).resolve().parents[2] / "app" / "db" / "migrations" / "versions"


def _load_view_ddl():
    """Import the frozen MV DDL constants from the create-view migration."""
    path = next(_MIGRATIONS.glob("*_create_player_value_materialized_*.py"))
    spec = importlib.util.spec_from_file_location("_pv_mv_migration", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest_asyncio.fixture(scope="module")
async def player_view(test_engine):
    """Create the player_value materialized view in the test DB (once per module)."""
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
        await conn.execute(text("REFRESH MATERIALIZED VIEW mv_player_value"))


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


async def _played(session, club_id, court_id, user, start) -> Booking:
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
    return b


async def _paid_subscription(session, club_id, user, plan):
    session.add(MembershipSubscription(
        user_id=user.id, plan_id=plan.id, club_id=club_id,
        status=MembershipStatus.active,
        current_period_start=NOW - timedelta(days=10),
        current_period_end=NOW + timedelta(days=20),
    ))


@pytest_asyncio.fixture
async def seeded_players(club, player, test_session_factory, test_engine, player_view):
    """A club with three players:

      A (`player`): paid member, played 5 days ago, spent £30 net.
      B          : paid member, NEVER played, no spend  -> inactive member.
      C          : non-member, played 5 days ago, spent £20 net.
    """
    async with test_session_factory() as session:
        court = Court(club_id=club.id, name="PV Court", surface_type="indoor", is_active=True)
        session.add(court)
        await session.flush()

        paid_plan = MembershipPlan(
            club_id=club.id, name="Gold", billing_period=BillingPeriod.monthly,
            price=Decimal("20.00"), is_active=True,
        )
        session.add(paid_plan)
        await session.flush()

        user_b = await _make_user(session, club.tenant_id, "Member B")
        user_c = await _make_user(session, club.tenant_id, "NonMember C")

        # A: paid member, recent play, £30 spend
        await _paid_subscription(session, club.id, player, paid_plan)
        b_a = await _played(session, club.id, court.id, player, RECENT)
        session.add(Payment(
            booking_id=b_a.id, club_id=club.id, user_id=player.id,
            amount=Decimal("30.00"), currency="GBP",
            payment_method=PaymentMethod.stripe_card, state=PaymentState.succeeded,
            created_at=RECENT,
        ))

        # B: paid member, never played, no payment
        await _paid_subscription(session, club.id, user_b, paid_plan)

        # C: non-member, recent play, £20 spend
        b_c = await _played(session, club.id, court.id, user_c, RECENT)
        session.add(Payment(
            booking_id=b_c.id, club_id=club.id, user_id=user_c.id,
            amount=Decimal("20.00"), currency="GBP",
            payment_method=PaymentMethod.stripe_card, state=PaymentState.succeeded,
            created_at=RECENT,
        ))

        await session.commit()
        ids = {
            "court": court.id, "plan": paid_plan.id,
            "user_b": user_b.id, "user_c": user_c.id,
            "booking_a": b_a.id, "booking_c": b_c.id,
        }

    await _refresh(test_engine)
    yield ids

    async with test_session_factory() as session:
        bks = [ids["booking_a"], ids["booking_c"]]
        await session.execute(sql_delete(Payment).where(Payment.booking_id.in_(bks)))
        await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id.in_(bks)))
        await session.execute(sql_delete(Booking).where(Booking.id.in_(bks)))
        await session.execute(sql_delete(MembershipSubscription).where(
            MembershipSubscription.club_id == club.id
        ))
        await session.execute(sql_delete(MembershipPlan).where(MembershipPlan.id == ids["plan"]))
        await session.execute(sql_delete(Court).where(Court.id == ids["court"]))
        for uid in (ids["user_b"], ids["user_c"]):
            obj = await session.get(User, uid)
            if obj:
                await session.delete(obj)
        await session.commit()
    await _refresh(test_engine)


class TestRoleEnforcement:
    async def test_player_forbidden(self, client, player_headers, club, player_view):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/value", headers=player_headers
        )
        assert resp.status_code == 403


class TestTenantIsolation:
    async def test_other_tenants_club_returns_404(
        self, client, staff_headers, test_session_factory, plan, player_view
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
                f"/api/v1/analytics/players/clubs/{other_club_id}/value",
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
    async def test_value_empty(self, client, staff_headers, club, player_view, test_engine):
        await _refresh(test_engine)
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/value", headers=staff_headers
        )
        assert resp.status_code == 200
        assert resp.json()["rows"] == []

    async def test_inactive_members_empty(
        self, client, staff_headers, club, player_view, test_engine
    ):
        await _refresh(test_engine)
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/inactive-members",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["member_count"] == 0
        assert body["inactive_count"] == 0
        assert body["rows"] == []


class TestValueLeaderboard:
    async def test_ltv_sort_and_net_spend(self, client, staff_headers, club, seeded_players):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/value?sort=lifetime_spend",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        rows = resp.json()["rows"]
        # A (£30) > C (£20) > B (£0); all three present
        spends = [Decimal(r["lifetime_spend"]) for r in rows]
        assert spends == sorted(spends, reverse=True)
        assert spends[0] == Decimal("30.00")
        assert {Decimal("30.00"), Decimal("20.00"), Decimal("0.00")} <= set(spends)

    async def test_members_only_filter(self, client, staff_headers, club, seeded_players):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/value?members_only=true",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        rows = resp.json()["rows"]
        # Only the two paid members (A, B); non-member C excluded.
        assert len(rows) == 2
        assert all(r["is_paid_member"] for r in rows)


class TestMostActive:
    async def test_recent_players_ranked(self, client, staff_headers, club, seeded_players):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/most-active?window_days=30",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        rows = resp.json()["rows"]
        # A and C played in the window; B (never played) is absent.
        assert len(rows) == 2
        assert all(r["played_last_30d"] >= 1 for r in rows)

    async def test_invalid_window_rejected(self, client, staff_headers, club, player_view):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/most-active?window_days=45",
            headers=staff_headers,
        )
        assert resp.status_code == 422


class TestInactiveMembers:
    async def test_never_played_member_listed(self, client, staff_headers, club, seeded_players):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/inactive-members?inactive_days=30",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        # Two paid members (A, B); only B is inactive (A played 5 days ago).
        assert body["member_count"] == 2
        assert body["inactive_count"] == 1
        assert len(body["rows"]) == 1
        row = body["rows"][0]
        assert row["is_paid_member"] is True
        assert row["last_played_at"] is None  # never played


class TestGroupValue:
    async def test_empty_state(self, client, staff_headers, club, player_view, test_engine):
        await _refresh(test_engine)
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/value/by-group", headers=staff_headers
        )
        assert resp.status_code == 200
        assert resp.json()["rows"] == []

    async def test_member_status_totals(self, client, staff_headers, club, seeded_players):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/value/by-group"
            f"?dimension=member_status",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        groups = {r["group_key"]: r for r in body["rows"]}
        # Paid members A (£30) + B (£0) = £30 across 2 players; non-member C = £20.
        assert groups["paid_member"]["player_count"] == 2
        assert groups["paid_member"]["paid_member_count"] == 2
        assert Decimal(groups["paid_member"]["total_lifetime_spend"]) == Decimal("30.00")
        assert Decimal(groups["paid_member"]["avg_lifetime_spend"]) == Decimal("15.00")
        assert groups["non_member"]["player_count"] == 1
        assert Decimal(groups["non_member"]["total_lifetime_spend"]) == Decimal("20.00")
        # ordered by total spend desc -> paid_member first
        assert body["rows"][0]["group_key"] == "paid_member"

    async def test_membership_tier_buckets(self, client, staff_headers, club, seeded_players):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/value/by-group"
            f"?dimension=membership_tier",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        groups = {r["group_key"]: r for r in resp.json()["rows"]}
        # A & B on the "Gold" paid plan; C collapses into "Non-member".
        assert groups["Gold"]["player_count"] == 2
        assert groups["Non-member"]["player_count"] == 1
        assert groups["Non-member"]["group_label"] == "Non-member"

    async def test_activity_status_split(self, client, staff_headers, club, seeded_players):
        resp = await client.get(
            f"/api/v1/analytics/players/clubs/{club.id}/value/by-group"
            f"?dimension=activity_status&inactive_days=30",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        groups = {r["group_key"]: r for r in body["rows"]}
        assert body["inactive_days"] == 30
        # A & C played 5 days ago -> active; B never played -> never_played.
        assert groups["active"]["player_count"] == 2
        assert groups["never_played"]["player_count"] == 1
        assert groups["never_played"]["group_label"] == "Never played"
