"""
Integration tests for /api/v1/auth endpoints.

Coverage
--------
POST /auth/register      — success, duplicate email, unknown tenant, unknown club,
                           short password, publishes email_verify event, no tokens
POST /auth/verify-email  — success (creates basic membership + sets verified_at),
                           idempotent re-click, invalid/expired token, no default plan
POST /auth/login         — success, wrong password, unknown email, inactive account,
                           unverified email blocked, clubs list (player with
                           membership, staff with profile, multi-club staff,
                           inactive profile excluded, cancelled membership excluded,
                           no clubs)
POST /auth/refresh       — success, wrong token type, garbage token
Cross-tenant            — token issued for tenant A rejected when presented to tenant B

Why these are integration tests (not unit tests)
------------------------------------------------
- Exercises the full HTTP stack: routing, TenantMiddleware, auth deps, DB writes
- Validates that Pydantic schema validation returns 422 (not visible in unit tests)
- Confirms that JWT claims (tid, type) are checked at the HTTP layer
- Verifies that TenantMiddleware correctly resolves (or ignores) tenants per request
"""

import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from sqlalchemy import delete as sql_delete, select

from app.core.security import create_access_token, create_refresh_token, create_verify_token
from app.db.models.club import Club
from app.db.models.membership import BillingPeriod, MembershipPlan, MembershipSubscription, MembershipStatus
from app.db.models.staff import StaffProfile, StaffRole
from app.db.models.tenant import Tenant as TenantModel
from app.db.models.user import TenantUserRole, User
from tests.integration.conftest import _create_user, _delete_user


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------


class TestRegister:
    def _payload(self, tenant, club, email=None):
        return {
            "tenant_subdomain": tenant.player_subdomain,
            "club_id": str(club.id),
            "email": email or f"new-{uuid.uuid4().hex[:6]}@example.com",
            "full_name": "New Player",
            "password": "Password1!",
        }

    async def test_success_returns_unverified_user_no_tokens(self, client, tenant, club):
        payload = self._payload(tenant, club)
        resp = await client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 201
        body = resp.json()
        assert "access_token" not in body
        assert "refresh_token" not in body
        assert body["email"] == payload["email"]
        assert "user_id" in body
        assert "verify" in body["message"].lower()

    async def test_creates_unverified_user_with_no_membership(
        self, client, tenant, club, test_session_factory
    ):
        payload = self._payload(tenant, club)
        resp = await client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 201
        user_id = uuid.UUID(resp.json()["user_id"])

        async with test_session_factory() as session:
            user = await session.get(User, user_id)
            assert user is not None
            assert user.email_verified_at is None
            sub = (await session.execute(
                select(MembershipSubscription).where(MembershipSubscription.user_id == user_id)
            )).scalar_one_or_none()
            assert sub is None  # membership is created only at verification

    async def test_assigns_default_skill_level_from_club_minimum(
        self, client, tenant, club, test_session_factory
    ):
        payload = self._payload(tenant, club)
        resp = await client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 201
        user_id = uuid.UUID(resp.json()["user_id"])

        async with test_session_factory() as session:
            user = await session.get(User, user_id)
            assert user is not None
            assert user.skill_level is not None
            assert user.skill_level == club.skill_level_min

    async def test_duplicate_email_returns_409(self, client, player, tenant, club):
        resp = await client.post(
            "/api/v1/auth/register",
            json=self._payload(tenant, club, email=player.email),
        )
        assert resp.status_code == 409

    async def test_unknown_tenant_returns_404(self, client, club):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "tenant_subdomain": f"no-such-{uuid.uuid4().hex[:8]}",
                "club_id": str(club.id),
                "email": "someone@example.com",
                "full_name": "Nobody",
                "password": "Password1!",
            },
        )
        assert resp.status_code == 404

    async def test_unknown_club_returns_404(self, client, tenant):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "tenant_subdomain": tenant.player_subdomain,
                "club_id": str(uuid.uuid4()),
                "email": "ghost@example.com",
                "full_name": "Ghost",
                "password": "Password1!",
            },
        )
        assert resp.status_code == 404

    async def test_short_password_returns_422(self, client, tenant, club):
        payload = self._payload(tenant, club, email="newplayer@example.com")
        payload["password"] = "short"
        resp = await client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 422

    async def test_publishes_email_verify_event(self, client, tenant, club):
        from urllib.parse import urlparse
        from app.core.config import get_settings

        payload = self._payload(tenant, club)
        with patch("app.api.v1.endpoints.auth.publish_notification_event") as mock_publish:
            resp = await client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 201
        mock_publish.assert_called_once()
        event_type, event_payload = mock_publish.call_args.args
        assert event_type == "email_verify"
        assert event_payload["email"] == payload["email"]
        assert event_payload["full_name"] == "New Player"
        assert event_payload["tenant_name"] == tenant.name
        assert event_payload["club_id"] == str(club.id)
        assert event_payload["club_name"] == club.name

        # verify_url must use the tenant's subdomain prepended to APP_BASE_URL's host.
        # e.g. APP_BASE_URL=https://smashbook.app, subdomain=ace-player-staging
        #   →  https://ace-player-staging.smashbook.app/verify-email?token=...
        root_host = urlparse(get_settings().APP_BASE_URL).netloc
        parsed = urlparse(event_payload["verify_url"])
        assert parsed.scheme == "https"
        assert parsed.netloc == f"{tenant.player_subdomain}.{root_host}"
        assert parsed.path == "/verify-email"
        assert "token=" in parsed.query

    async def test_duplicate_email_skips_verify_event(self, client, player, tenant, club):
        with patch("app.api.v1.endpoints.auth.publish_notification_event") as mock_publish:
            resp = await client.post(
                "/api/v1/auth/register",
                json=self._payload(tenant, club, email=player.email),
            )
        assert resp.status_code == 409
        mock_publish.assert_not_called()


