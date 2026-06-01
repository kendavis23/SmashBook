"""
Integration tests for revenue ("Financials by club") analytics endpoints (G7).

Coverage
--------
GET /analytics/revenue/clubs/{id}/summary    — role 403, tenant 404, empty state,
                                                subtract-embedded aggregation
GET /analytics/revenue/clubs/{id}/by-type     — six-type split
GET /analytics/revenue/clubs/{id}/timeseries  — granularity rollup, range cap
GET /analytics/revenue/clubs                   — tenant-wide cross-club comparison

Unlike the snapshot tables, the revenue views are *materialized views*, not ORM
tables, so ``Base.metadata.create_all`` does not build them. The
``revenue_views`` fixture creates them in the test DB using the exact DDL frozen
in the migration (single source of truth), and seeded tests ``REFRESH`` them
after committing real payments/bookings.
"""
import importlib.util
import pathlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest_asyncio
from sqlalchemy import delete as sql_delete
from sqlalchemy import text

from app.db.models.booking import Booking, BookingType, BookingStatus
from app.db.models.court import Court
from app.db.models.equipment import EquipmentInventory, EquipmentRental, ItemType, ItemCondition
from app.db.models.payment import Payment, PaymentMethod, PaymentState

# A fixed instant: 10:00 UTC on 2026-05-20 -> 11:00 Europe/London, still 2026-05-20.
TS = datetime(2026, 5, 20, 10, 0, tzinfo=timezone.utc)
REVENUE_DATE = "2026-05-20"

_MIGRATIONS = pathlib.Path(__file__).resolve().parents[2] / "app" / "db" / "migrations" / "versions"


