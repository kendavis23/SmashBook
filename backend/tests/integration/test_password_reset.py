"""
Integration tests for password reset endpoints.

Coverage
--------
POST /api/v1/auth/password-reset/request
  - Valid email returns 202 and publishes notification event
  - Unknown email still returns 202 (prevents user enumeration)
  - Inactive user returns 202 but does not publish

POST /api/v1/auth/password-reset/confirm
  - Valid token sets new password; new password works for login
  - Invalid/garbage token returns 400
  - Access token (wrong type) returns 400
  - Expired token returns 400

Pub/Sub is patched so no GCP calls are made.
"""
from datetime import datetime, timedelta
from unittest.mock import patch

from app.core.security import create_reset_token, create_access_token
from app.db.models.user import User
from tests.integration.conftest import _create_user, _delete_user
from app.db.models.user import TenantUserRole


PATCH_TARGET = "app.api.v1.endpoints.auth.publish_notification_event"


# ---------------------------------------------------------------------------
# POST /api/v1/auth/password-reset/request
# ---------------------------------------------------------------------------


class TestPasswordResetRequest:
    async def test_valid_email_returns_202_and_publishes(self, client, player, tenant):
        with patch(PATCH_TARGET) as mock_publish:
            resp = await client.post(
                "/api/v1/auth/password-reset/request",
                json={"tenant_subdomain": tenant.subdomain, "email": player.email},
            )
        assert resp.status_code == 202
        mock_publish.assert_called_once()
        event_type, payload = mock_publish.call_args.args
        assert event_type == "password_reset"
        assert payload["email"] == player.email
        assert "reset_url" in payload
        assert "token=" in payload["reset_url"]

    async def test_unknown_email_returns_202_no_publish(self, client, tenant):
        with patch(PATCH_TARGET) as mock_publish:
            resp = await client.post(
                "/api/v1/auth/password-reset/request",
                json={
                    "tenant_subdomain": tenant.subdomain,
                    "email": "nobody@example.com",
                },
            )
        assert resp.status_code == 202
        mock_publish.assert_not_called()

    async def test_inactive_user_returns_202_no_publish(
        self, client, tenant, test_session_factory
    ):
        user = await _create_user(
            tenant.id, "inactive-reset", "Inactive User", TenantUserRole.player, test_session_factory
        )
        async with test_session_factory() as session:
            u = await session.get(User, user.id)
            u.is_active = False
            await session.commit()

        try:
            with patch(PATCH_TARGET) as mock_publish:
                resp = await client.post(
                    "/api/v1/auth/password-reset/request",
                    json={"tenant_subdomain": tenant.subdomain, "email": user.email},
                )
            assert resp.status_code == 202
            mock_publish.assert_not_called()
        finally:
            await _delete_user(user.id, test_session_factory)


# ---------------------------------------------------------------------------
# POST /api/v1/auth/password-reset/confirm
# ---------------------------------------------------------------------------


class TestPasswordResetConfirm:
    async def test_valid_token_updates_password_and_restores(
        self, client, tenant, test_session_factory
    ):
        """Isolated user so we can freely change and verify the password."""
        user = await _create_user(
            tenant.id, "reset-confirm", "Reset User", TenantUserRole.player, test_session_factory
        )
        token = create_reset_token({"sub": str(user.id)})

        try:
            resp = await client.post(
                "/api/v1/auth/password-reset/confirm",
                json={"token": token, "new_password": "Updated99!"},
            )
            assert resp.status_code == 200

            login_resp = await client.post(
                "/api/v1/auth/login",
                json={
                    "tenant_subdomain": tenant.subdomain,
                    "email": user.email,
                    "password": "Updated99!",
                },
            )
            assert login_resp.status_code == 200
            assert "access_token" in login_resp.json()
        finally:
            await _delete_user(user.id, test_session_factory)

    async def test_garbage_token_returns_400(self, client):
        resp = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": "not.a.real.token", "new_password": "NewPass99!"},
        )
        assert resp.status_code == 400

    async def test_access_token_rejected_returns_400(self, client, player, tenant):
        access_token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
        resp = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": access_token, "new_password": "NewPass99!"},
        )
        assert resp.status_code == 400

    async def test_expired_token_returns_400(self, client, player):
        with patch("app.core.security.datetime") as mock_dt:
            mock_dt.utcnow.return_value = datetime.utcnow() - timedelta(minutes=30)
            expired_token = create_reset_token({"sub": str(player.id)})

        resp = await client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": expired_token, "new_password": "NewPass99!"},
        )
        assert resp.status_code == 400