# ---------------------------------------------------------------------------
# POST /api/v1/auth/verify-email
# ---------------------------------------------------------------------------


class TestVerifyEmail:
    async def _register(self, client, tenant, club):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "tenant_subdomain": tenant.player_subdomain,
                "club_id": str(club.id),
                "email": f"v-{uuid.uuid4().hex[:6]}@example.com",
                "full_name": "Verify Me",
                "password": "Password1!",
            },
        )
        assert resp.status_code == 201
        return uuid.UUID(resp.json()["user_id"]), resp.json()["email"]

    async def test_success_attaches_basic_membership_and_sets_verified_at(
        self, client, tenant, club, default_plan, test_session_factory
    ):
        user_id, _ = await self._register(client, tenant, club)
        token = create_verify_token({"sub": str(user_id), "cid": str(club.id)})

        resp = await client.post("/api/v1/auth/verify-email", json={"token": token})
        assert resp.status_code == 200
        body = resp.json()
        assert body["user_id"] == str(user_id)
        assert body["club_id"] == str(club.id)
        assert "membership_subscription_id" in body

        async with test_session_factory() as session:
            user = await session.get(User, user_id)
            assert user.email_verified_at is not None
            sub = await session.get(
                MembershipSubscription, uuid.UUID(body["membership_subscription_id"])
            )
            assert sub is not None
            assert sub.user_id == user_id
            assert sub.club_id == club.id
            assert sub.plan_id == default_plan.id
            assert sub.status == MembershipStatus.active
            assert sub.stripe_subscription_id is None  # free plan, no Stripe

    async def test_idempotent_re_click_returns_same_membership(
        self, client, tenant, club, default_plan, test_session_factory
    ):
        user_id, _ = await self._register(client, tenant, club)
        token = create_verify_token({"sub": str(user_id), "cid": str(club.id)})

        first = await client.post("/api/v1/auth/verify-email", json={"token": token})
        assert first.status_code == 200
        second = await client.post("/api/v1/auth/verify-email", json={"token": token})
        assert second.status_code == 200
        assert first.json()["membership_subscription_id"] == second.json()["membership_subscription_id"]

        async with test_session_factory() as session:
            subs = (await session.execute(
                select(MembershipSubscription).where(MembershipSubscription.user_id == user_id)
            )).scalars().all()
            assert len(subs) == 1

    async def test_publishes_welcome_event_on_verify(
        self, client, tenant, club, default_plan
    ):
        user_id, email = await self._register(client, tenant, club)
        token = create_verify_token({"sub": str(user_id), "cid": str(club.id)})

        with patch("app.api.v1.endpoints.auth.publish_notification_event") as mock_publish:
            resp = await client.post("/api/v1/auth/verify-email", json={"token": token})
        assert resp.status_code == 200
        # First call is the welcome event published from verify-email
        called_types = [c.args[0] for c in mock_publish.call_args_list]
        assert "welcome" in called_types

    async def test_invalid_token_returns_400(self, client):
        resp = await client.post("/api/v1/auth/verify-email", json={"token": "garbage"})
        assert resp.status_code == 400

    async def test_wrong_token_type_returns_400(self, client, player, club):
        # Reset token is the wrong type; should be rejected even with a valid signature
        from app.core.security import create_reset_token
        reset = create_reset_token({"sub": str(player.id), "cid": str(club.id)})
        resp = await client.post("/api/v1/auth/verify-email", json={"token": reset})
        assert resp.status_code == 400

    async def test_no_default_plan_returns_409(
        self, client, tenant, club, test_session_factory
    ):
        # Note: no default_plan fixture used — club has no is_default plan
        user_id, _ = await self._register(client, tenant, club)
        token = create_verify_token({"sub": str(user_id), "cid": str(club.id)})

        resp = await client.post("/api/v1/auth/verify-email", json={"token": token})
        assert resp.status_code == 409

        # User should remain unverified and have no membership
        async with test_session_factory() as session:
            user = await session.get(User, user_id)
            assert user.email_verified_at is None
            sub = (await session.execute(
                select(MembershipSubscription).where(MembershipSubscription.user_id == user_id)
            )).scalar_one_or_none()
            assert sub is None


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------