def _load_view_ddl():
    """Import the frozen MV DDL constants from the create-views migration."""
    path = next(_MIGRATIONS.glob("*_create_revenue_by_club_materialized_*.py"))
    spec = importlib.util.spec_from_file_location("_rev_mv_migration", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest_asyncio.fixture(scope="module")
async def revenue_views(test_engine):
    """Create both revenue materialized views in the test DB (once per module)."""
    mig = _load_view_ddl()
    async with test_engine.begin() as conn:
        for view_name, bucket_ts in mig._VIEWS.items():
            await conn.execute(text(f"DROP MATERIALIZED VIEW IF EXISTS {view_name}"))
            await conn.execute(text(mig._VIEW_SQL.format(view_name=view_name, bucket_ts=bucket_ts)))
            await conn.execute(
                text(mig._INDEX_SQL.format(index_name=f"ix_{view_name}_key", view_name=view_name))
            )
    yield
    async with test_engine.begin() as conn:
        for view_name in mig._VIEWS:
            await conn.execute(text(f"DROP MATERIALIZED VIEW IF EXISTS {view_name}"))


async def _refresh(test_engine):
    async with test_engine.begin() as conn:
        await conn.execute(text("REFRESH MATERIALIZED VIEW mv_revenue_by_club_day_service"))
        await conn.execute(text("REFRESH MATERIALIZED VIEW mv_revenue_by_club_day_cash"))


@pytest_asyncio.fixture
async def seeded_revenue(club, player, test_session_factory, test_engine, revenue_views):
    """One regular booking with a £50 payment that embeds an £8 equipment rental.

    Subtract-embedded expectation: regular net = 42.00, equipment net = 8.00,
    total net = 50.00 == payments.amount.
    """
    async with test_session_factory() as session:
        court = Court(club_id=club.id, name="Rev Court", surface_type="indoor", is_active=True)
        session.add(court)
        await session.flush()

        booking = Booking(
            club_id=club.id, court_id=court.id, booking_type=BookingType.regular,
            status=BookingStatus.completed, start_datetime=TS,
            end_datetime=TS, created_by_user_id=player.id, total_price=Decimal("50.00"),
        )
        session.add(booking)
        await session.flush()

        equip = EquipmentInventory(
            club_id=club.id, item_type=ItemType.racket, name="Racket",
            quantity_total=10, quantity_available=10, rental_price=Decimal("8.00"),
            condition=ItemCondition.good,
        )
        session.add(equip)
        await session.flush()

        # £8 rental embedded in the booking payment (payment_id NULL, same user).
        session.add(EquipmentRental(
            booking_id=booking.id, equipment_id=equip.id, user_id=player.id,
            quantity=1, charge=Decimal("8.00"),
        ))
        # payment.amount (50) = court (42) + embedded equipment (8)
        session.add(Payment(
            booking_id=booking.id, club_id=club.id, user_id=player.id,
            amount=Decimal("50.00"), currency="GBP",
            payment_method=PaymentMethod.stripe_card, state=PaymentState.succeeded,
            created_at=TS,
        ))
        await session.commit()
        ids = {"court": court.id, "booking": booking.id, "equip": equip.id}

    await _refresh(test_engine)
    yield ids

    async with test_session_factory() as session:
        await session.execute(sql_delete(Payment).where(Payment.booking_id == ids["booking"]))
        await session.execute(sql_delete(EquipmentRental).where(EquipmentRental.booking_id == ids["booking"]))
        await session.execute(sql_delete(EquipmentInventory).where(EquipmentInventory.id == ids["equip"]))
        await session.execute(sql_delete(Booking).where(Booking.id == ids["booking"]))
        await session.execute(sql_delete(Court).where(Court.id == ids["court"]))
        await session.commit()
    await _refresh(test_engine)


class TestRoleEnforcement:
    async def test_player_forbidden(self, client, player_headers, club, revenue_views):
        resp = await client.get(
            f"/api/v1/analytics/revenue/clubs/{club.id}/summary", headers=player_headers
        )
        assert resp.status_code == 403


class TestTenantIsolation:
    async def test_other_tenants_club_returns_404(
        self, client, staff_headers, test_session_factory, plan, revenue_views
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
                f"/api/v1/analytics/revenue/clubs/{other_club_id}/summary",
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
    async def test_summary_zeroed(self, client, staff_headers, club, revenue_views):
        resp = await client.get(
            f"/api/v1/analytics/revenue/clubs/{club.id}/summary"
            f"?date_from=2026-05-01&date_to=2026-05-31",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert Decimal(body["net_amount"]) == Decimal("0")
        assert body["transaction_count"] == 0
        assert body["by_type"] == []

    async def test_timeseries_empty(self, client, staff_headers, club, revenue_views):
        resp = await client.get(
            f"/api/v1/analytics/revenue/clubs/{club.id}/timeseries"
            f"?date_from=2026-05-01&date_to=2026-05-31",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["points"] == []


class TestRangeCap:
    async def test_range_cap_rejected(self, client, staff_headers, club, revenue_views):
        resp = await client.get(
            f"/api/v1/analytics/revenue/clubs/{club.id}/summary"
            f"?date_from=2020-01-01&date_to=2026-01-01",
            headers=staff_headers,
        )
        assert resp.status_code == 413


class TestAggregation:
    async def test_summary_subtract_embedded(
        self, client, staff_headers, club, seeded_revenue
    ):
        resp = await client.get(
            f"/api/v1/analytics/revenue/clubs/{club.id}/summary"
            f"?date_from=2026-05-01&date_to=2026-05-31&basis=service",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        # totals reconcile to payments.amount
        assert Decimal(body["gross_amount"]) == Decimal("50.00")
        assert Decimal(body["net_amount"]) == Decimal("50.00")
        assert body["transaction_count"] == 2  # regular + equipment rows
        by_type = {r["revenue_type"]: r for r in body["by_type"]}
        assert Decimal(by_type["regular"]["net_amount"]) == Decimal("42.00")
        assert Decimal(by_type["equipment"]["net_amount"]) == Decimal("8.00")

    async def test_by_type_split(self, client, staff_headers, club, seeded_revenue):
        resp = await client.get(
            f"/api/v1/analytics/revenue/clubs/{club.id}/by-type"
            f"?date_from=2026-05-01&date_to=2026-05-31",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        types = {r["revenue_type"] for r in resp.json()["rows"]}
        assert types == {"regular", "equipment"}

    async def test_timeseries_rollup_preserves_total(
        self, client, staff_headers, club, seeded_revenue
    ):
        for gran in ("day", "month"):
            resp = await client.get(
                f"/api/v1/analytics/revenue/clubs/{club.id}/timeseries"
                f"?date_from=2026-05-01&date_to=2026-05-31&granularity={gran}&basis=service",
                headers=staff_headers,
            )
            assert resp.status_code == 200
            points = resp.json()["points"]
            total = sum(Decimal(p["net_amount"]) for p in points)
            assert total == Decimal("50.00"), gran
            assert points[0]["period_start"] == REVENUE_DATE if gran == "day" else True

    async def test_cash_basis_buckets_by_payment_date(
        self, client, staff_headers, club, seeded_revenue
    ):
        resp = await client.get(
            f"/api/v1/analytics/revenue/clubs/{club.id}/summary"
            f"?date_from=2026-05-01&date_to=2026-05-31&basis=cash",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        assert Decimal(resp.json()["net_amount"]) == Decimal("50.00")


class TestCrossClub:
    async def test_tenant_comparison_includes_club(
        self, client, staff_headers, club, seeded_revenue
    ):
        resp = await client.get(
            "/api/v1/analytics/revenue/clubs"
            "?date_from=2026-05-01&date_to=2026-05-31&basis=service",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        rows = {r["club_id"]: r for r in resp.json()["clubs"]}
        assert str(club.id) in rows
        assert Decimal(rows[str(club.id)]["net_amount"]) == Decimal("50.00")
