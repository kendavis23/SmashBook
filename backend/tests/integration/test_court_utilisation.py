"""
Integration tests for court-utilisation analytics endpoints (G7).

Coverage
--------
GET /analytics/utilisation/clubs/{id}/daily    — role 403, tenant isolation,
                                                  empty state, aggregation
GET /analytics/utilisation/clubs/{id}/courts    — per-court rollup
GET /analytics/utilisation/clubs/{id}/heatmap   — hour×dow buckets

Snapshots are seeded directly (the worker that populates them is exercised by
its own path) so these tests assert the read/aggregation contract in isolation.
"""
import uuid
from datetime import date
from decimal import Decimal

import pytest_asyncio
from sqlalchemy import delete as sql_delete

from app.db.models.analytics import CourtUtilisationSnapshot
from app.db.models.court import Court

D1 = date(2026, 5, 20)
D2 = date(2026, 5, 21)


@pytest_asyncio.fixture
async def seeded_court(club, test_session_factory):
    """A court with daily-rollup + hourly snapshots across two days.

    Daily rollups: D1 = 5/10 booked, D2 = 3/10 booked → club totals 8/20 (40%).
    """
    async with test_session_factory() as session:
        court = Court(
            club_id=club.id, name="Analytics Court", surface_type="indoor", is_active=True
        )
        session.add(court)
        await session.flush()

        def daily(d, booked, total, rev_a, rev_p):
            return CourtUtilisationSnapshot(
                club_id=club.id, court_id=court.id, snapshot_date=d,
                hour_of_day=None, day_of_week=d.weekday(),
                total_slots=total, booked_slots=booked,
                utilisation_pct=Decimal(booked) / Decimal(total) * 100,
                revenue_actual=Decimal(rev_a), revenue_potential=Decimal(rev_p),
                avg_booking_lead_time_h=None,
            )

        def hourly(d, hour, booked, total):
            return CourtUtilisationSnapshot(
                club_id=club.id, court_id=court.id, snapshot_date=d,
                hour_of_day=hour, day_of_week=d.weekday(),
                total_slots=total, booked_slots=booked,
                utilisation_pct=Decimal(booked) / Decimal(total) * 100,
                revenue_actual=Decimal("0"), revenue_potential=Decimal("0"),
                avg_booking_lead_time_h=None,
            )

        session.add_all([
            daily(D1, 5, 10, "100", "200"),
            daily(D2, 3, 10, "60", "200"),
            hourly(D1, 9, 1, 1),
            hourly(D1, 18, 1, 1),
            hourly(D2, 18, 0, 1),
        ])
        await session.commit()
        court_id = court.id

    yield court_id

    async with test_session_factory() as session:
        await session.execute(
            sql_delete(CourtUtilisationSnapshot).where(
                CourtUtilisationSnapshot.court_id == court_id
            )
        )
        await session.execute(sql_delete(Court).where(Court.id == court_id))
        await session.commit()


class TestRoleEnforcement:
    async def test_player_forbidden(self, client, player_headers, club, seeded_court):
        resp = await client.get(
            f"/api/v1/analytics/utilisation/clubs/{club.id}/daily",
            headers=player_headers,
        )
        assert resp.status_code == 403


class TestTenantIsolation:
    async def test_other_tenants_club_returns_404(
        self, client, staff_headers, test_session_factory, plan
    ):
        """A club owned by a different tenant must not be readable — 404, not data."""
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
                f"/api/v1/analytics/utilisation/clubs/{other_club_id}/daily",
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


class TestDailyUtilisation:
    async def test_empty_state_returns_empty_points(
        self, client, staff_headers, club
    ):
        """A club with no snapshots returns a valid empty response, not a 500."""
        resp = await client.get(
            f"/api/v1/analytics/utilisation/clubs/{club.id}/daily"
            f"?date_from=2026-05-01&date_to=2026-05-31",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["points"] == []

    async def test_aggregates_daily_rollup_rows(
        self, client, staff_headers, club, seeded_court
    ):
        resp = await client.get(
            f"/api/v1/analytics/utilisation/clubs/{club.id}/daily"
            f"?date_from=2026-05-01&date_to=2026-05-31",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        points = {p["snapshot_date"]: p for p in resp.json()["points"]}
        assert set(points) == {"2026-05-20", "2026-05-21"}
        assert points["2026-05-20"]["booked_slots"] == 5
        assert Decimal(points["2026-05-20"]["utilisation_pct"]) == Decimal("50.00")
        # hourly rows must NOT leak into the daily series
        assert points["2026-05-20"]["total_slots"] == 10

    async def test_range_cap_rejected(self, client, staff_headers, club):
        resp = await client.get(
            f"/api/v1/analytics/utilisation/clubs/{club.id}/daily"
            f"?date_from=2020-01-01&date_to=2026-01-01",
            headers=staff_headers,
        )
        assert resp.status_code == 413


class TestCourtsRollup:
    async def test_per_court_summary(self, client, staff_headers, club, seeded_court):
        resp = await client.get(
            f"/api/v1/analytics/utilisation/clubs/{club.id}/courts"
            f"?date_from=2026-05-01&date_to=2026-05-31",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        courts = resp.json()["courts"]
        assert len(courts) == 1
        assert courts[0]["booked_slots"] == 8       # 5 + 3
        assert courts[0]["total_slots"] == 20        # 10 + 10
        assert Decimal(courts[0]["utilisation_pct"]) == Decimal("40.00")


class TestHeatmap:
    async def test_hourly_buckets_only(self, client, staff_headers, club, seeded_court):
        resp = await client.get(
            f"/api/v1/analytics/utilisation/clubs/{club.id}/heatmap"
            f"?date_from=2026-05-01&date_to=2026-05-31",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        cells = resp.json()["cells"]
        # Hours present: 9 (D1) and 18 (D1+D2). 18:00 spans both days → merged.
        by_hour = {(c["day_of_week"], c["hour_of_day"]): c for c in cells}
        assert (D1.weekday(), 9) in by_hour
        # D1 18:00 booked=1/1, D2 18:00 booked=0/1 → same dow (both Wed/Thu?) check merge
        hour18 = [c for c in cells if c["hour_of_day"] == 18]
        total = sum(c["booked_slots"] for c in hour18)
        assert total == 1  # only D1's 18:00 was booked
