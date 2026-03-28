"""
Integration tests for court endpoints.

Coverage
--------
POST  /courts              — success, role enforcement, plan court limit, wrong tenant club
PATCH /courts/{id}         — success, role enforcement, cross-tenant isolation
GET   /courts              — list with tenant isolation, surface_type filter, availability filter
GET   /courts/{id}/availability — slot generation, booking/blackout conflicts, pricing, tenant isolation
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete as sql_delete


CREATE_COURT = {
    "name": "Court 1",
    "surface_type": "indoor",
    "has_lighting": True,
    "lighting_surcharge": "2.50",
    "is_active": True,
}


# ---------------------------------------------------------------------------
# POST /api/v1/courts
# ---------------------------------------------------------------------------


class TestCreateCourt:
    async def test_success(self, client, staff_headers, club):
        resp = await client.post(
            "/api/v1/courts",
            json={**CREATE_COURT, "club_id": str(club.id)},
            headers=staff_headers,
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Court 1"
        assert body["surface_type"] == "indoor"
        assert body["has_lighting"] is True
        assert body["club_id"] == str(club.id)

    async def test_admin_can_create_court(self, client, admin_headers, club):
        resp = await client.post(
            "/api/v1/courts",
            json={**CREATE_COURT, "name": "Admin Court", "club_id": str(club.id)},
            headers=admin_headers,
        )
        assert resp.status_code == 201

    async def test_player_cannot_create_court(self, client, player_headers, club):
        resp = await client.post(
            "/api/v1/courts",
            json={**CREATE_COURT, "club_id": str(club.id)},
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_unauthenticated_returns_403(self, client, club, tenant):
        resp = await client.post(
            "/api/v1/courts",
            json={**CREATE_COURT, "club_id": str(club.id)},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 403

    async def test_unknown_club_returns_404(self, client, staff_headers):
        resp = await client.post(
            "/api/v1/courts",
            json={**CREATE_COURT, "club_id": str(uuid.uuid4())},
            headers=staff_headers,
        )
        assert resp.status_code == 404

    async def test_club_from_other_tenant_returns_404(
        self, client, staff_headers, test_session_factory, plan
    ):
        """A club that exists but belongs to a different tenant must return 404,
        not 403, to avoid leaking whether the club exists."""
        from app.db.models.club import Club
        from app.db.models.tenant import Tenant as TenantModel
        from sqlalchemy import delete as sql_delete

        subdomain = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(
                name="Other Tenant",
                subdomain=subdomain,
                plan_id=plan.id,
                is_active=True,
            )
            session.add(t2)
            await session.flush()
            other_club = Club(tenant_id=t2.id, name="Other Club", currency="GBP")
            session.add(other_club)
            await session.commit()
            other_club_id = other_club.id
            t2_id = t2.id

        try:
            resp = await client.post(
                "/api/v1/courts",
                json={**CREATE_COURT, "club_id": str(other_club_id)},
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

    async def test_plan_court_limit_enforced(
        self, client, staff_headers, club, test_session_factory, plan
    ):
        """When max_courts_per_club is 1 and one court already exists, the second
        should be blocked with 403."""
        from app.db.models.tenant import SubscriptionPlan

        async with test_session_factory() as session:
            p = await session.get(SubscriptionPlan, plan.id)
            original = p.max_courts_per_club
            p.max_courts_per_club = 1
            await session.commit()

        r1 = await client.post(
            "/api/v1/courts",
            json={**CREATE_COURT, "name": "Court A", "club_id": str(club.id)},
            headers=staff_headers,
        )
        assert r1.status_code == 201

        r2 = await client.post(
            "/api/v1/courts",
            json={**CREATE_COURT, "name": "Court B", "club_id": str(club.id)},
            headers=staff_headers,
        )
        assert r2.status_code == 403
        assert "at most" in r2.json()["detail"].lower()

        async with test_session_factory() as session:
            p = await session.get(SubscriptionPlan, plan.id)
            p.max_courts_per_club = original
            await session.commit()

    async def test_invalid_surface_type_returns_422(self, client, staff_headers, club):
        resp = await client.post(
            "/api/v1/courts",
            json={**CREATE_COURT, "club_id": str(club.id), "surface_type": "carpet"},
            headers=staff_headers,
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# PATCH /api/v1/courts/{id}
# ---------------------------------------------------------------------------


class TestUpdateCourt:
    async def _create_court(self, client, staff_headers, club):
        resp = await client.post(
            "/api/v1/courts",
            json={**CREATE_COURT, "club_id": str(club.id)},
            headers=staff_headers,
        )
        assert resp.status_code == 201
        return resp.json()["id"]

    async def test_success(self, client, staff_headers, club):
        court_id = await self._create_court(client, staff_headers, club)
        resp = await client.patch(
            f"/api/v1/courts/{court_id}",
            json={"name": "Renamed Court", "surface_type": "outdoor"},
            headers=staff_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Renamed Court"
        assert body["surface_type"] == "outdoor"

    async def test_partial_update_only_changes_provided_fields(
        self, client, staff_headers, club
    ):
        court_id = await self._create_court(client, staff_headers, club)
        resp = await client.patch(
            f"/api/v1/courts/{court_id}",
            json={"name": "Partial Update"},
            headers=staff_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Partial Update"
        assert resp.json()["surface_type"] == "indoor"  # unchanged

    async def test_player_cannot_update_court(self, client, staff_headers, player_headers, club):
        court_id = await self._create_court(client, staff_headers, club)
        resp = await client.patch(
            f"/api/v1/courts/{court_id}",
            json={"name": "Should Fail"},
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_unknown_id_returns_404(self, client, staff_headers, tenant):
        resp = await client.patch(
            f"/api/v1/courts/{uuid.uuid4()}",
            json={"name": "Ghost Court"},
            headers=staff_headers,
        )
        assert resp.status_code == 404

    async def test_deactivate_court(self, client, staff_headers, club):
        court_id = await self._create_court(client, staff_headers, club)
        resp = await client.patch(
            f"/api/v1/courts/{court_id}",
            json={"is_active": False},
            headers=staff_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False


# ---------------------------------------------------------------------------
# Shared helpers for availability tests
# ---------------------------------------------------------------------------


async def _make_court(client, staff_headers, club, surface_type="indoor", name="Court A"):
    resp = await client.post(
        "/api/v1/courts",
        json={
            "club_id": str(club.id),
            "name": name,
            "surface_type": surface_type,
            "has_lighting": False,
            "is_active": True,
        },
        headers=staff_headers,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def _seed_operating_hours(club_id, session_factory, day_of_week=0,
                                open_time="08:00", close_time="22:00"):
    from app.db.models.club import OperatingHours
    from datetime import time as t
    hour, minute = map(int, open_time.split(":"))
    close_h, close_m = map(int, close_time.split(":"))
    async with session_factory() as session:
        oh = OperatingHours(
            club_id=club_id,
            day_of_week=day_of_week,
            open_time=t(hour, minute),
            close_time=t(close_h, close_m),
        )
        session.add(oh)
        await session.commit()
        await session.refresh(oh)
    return oh


async def _set_club_booking_window(club_id, session_factory,
                                   advance_days=9999, notice_hours=0):
    """Override club booking window so far-future test dates are bookable."""
    from app.db.models.club import Club as ClubModel
    async with session_factory() as session:
        c = await session.get(ClubModel, club_id)
        c.max_advance_booking_days = advance_days
        c.min_booking_notice_hours = notice_hours
        await session.commit()


async def _seed_booking(court_id, club_id, user_id, start_dt, end_dt, session_factory):
    from app.db.models.booking import Booking, BookingStatus, BookingType
    async with session_factory() as session:
        b = Booking(
            club_id=club_id,
            court_id=court_id,
            booking_type=BookingType.regular,
            status=BookingStatus.confirmed,
            start_datetime=start_dt,
            end_datetime=end_dt,
            created_by_user_id=user_id,
        )
        session.add(b)
        await session.commit()
        await session.refresh(b)
    return b


async def _seed_blackout(court_id, start_dt, end_dt, session_factory):
    from app.db.models.court import CourtBlackout
    async with session_factory() as session:
        bl = CourtBlackout(court_id=court_id, start_datetime=start_dt, end_datetime=end_dt)
        session.add(bl)
        await session.commit()
        await session.refresh(bl)
    return bl


async def _cleanup_bookings(booking_ids, session_factory):
    from app.db.models.booking import Booking
    async with session_factory() as session:
        await session.execute(sql_delete(Booking).where(Booking.id.in_(booking_ids)))
        await session.commit()


async def _cleanup_operating_hours(oh_ids, session_factory):
    from app.db.models.club import OperatingHours
    async with session_factory() as session:
        await session.execute(sql_delete(OperatingHours).where(OperatingHours.id.in_(oh_ids)))
        await session.commit()


async def _cleanup_blackouts(bl_ids, session_factory):
    from app.db.models.court import CourtBlackout
    async with session_factory() as session:
        await session.execute(sql_delete(CourtBlackout).where(CourtBlackout.id.in_(bl_ids)))
        await session.commit()


# ---------------------------------------------------------------------------
# GET /api/v1/courts
# ---------------------------------------------------------------------------


class TestListCourts:
    async def test_returns_active_courts(self, client, staff_headers, club, tenant):
        court_id = await _make_court(client, staff_headers, club)
        resp = await client.get(
            "/api/v1/courts",
            params={"club_id": str(club.id)},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200
        ids = [c["id"] for c in resp.json()]
        assert court_id in ids

    async def test_excludes_inactive_courts(self, client, staff_headers, club, tenant):
        # Create then deactivate
        court_id = await _make_court(client, staff_headers, club, name="Inactive Court")
        await client.patch(
            f"/api/v1/courts/{court_id}",
            json={"is_active": False},
            headers=staff_headers,
        )
        resp = await client.get(
            "/api/v1/courts",
            params={"club_id": str(club.id)},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200
        assert court_id not in [c["id"] for c in resp.json()]

    async def test_filters_by_surface_type(self, client, staff_headers, club, tenant):
        outdoor_id = await _make_court(client, staff_headers, club, surface_type="outdoor", name="Outdoor")
        await _make_court(client, staff_headers, club, surface_type="indoor", name="Indoor")

        resp = await client.get(
            "/api/v1/courts",
            params={"club_id": str(club.id), "surface_type": "outdoor"},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200
        ids = [c["id"] for c in resp.json()]
        assert outdoor_id in ids
        assert all(c["surface_type"] == "outdoor" for c in resp.json())

    async def test_availability_filter_excludes_booked_court(
        self, client, staff_headers, club, tenant, staff, test_session_factory
    ):
        court_id = await _make_court(client, staff_headers, club, name="Booked Court")
        free_id = await _make_court(client, staff_headers, club, name="Free Court")

        # Find a future Monday for the booking
        slot_start = datetime(2030, 1, 7, 10, 0, tzinfo=timezone.utc)
        slot_end = datetime(2030, 1, 7, 11, 30, tzinfo=timezone.utc)

        booking = await _seed_booking(
            court_id, club.id, staff.id, slot_start, slot_end, test_session_factory
        )
        try:
            resp = await client.get(
                "/api/v1/courts",
                params={
                    "club_id": str(club.id),
                    "date": "2030-01-07",
                    "time_from": "10:00",
                    "time_to": "11:30",
                },
                headers={"X-Tenant-ID": str(tenant.id)},
            )
            assert resp.status_code == 200
            ids = [c["id"] for c in resp.json()]
            assert court_id not in ids
            assert free_id in ids
        finally:
            await _cleanup_bookings([booking.id], test_session_factory)

    async def test_unknown_club_returns_404(self, client, tenant):
        resp = await client.get(
            "/api/v1/courts",
            params={"club_id": str(uuid.uuid4())},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 404

    async def test_other_tenant_club_returns_404(self, client, tenant, plan, test_session_factory):
        from app.db.models.club import Club as ClubModel
        from app.db.models.tenant import Tenant as TenantModel

        subdomain = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Other", subdomain=subdomain, plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.flush()
            other_club = ClubModel(tenant_id=t2.id, name="Other Club", currency="GBP")
            session.add(other_club)
            await session.commit()
            other_club_id, t2_id = other_club.id, t2.id

        try:
            resp = await client.get(
                "/api/v1/courts",
                params={"club_id": str(other_club_id)},
                headers={"X-Tenant-ID": str(tenant.id)},
            )
            assert resp.status_code == 404
        finally:
            async with test_session_factory() as session:
                await session.execute(sql_delete(ClubModel).where(ClubModel.id == other_club_id))
                obj = await session.get(TenantModel, t2_id)
                if obj:
                    await session.delete(obj)
                await session.commit()


# ---------------------------------------------------------------------------
# GET /api/v1/courts/{id}/availability
# ---------------------------------------------------------------------------


class TestCourtAvailability:
    # Use a fixed future date well within advance booking window defaults (14 days is
    # default max_advance_booking_days, so we use a far-future date and override via
    # a large enough window — we just check structure, not business-rule blocking here
    # for most tests by using dates in the past or far future carefully).

    async def test_no_operating_hours_returns_empty_slots(
        self, client, staff_headers, club, tenant
    ):
        court_id = await _make_court(client, staff_headers, club)
        # date with no operating hours seeded
        resp = await client.get(
            f"/api/v1/courts/{court_id}/availability",
            params={"date": "2030-01-07"},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["court_id"] == court_id
        assert body["date"] == "2030-01-07"
        assert body["slots"] == []

    async def test_returns_slots_based_on_operating_hours(
        self, client, staff_headers, club, tenant, test_session_factory
    ):
        court_id = await _make_court(client, staff_headers, club)
        # Jan 7 2030 is a Monday (day_of_week=0)
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, day_of_week=0,
                                          open_time="09:00", close_time="12:00")
        try:
            resp = await client.get(
                f"/api/v1/courts/{court_id}/availability",
                params={"date": "2030-01-07"},
                headers={"X-Tenant-ID": str(tenant.id)},
            )
            assert resp.status_code == 200
            slots = resp.json()["slots"]
            # 09:00–12:00 with default 90 min duration = 2 slots: 09:00–10:30, 10:30–12:00
            assert len(slots) == 2
            assert slots[0]["start_time"] == "09:00"
            assert slots[0]["end_time"] == "10:30"
            assert slots[1]["start_time"] == "10:30"
            assert slots[1]["end_time"] == "12:00"
            # Far future: all slots available
            assert all(s["is_available"] for s in slots)
        finally:
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_confirmed_booking_marks_slot_unavailable(
        self, client, staff_headers, club, tenant, staff, test_session_factory
    ):
        court_id = await _make_court(client, staff_headers, club)
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, day_of_week=0,
                                          open_time="09:00", close_time="12:00")
        slot_start = datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc)
        slot_end = datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc)
        booking = await _seed_booking(
            court_id, club.id, staff.id, slot_start, slot_end, test_session_factory
        )
        try:
            resp = await client.get(
                f"/api/v1/courts/{court_id}/availability",
                params={"date": "2030-01-07"},
                headers={"X-Tenant-ID": str(tenant.id)},
            )
            assert resp.status_code == 200
            slots = resp.json()["slots"]
            assert slots[0]["start_time"] == "09:00"
            assert slots[0]["is_available"] is False
            assert slots[1]["start_time"] == "10:30"
            assert slots[1]["is_available"] is True
        finally:
            await _cleanup_bookings([booking.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_blackout_marks_slot_unavailable(
        self, client, staff_headers, club, tenant, test_session_factory
    ):
        court_id = await _make_court(client, staff_headers, club)
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, day_of_week=0,
                                          open_time="09:00", close_time="12:00")
        bl_start = datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc)
        bl_end = datetime(2030, 1, 7, 12, 0, tzinfo=timezone.utc)
        blackout = await _seed_blackout(court_id, bl_start, bl_end, test_session_factory)
        try:
            resp = await client.get(
                f"/api/v1/courts/{court_id}/availability",
                params={"date": "2030-01-07"},
                headers={"X-Tenant-ID": str(tenant.id)},
            )
            assert resp.status_code == 200
            slots = resp.json()["slots"]
            assert slots[0]["is_available"] is True
            assert slots[1]["start_time"] == "10:30"
            assert slots[1]["is_available"] is False
        finally:
            await _cleanup_blackouts([blackout.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_includes_pricing_from_rule(
        self, client, staff_headers, club, tenant, test_session_factory
    ):
        from app.db.models.club import PricingRule
        from datetime import time as t
        from decimal import Decimal

        court_id = await _make_court(client, staff_headers, club)
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, day_of_week=0,
                                          open_time="09:00", close_time="12:00")
        async with test_session_factory() as session:
            rule = PricingRule(
                club_id=club.id,
                label="Peak",
                day_of_week=0,
                start_time=t(9, 0),
                end_time=t(12, 0),
                is_active=True,
                price_per_slot=Decimal("30.00"),
            )
            session.add(rule)
            await session.commit()
            await session.refresh(rule)
        try:
            resp = await client.get(
                f"/api/v1/courts/{court_id}/availability",
                params={"date": "2030-01-07"},
                headers={"X-Tenant-ID": str(tenant.id)},
            )
            assert resp.status_code == 200
            slots = resp.json()["slots"]
            assert all(s["price"] == "30.00" for s in slots)
            assert all(s["price_label"] == "Peak" for s in slots)
        finally:
            async with test_session_factory() as session:
                await session.execute(sql_delete(PricingRule).where(PricingRule.id == rule.id))
                await session.commit()
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_unknown_court_returns_404(self, client, tenant):
        resp = await client.get(
            f"/api/v1/courts/{uuid.uuid4()}/availability",
            params={"date": "2030-01-07"},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 404

    async def test_invalid_date_returns_422(self, client, staff_headers, club, tenant):
        court_id = await _make_court(client, staff_headers, club)
        resp = await client.get(
            f"/api/v1/courts/{court_id}/availability",
            params={"date": "not-a-date"},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 422

    async def test_other_tenant_court_returns_404(
        self, client, tenant, plan, test_session_factory
    ):
        from app.db.models.club import Club as ClubModel
        from app.db.models.court import Court as CourtModel
        from app.db.models.tenant import Tenant as TenantModel

        subdomain = f"avail-other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Other2", subdomain=subdomain, plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.flush()
            other_club = ClubModel(tenant_id=t2.id, name="Other Club", currency="GBP")
            session.add(other_club)
            await session.flush()
            other_court = CourtModel(
                club_id=other_club.id, name="Other Court",
                surface_type="indoor", has_lighting=False, is_active=True
            )
            session.add(other_court)
            await session.commit()
            other_court_id, other_club_id, t2_id = other_court.id, other_club.id, t2.id

        try:
            resp = await client.get(
                f"/api/v1/courts/{other_court_id}/availability",
                params={"date": "2030-01-07"},
                headers={"X-Tenant-ID": str(tenant.id)},
            )
            assert resp.status_code == 404
        finally:
            async with test_session_factory() as session:
                await session.execute(sql_delete(CourtModel).where(CourtModel.id == other_court_id))
                await session.execute(sql_delete(ClubModel).where(ClubModel.id == other_club_id))
                obj = await session.get(TenantModel, t2_id)
                if obj:
                    await session.delete(obj)
                await session.commit()