class TestLogin:
    async def test_success(self, client, player, tenant):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.player_subdomain,
                "email": player.email,
                "password": "Test1234!",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body
        assert "clubs" in body
        assert body["subdomain"] == tenant.player_subdomain

    async def test_staff_login_echoes_staff_subdomain(self, client, player, tenant):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.staff_subdomain,
                "email": player.email,
                "password": "Test1234!",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["subdomain"] == tenant.staff_subdomain

    async def test_wrong_password_returns_401(self, client, player, tenant):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.player_subdomain,
                "email": player.email,
                "password": "wrongpassword",
            },
        )
        assert resp.status_code == 401

    async def test_unknown_email_returns_401(self, client, tenant):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.player_subdomain,
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
                "tenant_subdomain": tenant.player_subdomain,
                "email": player.email,
                "password": "Test1234!",
            },
        )
        assert resp.status_code == 403

        async with test_session_factory() as session:
            u = await session.get(User, player.id)
            u.is_active = True
            await session.commit()

    async def test_unverified_email_returns_403(self, client, player, tenant, test_session_factory):
        """Login must be blocked while email_verified_at is NULL."""
        async with test_session_factory() as session:
            u = await session.get(User, player.id)
            u.email_verified_at = None
            await session.commit()

        try:
            resp = await client.post(
                "/api/v1/auth/login",
                json={
                    "tenant_subdomain": tenant.player_subdomain,
                    "email": player.email,
                    "password": "Test1234!",
                },
            )
            assert resp.status_code == 403
            assert "verify" in resp.json()["detail"].lower()
        finally:
            async with test_session_factory() as session:
                u = await session.get(User, player.id)
                u.email_verified_at = datetime.now(tz=timezone.utc)
                await session.commit()


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login — clubs list
# ---------------------------------------------------------------------------


