"""
Integration tests for /api/v1/auth endpoints.

Coverage
--------
POST /auth/register  — success, duplicate email, unknown tenant, short password
POST /auth/login     — success, wrong password, unknown email, inactive account,
                       clubs list (player with membership, staff with profile,
                       multi-club staff, inactive profile excluded,
                       cancelled membership excluded, no clubs)
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
from datetime import datetime, timezone, timedelta

from sqlalchemy import delete as sql_delete

from app.core.security import create_access_token, create_refresh_token
from app.db.models.club import Club
from app.db.models.membership import BillingPeriod, MembershipPlan, MembershipSubscription, MembershipStatus
from app.db.models.staff import StaffProfile, StaffRole
from app.db.models.tenant import Tenant as TenantModel
from app.db.models.user import TenantUserRole
from tests.integration.conftest import _create_user, _delete_user


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
        assert "clubs" in body

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
# POST /api/v1/auth/login — clubs list
# ---------------------------------------------------------------------------


class TestLoginClubs:
    """Verify the `clubs` list in the login response under various membership/staff states."""

    def _login_payload(self, tenant, user):
        return {
            "tenant_subdomain": tenant.subdomain,
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

    async def test_user_with_no_clubs_returns_empty_list(self, client, tenant, player):
        """Newly seeded player with no membership should get an empty clubs list."""
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.subdomain,
                "email": player.email,
                "password": "Test1234!",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["clubs"] == []

    async def test_register_returns_empty_clubs_list(self, client, tenant):
        """Newly registered players have no membership yet — clubs must be empty."""
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "tenant_subdomain": tenant.subdomain,
                "email": f"newbie-{uuid.uuid4().hex[:6]}@example.com",
                "full_name": "New Player",
                "password": "Password1!",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["clubs"] == []


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
        from sqlalchemy import delete as sql_delete
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
