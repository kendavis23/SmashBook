"""
Integration tests for club endpoints.

Coverage
--------
POST   /clubs                       — success, role enforcement, plan club limit
GET    /clubs                       — lists only tenant's own clubs
GET    /clubs/{id}                  — success, 404 for unknown id
PATCH  /clubs/{id}                  — success, role enforcement
PATCH  /clubs/{id}/settings         — success, role enforcement
PUT    /clubs/{id}/operating-hours  — success, duplicate day rejected, role enforcement
GET    /clubs/{id}/operating-hours  — returns saved hours
PUT    /clubs/{id}/pricing-rules    — success, invalid day rejected, role enforcement
GET    /clubs/{id}/pricing-rules    — returns saved rules
"""

import uuid

import pytest


# ---------------------------------------------------------------------------
# POST /api/v1/clubs
# ---------------------------------------------------------------------------


class TestCreateClub:
    async def test_success(self, client, admin_headers, tenant):
        resp = await client.post(
            "/api/v1/clubs",
            json={"name": "New Court Club", "address": "10 Test Road", "currency": "GBP"},
            headers=admin_headers,
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "New Court Club"
        assert body["currency"] == "GBP"
        assert body["tenant_id"] == str(tenant.id)
        assert body["booking_duration_minutes"] is not None  # settings fields are flat on ClubResponse

    async def test_defaults_currency_to_gbp(self, client, admin_headers):
        resp = await client.post(
            "/api/v1/clubs",
            json={"name": "Currency Default Club"},
            headers=admin_headers,
        )
        assert resp.status_code == 201
        assert resp.json()["currency"] == "GBP"

    async def test_player_cannot_create_club(self, client, player_headers):
        resp = await client.post(
            "/api/v1/clubs",
            json={"name": "Unauthorised Club"},
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_staff_cannot_create_club(self, client, staff_headers):
        resp = await client.post(
            "/api/v1/clubs",
            json={"name": "Unauthorised Club"},
            headers=staff_headers,
        )
        assert resp.status_code == 403

    async def test_unauthenticated_returns_403(self, client, tenant):
        resp = await client.post(
            "/api/v1/clubs",
            json={"name": "No Auth Club"},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 403

    async def test_plan_club_limit_enforced(
        self, client, admin_headers, tenant, test_session_factory, plan
    ):
        """When the plan's max_clubs is 1 and one club already exists, creating
        another should return 403."""
        from app.db.models.tenant import SubscriptionPlan

        async with test_session_factory() as session:
            p = await session.get(SubscriptionPlan, plan.id)
            original = p.max_clubs
            p.max_clubs = 1
            await session.commit()

        # First club — should succeed
        r1 = await client.post(
            "/api/v1/clubs",
            json={"name": "Club One"},
            headers=admin_headers,
        )
        assert r1.status_code == 201

        # Second club — should be blocked
        r2 = await client.post(
            "/api/v1/clubs",
            json={"name": "Club Two"},
            headers=admin_headers,
        )
        assert r2.status_code == 403
        assert "maximum" in r2.json()["detail"].lower()

        # Restore plan limit
        async with test_session_factory() as session:
            p = await session.get(SubscriptionPlan, plan.id)
            p.max_clubs = original
            await session.commit()


# ---------------------------------------------------------------------------
# GET /api/v1/clubs
# ---------------------------------------------------------------------------


class TestListClubs:
    async def test_returns_tenant_clubs(self, client, player_headers, club):
        resp = await client.get("/api/v1/clubs", headers=player_headers)
        assert resp.status_code == 200
        ids = [c["id"] for c in resp.json()]
        assert str(club.id) in ids

    async def test_does_not_return_other_tenant_clubs(
        self, client, player_headers, club, test_session_factory, plan
    ):
        """Clubs belonging to a different tenant must not appear in the response."""
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
            resp = await client.get("/api/v1/clubs", headers=player_headers)
            assert resp.status_code == 200
            ids = [c["id"] for c in resp.json()]
            assert str(other_club_id) not in ids
        finally:
            async with test_session_factory() as session:
                await session.execute(
                    sql_delete(Club).where(Club.id == other_club_id)
                )
                obj = await session.get(TenantModel, t2_id)
                if obj:
                    await session.delete(obj)
                await session.commit()


# ---------------------------------------------------------------------------
# GET /api/v1/clubs/{id}
# ---------------------------------------------------------------------------


class TestGetClub:
    async def test_success(self, client, player_headers, club):
        resp = await client.get(f"/api/v1/clubs/{club.id}", headers=player_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == str(club.id)
        assert body["name"] == club.name
        assert body["booking_duration_minutes"] is not None

    async def test_unknown_id_returns_404(self, client, player_headers):
        resp = await client.get(
            f"/api/v1/clubs/{uuid.uuid4()}", headers=player_headers
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /api/v1/clubs/{id}
# ---------------------------------------------------------------------------


class TestUpdateClub:
    async def test_success(self, client, admin_headers, club):
        resp = await client.patch(
            f"/api/v1/clubs/{club.id}",
            json={"name": "Renamed Club", "currency": "USD"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Renamed Club"
        assert body["currency"] == "USD"

    async def test_player_cannot_update_club(self, client, player_headers, club):
        resp = await client.patch(
            f"/api/v1/clubs/{club.id}",
            json={"name": "Should Fail"},
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_unknown_id_returns_404(self, client, admin_headers, tenant):
        resp = await client.patch(
            f"/api/v1/clubs/{uuid.uuid4()}",
            json={"name": "Ghost"},
            headers=admin_headers,
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /api/v1/clubs/{id}/settings
# ---------------------------------------------------------------------------


class TestUpdateClubSettings:
    async def test_success(self, client, admin_headers, club):
        resp = await client.patch(
            f"/api/v1/clubs/{club.id}/settings",
            json={"booking_duration_minutes": 60, "cancellation_notice_hours": 24},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["booking_duration_minutes"] == 60
        assert body["cancellation_notice_hours"] == 24

    async def test_player_cannot_update_settings(self, client, player_headers, club):
        resp = await client.patch(
            f"/api/v1/clubs/{club.id}/settings",
            json={"booking_duration_minutes": 60},
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_partial_update_only_changes_provided_fields(
        self, client, admin_headers, club
    ):
        # Set a known baseline
        await client.patch(
            f"/api/v1/clubs/{club.id}/settings",
            json={"booking_duration_minutes": 90, "max_advance_booking_days": 14},
            headers=admin_headers,
        )
        # Update only one field
        resp = await client.patch(
            f"/api/v1/clubs/{club.id}/settings",
            json={"booking_duration_minutes": 45},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["booking_duration_minutes"] == 45
        assert resp.json()["max_advance_booking_days"] == 14  # unchanged


# ---------------------------------------------------------------------------
# PUT /api/v1/clubs/{id}/operating-hours
# ---------------------------------------------------------------------------


WEEKDAY_HOURS = [
    {"day_of_week": i, "open_time": "08:00:00", "close_time": "22:00:00"}
    for i in range(5)
]

FULL_WEEK_HOURS = [
    {"day_of_week": i, "open_time": "08:00:00", "close_time": "22:00:00"}
    for i in range(7)
]


class TestOperatingHours:
    async def test_set_and_retrieve(self, client, admin_headers, player_headers, club):
        put_resp = await client.put(
            f"/api/v1/clubs/{club.id}/operating-hours",
            json=WEEKDAY_HOURS,
            headers=admin_headers,
        )
        assert put_resp.status_code == 200
        assert len(put_resp.json()) == 5

        get_resp = await client.get(
            f"/api/v1/clubs/{club.id}/operating-hours",
            headers=player_headers,
        )
        assert get_resp.status_code == 200
        days = [entry["day_of_week"] for entry in get_resp.json()]
        assert days == [0, 1, 2, 3, 4]  # sorted by day_of_week

    async def test_replace_replaces_all_previous_hours(
        self, client, admin_headers, club
    ):
        await client.put(
            f"/api/v1/clubs/{club.id}/operating-hours",
            json=FULL_WEEK_HOURS,
            headers=admin_headers,
        )
        # Replace with weekdays only
        resp = await client.put(
            f"/api/v1/clubs/{club.id}/operating-hours",
            json=WEEKDAY_HOURS,
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 5  # weekend entries gone

    async def test_duplicate_day_returns_422(self, client, admin_headers, club):
        duplicate = [
            {"day_of_week": 0, "open_time": "08:00:00", "close_time": "22:00:00"},
            {"day_of_week": 0, "open_time": "09:00:00", "close_time": "21:00:00"},
        ]
        resp = await client.put(
            f"/api/v1/clubs/{club.id}/operating-hours",
            json=duplicate,
            headers=admin_headers,
        )
        assert resp.status_code == 422

    async def test_open_after_close_returns_422(self, client, admin_headers, club):
        resp = await client.put(
            f"/api/v1/clubs/{club.id}/operating-hours",
            json=[{"day_of_week": 0, "open_time": "22:00:00", "close_time": "08:00:00"}],
            headers=admin_headers,
        )
        assert resp.status_code == 422

    async def test_player_cannot_set_hours(self, client, player_headers, club):
        resp = await client.put(
            f"/api/v1/clubs/{club.id}/operating-hours",
            json=WEEKDAY_HOURS,
            headers=player_headers,
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# PUT /api/v1/clubs/{id}/pricing-rules
# ---------------------------------------------------------------------------


PEAK_RULE = {
    "label": "Peak",
    "day_of_week": 0,
    "start_time": "17:00:00",
    "end_time": "20:00:00",
    "price_per_slot": "25.00",
    "is_active": True,
}

OFF_PEAK_RULE = {
    "label": "Off Peak",
    "day_of_week": 0,
    "start_time": "08:00:00",
    "end_time": "17:00:00",
    "price_per_slot": "15.00",
    "is_active": True,
}

SURGE_RULE = {
    "label": "Surge",
    "day_of_week": 1,
    "start_time": "18:00:00",
    "end_time": "21:00:00",
    "price_per_slot": "20.00",
    "surge_trigger_pct": "80.00",
    "surge_max_pct": "50.00",
    "is_active": True,
}


class TestPricingRules:
    async def test_set_and_retrieve(self, client, admin_headers, player_headers, club):
        put_resp = await client.put(
            f"/api/v1/clubs/{club.id}/pricing-rules",
            json=[PEAK_RULE, OFF_PEAK_RULE],
            headers=admin_headers,
        )
        assert put_resp.status_code == 200
        assert len(put_resp.json()) == 2

        get_resp = await client.get(
            f"/api/v1/clubs/{club.id}/pricing-rules",
            headers=player_headers,
        )
        assert get_resp.status_code == 200
        labels = [r["label"] for r in get_resp.json()]
        assert "Peak" in labels
        assert "Off Peak" in labels

    async def test_replace_replaces_all_previous_rules(
        self, client, admin_headers, club
    ):
        await client.put(
            f"/api/v1/clubs/{club.id}/pricing-rules",
            json=[PEAK_RULE, OFF_PEAK_RULE],
            headers=admin_headers,
        )
        resp = await client.put(
            f"/api/v1/clubs/{club.id}/pricing-rules",
            json=[SURGE_RULE],
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["label"] == "Surge"

    async def test_surge_pricing_fields_saved(self, client, admin_headers, club):
        resp = await client.put(
            f"/api/v1/clubs/{club.id}/pricing-rules",
            json=[SURGE_RULE],
            headers=admin_headers,
        )
        assert resp.status_code == 200
        rule = resp.json()[0]
        assert rule["surge_trigger_pct"] == "80.00"
        assert rule["surge_max_pct"] == "50.00"

    async def test_mismatched_surge_pair_returns_422(self, client, admin_headers, club):
        bad_rule = {**PEAK_RULE, "surge_trigger_pct": "80.00"}  # surge_max_pct missing
        resp = await client.put(
            f"/api/v1/clubs/{club.id}/pricing-rules",
            json=[bad_rule],
            headers=admin_headers,
        )
        assert resp.status_code == 422

    async def test_invalid_day_of_week_returns_422(self, client, admin_headers, club):
        bad_rule = {**PEAK_RULE, "day_of_week": 7}  # 0–6 only
        resp = await client.put(
            f"/api/v1/clubs/{club.id}/pricing-rules",
            json=[bad_rule],
            headers=admin_headers,
        )
        assert resp.status_code == 422

    async def test_clear_all_rules(self, client, admin_headers, player_headers, club):
        await client.put(
            f"/api/v1/clubs/{club.id}/pricing-rules",
            json=[PEAK_RULE],
            headers=admin_headers,
        )
        resp = await client.put(
            f"/api/v1/clubs/{club.id}/pricing-rules",
            json=[],
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_player_cannot_set_pricing_rules(self, client, player_headers, club):
        resp = await client.put(
            f"/api/v1/clubs/{club.id}/pricing-rules",
            json=[PEAK_RULE],
            headers=player_headers,
        )
        assert resp.status_code == 403
