"""
Integration tests for court endpoints.

Coverage
--------
POST  /courts              — success, role enforcement, plan court limit, wrong tenant club
PATCH /courts/{id}         — success, role enforcement, cross-tenant isolation
"""

import uuid

import pytest


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
        from app.db.models.club import Club, ClubSettings
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
            await session.flush()
            session.add(ClubSettings(club_id=other_club.id))
            await session.commit()
            other_club_id = other_club.id
            t2_id = t2.id

        resp = await client.post(
            "/api/v1/courts",
            json={**CREATE_COURT, "club_id": str(other_club_id)},
            headers=staff_headers,
        )
        assert resp.status_code == 404

        # Cleanup
        async with test_session_factory() as session:
            await session.execute(
                sql_delete(ClubSettings).where(ClubSettings.club_id == other_club_id)
            )
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
        assert "maximum" in r2.json()["detail"].lower()

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