class TestLoginClubs:
    """Verify the `clubs` list in the login response under various membership/staff states."""

    def _login_payload(self, tenant, user):
        return {
            "tenant_subdomain": tenant.player_subdomain,
            "email": user.email,
            "password": "Test1234!",
        }

    async def test_player_with_active_membership_sees_club(
        self, client, tenant, club, test_session_factory
    ):
        user = await _create_user(
            tenant.id, "player-mem", "Membered Player", TenantUserRole.player, test_session_factory
        )
        now = datetime.now(tz=timezone.utc)
        async with test_session_factory() as session:
            plan = MembershipPlan(
                club_id=club.id,
                name="Gold",
                billing_period=BillingPeriod.monthly,
                price="29.99",
                trial_days=0,
            )
            session.add(plan)
            await session.flush()
            sub = MembershipSubscription(
                user_id=user.id,
                plan_id=plan.id,
                club_id=club.id,
                status=MembershipStatus.active,
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
            )
            session.add(sub)
            await session.commit()
            plan_id, sub_id = plan.id, sub.id

        try:
            resp = await client.post("/api/v1/auth/login", json=self._login_payload(tenant, user))
            assert resp.status_code == 200
            clubs = resp.json()["clubs"]
            assert len(clubs) == 1
            assert clubs[0]["club_id"] == str(club.id)
            assert clubs[0]["club_name"] == club.name
            assert clubs[0]["role"] == "player"
        finally:
            async with test_session_factory() as session:
                await session.execute(sql_delete(MembershipSubscription).where(MembershipSubscription.id == sub_id))
                await session.execute(sql_delete(MembershipPlan).where(MembershipPlan.id == plan_id))
                await session.commit()
            await _delete_user(user.id, test_session_factory)

    async def test_player_with_cancelled_membership_not_in_clubs(
        self, client, tenant, club, test_session_factory
    ):
        user = await _create_user(
            tenant.id, "player-cancelled", "Cancelled Player", TenantUserRole.player, test_session_factory
        )
        now = datetime.now(tz=timezone.utc)
        async with test_session_factory() as session:
            plan = MembershipPlan(
                club_id=club.id,
                name="Silver",
                billing_period=BillingPeriod.monthly,
                price="19.99",
                trial_days=0,
            )
            session.add(plan)
            await session.flush()
            sub = MembershipSubscription(
                user_id=user.id,
                plan_id=plan.id,
                club_id=club.id,
                status=MembershipStatus.cancelled,
                current_period_start=now - timedelta(days=30),
                current_period_end=now - timedelta(days=1),
            )
            session.add(sub)
            await session.commit()
            plan_id, sub_id = plan.id, sub.id

        try:
            resp = await client.post("/api/v1/auth/login", json=self._login_payload(tenant, user))
            assert resp.status_code == 200
            assert resp.json()["clubs"] == []
        finally:
            async with test_session_factory() as session:
                await session.execute(sql_delete(MembershipSubscription).where(MembershipSubscription.id == sub_id))
                await session.execute(sql_delete(MembershipPlan).where(MembershipPlan.id == plan_id))
                await session.commit()
            await _delete_user(user.id, test_session_factory)

    async def test_staff_with_active_profile_sees_club_and_role(
        self, client, tenant, club, test_session_factory
    ):
        user = await _create_user(
            tenant.id, "staff-login", "Staff Login", TenantUserRole.staff, test_session_factory
        )
        async with test_session_factory() as session:
            profile = StaffProfile(
                user_id=user.id,
                club_id=club.id,
                role=StaffRole.front_desk,
                is_active=True,
            )
            session.add(profile)
            await session.commit()
            profile_id = profile.id

        try:
            resp = await client.post("/api/v1/auth/login", json=self._login_payload(tenant, user))
            assert resp.status_code == 200
            clubs = resp.json()["clubs"]
            assert len(clubs) == 1
            assert clubs[0]["club_id"] == str(club.id)
            assert clubs[0]["role"] == "front_desk"
        finally:
            async with test_session_factory() as session:
                obj = await session.get(StaffProfile, profile_id)
                if obj:
                    await session.delete(obj)
                await session.commit()
            await _delete_user(user.id, test_session_factory)

    async def test_staff_with_inactive_profile_not_in_clubs(
        self, client, tenant, club, test_session_factory
    ):
        user = await _create_user(
            tenant.id, "staff-inactive", "Inactive Staff", TenantUserRole.staff, test_session_factory
        )
        async with test_session_factory() as session:
            profile = StaffProfile(
                user_id=user.id,
                club_id=club.id,
                role=StaffRole.trainer,
                is_active=False,
            )
            session.add(profile)
            await session.commit()
            profile_id = profile.id

        try:
            resp = await client.post("/api/v1/auth/login", json=self._login_payload(tenant, user))
            assert resp.status_code == 200
            assert resp.json()["clubs"] == []
        finally:
            async with test_session_factory() as session:
                obj = await session.get(StaffProfile, profile_id)
                if obj:
                    await session.delete(obj)
                await session.commit()
            await _delete_user(user.id, test_session_factory)

    async def test_staff_with_multiple_clubs_sees_all(
        self, client, tenant, test_session_factory
    ):
        user = await _create_user(
            tenant.id, "staff-multi", "Multi Club Staff", TenantUserRole.staff, test_session_factory
        )
        async with test_session_factory() as session:
            club_a = Club(tenant_id=tenant.id, name="Club Alpha", address="1 Alpha St", currency="GBP")
            club_b = Club(tenant_id=tenant.id, name="Club Beta", address="2 Beta St", currency="GBP")
            session.add_all([club_a, club_b])
            await session.flush()
            profile_a = StaffProfile(user_id=user.id, club_id=club_a.id, role=StaffRole.admin, is_active=True)
            profile_b = StaffProfile(user_id=user.id, club_id=club_b.id, role=StaffRole.ops_lead, is_active=True)
            session.add_all([profile_a, profile_b])
            await session.commit()
            club_a_id, club_b_id = club_a.id, club_b.id
            profile_a_id, profile_b_id = profile_a.id, profile_b.id

        try:
            resp = await client.post("/api/v1/auth/login", json=self._login_payload(tenant, user))
            assert resp.status_code == 200
            clubs = resp.json()["clubs"]
            assert len(clubs) == 2
            roles = {c["role"] for c in clubs}
            assert roles == {"admin", "ops_lead"}
        finally:
            async with test_session_factory() as session:
                for pid in [profile_a_id, profile_b_id]:
                    obj = await session.get(StaffProfile, pid)
                    if obj:
                        await session.delete(obj)
                for cid in [club_a_id, club_b_id]:
                    obj = await session.get(Club, cid)
                    if obj:
                        await session.delete(obj)
                await session.commit()
            await _delete_user(user.id, test_session_factory)

    async def test_owner_sees_all_tenant_clubs(
        self, client, tenant, test_session_factory
    ):
        user = await _create_user(
            tenant.id, "owner-login", "Owner User", TenantUserRole.owner, test_session_factory
        )
        async with test_session_factory() as session:
            club_a = Club(tenant_id=tenant.id, name="Owner Club A", address="1 A St", currency="GBP")
            club_b = Club(tenant_id=tenant.id, name="Owner Club B", address="2 B St", currency="GBP")
            session.add_all([club_a, club_b])
            await session.commit()
            club_a_id, club_b_id = club_a.id, club_b.id

        try:
            resp = await client.post("/api/v1/auth/login", json=self._login_payload(tenant, user))
            assert resp.status_code == 200
            clubs = resp.json()["clubs"]
            assert len(clubs) == 2
            assert all(c["role"] == "owner" for c in clubs)
            ids = {c["club_id"] for c in clubs}
            assert str(club_a_id) in ids
            assert str(club_b_id) in ids
        finally:
            async with test_session_factory() as session:
                for cid in [club_a_id, club_b_id]:
                    obj = await session.get(Club, cid)
                    if obj:
                        await session.delete(obj)
                await session.commit()
            await _delete_user(user.id, test_session_factory)

    async def test_admin_sees_all_tenant_clubs(
        self, client, tenant, club, test_session_factory
    ):
        user = await _create_user(
            tenant.id, "admin-login", "Admin User", TenantUserRole.admin, test_session_factory
        )
        try:
            resp = await client.post("/api/v1/auth/login", json=self._login_payload(tenant, user))
            assert resp.status_code == 200
            clubs = resp.json()["clubs"]
            assert len(clubs) >= 1
            assert all(c["role"] == "admin" for c in clubs)
            assert str(club.id) in {c["club_id"] for c in clubs}
        finally:
            await _delete_user(user.id, test_session_factory)

    async def test_user_with_no_clubs_returns_empty_list(self, client, tenant, player):
        """Newly seeded player with no membership should get an empty clubs list."""
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.player_subdomain,
                "email": player.email,
                "password": "Test1234!",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["clubs"] == []

    async def test_verified_player_with_basic_membership_sees_club(
        self, client, tenant, club, default_plan
    ):
        """End-to-end: register → verify → login returns club from basic membership."""
        email = f"e2e-{uuid.uuid4().hex[:6]}@example.com"
        reg = await client.post(
            "/api/v1/auth/register",
            json={
                "tenant_subdomain": tenant.player_subdomain,
                "club_id": str(club.id),
                "email": email,
                "full_name": "E2E Player",
                "password": "Password1!",
            },
        )
        assert reg.status_code == 201
        user_id = uuid.UUID(reg.json()["user_id"])

        token = create_verify_token({"sub": str(user_id), "cid": str(club.id)})
        verified = await client.post("/api/v1/auth/verify-email", json={"token": token})
        assert verified.status_code == 200

        login = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.player_subdomain,
                "email": email,
                "password": "Password1!",
            },
        )
        assert login.status_code == 200
        body = login.json()
        assert "access_token" in body
        clubs = body["clubs"]
        assert len(clubs) == 1
        assert clubs[0]["club_id"] == str(club.id)
        assert clubs[0]["role"] == "player"


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
        assert "clubs" in body

    async def test_player_with_active_membership_clubs_returned(
        self, client, tenant, club, test_session_factory
    ):
        from datetime import datetime, timezone, timedelta
        from sqlalchemy import delete as sql_delete
        from app.db.models.membership import BillingPeriod, MembershipPlan, MembershipSubscription, MembershipStatus

        user = await _create_user(
            tenant.id, "refresh-player", "Refresh Player", TenantUserRole.player, test_session_factory
        )
        now = datetime.now(tz=timezone.utc)
        async with test_session_factory() as session:
            plan = MembershipPlan(
                club_id=club.id,
                name="Refresh Gold",
                billing_period=BillingPeriod.monthly,
                price="29.99",
                trial_days=0,
            )
            session.add(plan)
            await session.flush()
            sub = MembershipSubscription(
                user_id=user.id,
                plan_id=plan.id,
                club_id=club.id,
                status=MembershipStatus.active,
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
            )
            session.add(sub)
            await session.commit()
            plan_id, sub_id = plan.id, sub.id

        try:
            refresh = create_refresh_token({"sub": str(user.id), "tid": str(tenant.id)})
            resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
            assert resp.status_code == 200
            clubs = resp.json()["clubs"]
            assert len(clubs) == 1
            assert clubs[0]["club_id"] == str(club.id)
            assert clubs[0]["role"] == "player"
        finally:
            async with test_session_factory() as session:
                await session.execute(sql_delete(MembershipSubscription).where(MembershipSubscription.id == sub_id))
                await session.execute(sql_delete(MembershipPlan).where(MembershipPlan.id == plan_id))
                await session.commit()
            await _delete_user(user.id, test_session_factory)

    async def test_staff_clubs_returned_on_refresh(
        self, client, tenant, club, test_session_factory
    ):
        from app.db.models.staff import StaffProfile, StaffRole

        user = await _create_user(
            tenant.id, "refresh-staff", "Refresh Staff", TenantUserRole.staff, test_session_factory
        )
        async with test_session_factory() as session:
            profile = StaffProfile(
                user_id=user.id,
                club_id=club.id,
                role=StaffRole.admin,
                is_active=True,
            )
            session.add(profile)
            await session.commit()
            profile_id = profile.id

        try:
            refresh = create_refresh_token({"sub": str(user.id), "tid": str(tenant.id)})
            resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
            assert resp.status_code == 200
            clubs = resp.json()["clubs"]
            assert len(clubs) == 1
            assert clubs[0]["club_id"] == str(club.id)
            assert clubs[0]["role"] == "admin"
        finally:
            async with test_session_factory() as session:
                obj = await session.get(StaffProfile, profile_id)
                if obj:
                    await session.delete(obj)
                await session.commit()
            await _delete_user(user.id, test_session_factory)

    async def test_owner_clubs_returned_on_refresh(
        self, client, tenant, test_session_factory
    ):
        user = await _create_user(
            tenant.id, "refresh-owner", "Refresh Owner", TenantUserRole.owner, test_session_factory
        )
        async with test_session_factory() as session:
            c = Club(tenant_id=tenant.id, name="Owner Refresh Club", address="1 R St", currency="GBP")
            session.add(c)
            await session.commit()
            club_id = c.id

        try:
            refresh = create_refresh_token({"sub": str(user.id), "tid": str(tenant.id)})
            resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
            assert resp.status_code == 200
            clubs = resp.json()["clubs"]
            assert len(clubs) >= 1
            assert all(c["role"] == "owner" for c in clubs)
            assert str(club_id) in {c["club_id"] for c in clubs}
        finally:
            async with test_session_factory() as session:
                obj = await session.get(Club, club_id)
                if obj:
                    await session.delete(obj)
                await session.commit()
            await _delete_user(user.id, test_session_factory)

    async def test_inactive_user_returns_401(self, client, player, tenant, test_session_factory):
        from app.db.models.user import User

        async with test_session_factory() as session:
            u = await session.get(User, player.id)
            u.is_active = False
            await session.commit()

        try:
            refresh = create_refresh_token({"sub": str(player.id), "tid": str(tenant.id)})
            resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                u = await session.get(User, player.id)
                u.is_active = True
                await session.commit()

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
        suffix_b = uuid.uuid4().hex[:8]
        async with test_session_factory() as session:
            t2 = TenantModel(
                name="Other Club",
                trading_name="Other Club",
                player_subdomain=f"other-{suffix_b}",
                staff_subdomain=f"other-{suffix_b}-staff",
                plan_id=plan.id,
                is_active=True,
            )
            session.add(t2)
            await session.commit()
            await session.refresh(t2)

        try:
            token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
            resp = await client.get(
                "/api/v1/clubs",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Tenant-ID": str(t2.id),  # deliberate mismatch
                },
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()
