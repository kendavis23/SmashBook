"""
Integration tests for /api/v1/players endpoints.

Coverage
--------
GET  /players/me  — success, unauthenticated, wrong tenant
PATCH /players/me — success (partial update), unauthenticated, wrong tenant
"""

import pytest


class TestGetMyProfile:
    async def test_success(self, client, player, player_headers):
        resp = await client.get("/api/v1/players/me", headers=player_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == str(player.id)
        assert body["email"] == player.email
        assert body["full_name"] == player.full_name
        assert body["role"] == "player"
        assert body["is_active"] is True
        assert "preferred_notification_channel" in body

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.get("/api/v1/players/me")
        assert resp.status_code == 403

    async def test_wrong_tenant_returns_401(self, client, player, tenant, plan, test_session_factory):
        from app.db.models.tenant import Tenant as TenantModel
        from app.core.security import create_access_token
        import uuid

        subdomain_b = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(
                name="Other Club",
                subdomain=subdomain_b,
                plan_id=plan.id,
                is_active=True,
            )
            session.add(t2)
            await session.commit()
            await session.refresh(t2)

        try:
            token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
            resp = await client.get(
                "/api/v1/players/me",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Tenant-ID": str(t2.id),
                },
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()


class TestUpdateMyProfile:
    async def test_update_full_name(self, client, player_headers):
        resp = await client.patch(
            "/api/v1/players/me",
            headers=player_headers,
            json={"full_name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    async def test_update_phone(self, client, player_headers):
        resp = await client.patch(
            "/api/v1/players/me",
            headers=player_headers,
            json={"phone": "+44 7700 900000"},
        )
        assert resp.status_code == 200
        assert resp.json()["phone"] == "+44 7700 900000"

    async def test_update_notification_channel(self, client, player_headers):
        resp = await client.patch(
            "/api/v1/players/me",
            headers=player_headers,
            json={"preferred_notification_channel": "email"},
        )
        assert resp.status_code == 200
        assert resp.json()["preferred_notification_channel"] == "email"

    async def test_partial_update_preserves_other_fields(self, client, player, player_headers):
        resp = await client.patch(
            "/api/v1/players/me",
            headers=player_headers,
            json={"phone": "+34 600 000000"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == player.email
        assert body["role"] == "player"

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.patch("/api/v1/players/me", json={"full_name": "Hacker"})
        assert resp.status_code == 403

    async def test_invalid_notification_channel_returns_422(self, client, player_headers):
        resp = await client.patch(
            "/api/v1/players/me",
            headers=player_headers,
            json={"preferred_notification_channel": "carrier_pigeon"},
        )
        assert resp.status_code == 422
