"""
Integration tests for /api/v1/auth endpoints.

Coverage
--------
POST /auth/register  — success, duplicate email, unknown tenant, short password
POST /auth/login     — success, wrong password, unknown email, inactive account
POST /auth/refresh   — success, wrong token type, garbage token
Cross-tenant        — token issued for tenant A rejected when presented to tenant B

Why these are integration tests (not unit tests)
------------------------------------------------
- Exercises the full HTTP stack: routing, TenantMiddleware, auth deps, DB writes
- Validates that Pydantic schema validation returns 422 (not visible in unit tests)
- Confirms that JWT claims (tid, type) are checked at the HTTP layer
- Verifies that TenantMiddleware correctly resolves (or ignores) tenants per request
"""

import uuid

import pytest

from app.core.security import create_access_token, create_refresh_token
from app.db.models.tenant import Tenant as TenantModel


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------


class TestRegister:
    async def test_success(self, client, tenant):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "tenant_subdomain": tenant.subdomain,
                "email": f"new-{uuid.uuid4().hex[:6]}@example.com",
                "full_name": "New Player",
                "password": "Password1!",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body
        assert body["token_type"] == "bearer"

    async def test_duplicate_email_returns_409(self, client, player, tenant):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "tenant_subdomain": tenant.subdomain,
                "email": player.email,
                "full_name": "Duplicate",
                "password": "Password1!",
            },
        )
        assert resp.status_code == 409

    async def test_unknown_tenant_returns_404(self, client):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "tenant_subdomain": f"no-such-{uuid.uuid4().hex[:8]}",
                "email": "someone@example.com",
                "full_name": "Nobody",
                "password": "Password1!",
            },
        )
        assert resp.status_code == 404

    async def test_short_password_returns_422(self, client, tenant):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "tenant_subdomain": tenant.subdomain,
                "email": "newplayer@example.com",
                "full_name": "New Player",
                "password": "short",  # < 8 chars
            },
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------


class TestLogin:
    async def test_success(self, client, player, tenant):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.subdomain,
                "email": player.email,
                "password": "Test1234!",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body

    async def test_wrong_password_returns_401(self, client, player, tenant):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.subdomain,
                "email": player.email,
                "password": "wrongpassword",
            },
        )
        assert resp.status_code == 401

    async def test_unknown_email_returns_401(self, client, tenant):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.subdomain,
                "email": "ghost@example.com",
                "password": "Test1234!",
            },
        )
        assert resp.status_code == 401

    async def test_inactive_user_returns_403(self, client, player, tenant, test_session_factory):
        from app.db.models.user import User

        async with test_session_factory() as session:
            u = await session.get(User, player.id)
            u.is_active = False
            await session.commit()

        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.subdomain,
                "email": player.email,
                "password": "Test1234!",
            },
        )
        assert resp.status_code == 403

        async with test_session_factory() as session:
            u = await session.get(User, player.id)
            u.is_active = True
            await session.commit()


# ---------------------------------------------------------------------------
# POST /api/v1/auth/refresh
# ---------------------------------------------------------------------------


class TestRefreshToken:
    async def test_success(self, client, player, tenant):
        refresh = create_refresh_token({"sub": str(player.id), "tid": str(tenant.id)})
        resp = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": refresh}
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body

    async def test_access_token_rejected_as_refresh(self, client, player, tenant):
        # Passing an access token where a refresh token is expected
        access = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
        resp = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": access}
        )
        assert resp.status_code == 401

    async def test_garbage_token_rejected(self, client):
        resp = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": "not.a.valid.token"}
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Cross-tenant rejection
# ---------------------------------------------------------------------------


class TestCrossTenantRejection:
    async def test_token_for_tenant_a_rejected_by_tenant_b(
        self, client, player, tenant, test_session_factory, plan
    ):
        """
        A JWT issued for tenant A must be rejected when the X-Tenant-ID header
        identifies tenant B.  This prevents token reuse across tenants.
        """
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

        token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
        resp = await client.get(
            "/api/v1/clubs",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Tenant-ID": str(t2.id),  # deliberate mismatch
            },
        )
        assert resp.status_code == 401

        async with test_session_factory() as session:
            obj = await session.get(TenantModel, t2.id)
            if obj:
                await session.delete(obj)
                await session.commit()
