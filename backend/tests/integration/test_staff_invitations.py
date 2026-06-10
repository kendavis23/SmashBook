"""
Integration tests for the Phase B2 staff onboarding slice.

Coverage
--------
POST /staff/invitations
  - escalation matrix (ops_lead / admin / owner grantable ranks)
  - cross-club authority (ops_lead@ClubA cannot invite into ClubB)
  - role 403 (player), tenant isolation 401, unknown/other-tenant club 404
  - duplicate pending 409, existing-user direct attach + already-active 409
  - invalid role 422, staff_invite event published
POST /auth/complete-staff-invitation
  - new-email accept creates active profile + login works
  - replay / expired / revoked / malformed token -> 400
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy import delete as sql_delete, select

from app.core.security import create_access_token, create_invite_token
from app.db.models.club import Club
from app.db.models.staff import StaffProfile, StaffRole
from app.db.models.staff_invitation import StaffInvitation, StaffInvitationStatus
from app.db.models.tenant import Tenant as TenantModel
from app.db.models.user import TenantUserRole, User


# ---------------------------------------------------------------------------
# Local fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def club_b(tenant, test_session_factory):
    """A second club in the same tenant — for cross-club authority checks."""
    async with test_session_factory() as session:
        c = Club(
            tenant_id=tenant.id,
            name="Test Club B",
            address="2 Test Street",
            currency="GBP",
            timezone="UTC",
        )
        session.add(c)
        await session.commit()
        await session.refresh(c)
    yield c
    async with test_session_factory() as session:
        await session.execute(sql_delete(StaffProfile).where(StaffProfile.club_id == c.id))
        await session.execute(sql_delete(Club).where(Club.id == c.id))
        await session.commit()


def _payload(club, *, role="trainer", email=None):
    return {
        "club_id": str(club.id),
        "email": email or f"staffinv-{uuid.uuid4().hex[:6]}@example.com",
        "role": role,
    }


async def _seed_invitation(
    test_session_factory,
    *,
    tenant_id,
    club_id,
    invited_by,
    status=StaffInvitationStatus.pending,
    expires_at=None,
    email=None,
    role=StaffRole.trainer,
) -> StaffInvitation:
    if expires_at is None:
        expires_at = datetime.now(tz=timezone.utc) + timedelta(days=7)
    async with test_session_factory() as session:
        inv = StaffInvitation(
            tenant_id=tenant_id,
            club_id=club_id,
            email=email or f"seed-{uuid.uuid4().hex[:6]}@example.com",
            role=role,
            invited_by_user_id=invited_by,
            status=status,
            expires_at=expires_at,
        )
        session.add(inv)
        await session.commit()
        await session.refresh(inv)
    return inv


# ---------------------------------------------------------------------------
# POST /staff/invitations — escalation matrix
# ---------------------------------------------------------------------------


class TestInviteStaffEscalation:
    @pytest.mark.parametrize("role", ["trainer", "front_desk"])
    async def test_ops_lead_can_invite_below_own_rank(
        self, client, club, staff_club_profile, staff_headers, role
    ):
        resp = await client.post(
            "/api/v1/staff/invitations",
            headers=staff_headers,
            json=_payload(club, role=role),
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["role"] == role
        assert body["status"] == "pending"
        assert body["attached_existing_user"] is False

    @pytest.mark.parametrize("role", ["ops_lead", "admin"])
    async def test_ops_lead_cannot_invite_at_or_above_own_rank(
        self, client, club, staff_club_profile, staff_headers, role
    ):
        resp = await client.post(
            "/api/v1/staff/invitations",
            headers=staff_headers,
            json=_payload(club, role=role),
        )
        assert resp.status_code == 403

    async def test_admin_can_invite_ops_lead(self, client, club, admin_headers):
        resp = await client.post(
            "/api/v1/staff/invitations",
            headers=admin_headers,
            json=_payload(club, role="ops_lead"),
        )
        assert resp.status_code == 201

    async def test_admin_cannot_invite_admin(self, client, club, admin_headers):
        resp = await client.post(
            "/api/v1/staff/invitations",
            headers=admin_headers,
            json=_payload(club, role="admin"),
        )
        assert resp.status_code == 403

    async def test_owner_can_invite_admin(self, client, club, owner_headers):
        resp = await client.post(
            "/api/v1/staff/invitations",
            headers=owner_headers,
            json=_payload(club, role="admin"),
        )
        assert resp.status_code == 201

    async def test_ops_lead_cannot_invite_into_other_club(
        self, client, club, club_b, staff_club_profile, staff_headers
    ):
        """ops_lead holds a profile only at `club`; they have no standing at club_b."""
        resp = await client.post(
            "/api/v1/staff/invitations",
            headers=staff_headers,
            json=_payload(club_b, role="trainer"),
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# POST /staff/invitations — auth / validation
# ---------------------------------------------------------------------------


class TestInviteStaffAuth:
    async def test_player_cannot_invite(self, client, club, player_headers):
        resp = await client.post(
            "/api/v1/staff/invitations",
            headers=player_headers,
            json=_payload(club),
        )
        assert resp.status_code == 403

    async def test_unauthenticated_returns_403(self, client, club):
        resp = await client.post("/api/v1/staff/invitations", json=_payload(club))
        assert resp.status_code == 403

    async def test_invalid_role_returns_422(self, client, club, admin_headers):
        resp = await client.post(
            "/api/v1/staff/invitations",
            headers=admin_headers,
            json={"club_id": str(club.id), "email": "x@example.com", "role": "owner"},
        )
        assert resp.status_code == 422

    async def test_unknown_club_returns_404(self, client, admin_headers):
        resp = await client.post(
            "/api/v1/staff/invitations",
            headers=admin_headers,
            json=_payload_with_club(uuid.uuid4()),
        )
        assert resp.status_code == 404

    async def test_club_in_other_tenant_returns_404(
        self, client, admin_headers, plan, test_session_factory
    ):
        suffix = uuid.uuid4().hex[:8]
        async with test_session_factory() as session:
            t2 = TenantModel(
                name="Other Tenant",
                trading_name="Other Tenant",
                player_subdomain=f"other-{suffix}",
                staff_subdomain=f"other-{suffix}-staff",
                plan_id=plan.id,
                is_active=True,
            )
            session.add(t2)
            await session.flush()
            other_club = Club(tenant_id=t2.id, name="Other Club", address="X", currency="GBP")
            session.add(other_club)
            await session.commit()
            t2_id, other_club_id = t2.id, other_club.id
        try:
            resp = await client.post(
                "/api/v1/staff/invitations",
                headers=admin_headers,
                json=_payload_with_club(other_club_id),
            )
            assert resp.status_code == 404
        finally:
            async with test_session_factory() as session:
                await session.execute(sql_delete(Club).where(Club.id == other_club_id))
                t = await session.get(TenantModel, t2_id)
                if t:
                    await session.delete(t)
                await session.commit()

    async def test_wrong_tenant_returns_401(
        self, client, admin, club, tenant, plan, test_session_factory
    ):
        suffix = uuid.uuid4().hex[:8]
        async with test_session_factory() as session:
            t2 = TenantModel(
                name="Other Club",
                trading_name="Other Club",
                player_subdomain=f"other-{suffix}",
                staff_subdomain=f"other-{suffix}-staff",
                plan_id=plan.id,
                is_active=True,
            )
            session.add(t2)
            await session.commit()
            await session.refresh(t2)
        try:
            token = create_access_token({"sub": str(admin.id), "tid": str(tenant.id)})
            resp = await client.post(
                "/api/v1/staff/invitations",
                headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2.id)},
                json=_payload(club),
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()


# ---------------------------------------------------------------------------
# POST /staff/invitations — duplicate / existing-user / event
# ---------------------------------------------------------------------------


class TestInviteStaffSemantics:
    async def test_creates_pending_invitation_row(
        self, client, club, admin_headers, test_session_factory
    ):
        payload = _payload(club, role="trainer")
        resp = await client.post(
            "/api/v1/staff/invitations", headers=admin_headers, json=payload
        )
        assert resp.status_code == 201
        inv_id = uuid.UUID(resp.json()["invitation_id"])
        async with test_session_factory() as session:
            inv = await session.get(StaffInvitation, inv_id)
            assert inv is not None
            assert inv.status == StaffInvitationStatus.pending
            assert inv.email == payload["email"]
            assert inv.role == StaffRole.trainer
            assert inv.accepted_at is None

    async def test_duplicate_pending_returns_409(self, client, club, admin_headers):
        payload = _payload(club, role="trainer")
        first = await client.post(
            "/api/v1/staff/invitations", headers=admin_headers, json=payload
        )
        assert first.status_code == 201
        second = await client.post(
            "/api/v1/staff/invitations", headers=admin_headers, json=payload
        )
        assert second.status_code == 409

    async def test_existing_tenant_user_attached_directly(
        self, client, club, player, admin_headers, test_session_factory
    ):
        resp = await client.post(
            "/api/v1/staff/invitations",
            headers=admin_headers,
            json=_payload(club, role="front_desk", email=player.email),
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["attached_existing_user"] is True
        assert body["status"] == "accepted"
        async with test_session_factory() as session:
            prof = (
                await session.execute(
                    select(StaffProfile).where(
                        StaffProfile.user_id == player.id,
                        StaffProfile.club_id == club.id,
                    )
                )
            ).scalar_one_or_none()
            assert prof is not None
            assert prof.is_active is True
            assert prof.role == StaffRole.front_desk

    async def test_existing_active_staff_returns_409(
        self, client, club, player, admin_headers
    ):
        body = _payload(club, role="front_desk", email=player.email)
        first = await client.post(
            "/api/v1/staff/invitations", headers=admin_headers, json=body
        )
        assert first.status_code == 201
        # Same email again — the player now has an active profile at this club.
        second = await client.post(
            "/api/v1/staff/invitations", headers=admin_headers, json=body
        )
        assert second.status_code == 409

    async def test_publishes_staff_invite_event(self, client, club, admin, admin_headers, tenant):
        from unittest.mock import patch
        from urllib.parse import urlparse, parse_qs
        from app.core.config import get_settings

        payload = _payload(club, role="trainer")
        with patch("app.api.v1.endpoints.staff.publish_notification_event") as mock_publish:
            resp = await client.post(
                "/api/v1/staff/invitations", headers=admin_headers, json=payload
            )
        assert resp.status_code == 201
        mock_publish.assert_called_once()
        event_type, event_payload = mock_publish.call_args.args
        assert event_type == "staff_invite"
        assert event_payload["email"] == payload["email"]
        assert event_payload["role"] == "trainer"
        assert event_payload["club_id"] == str(club.id)
        assert event_payload["invited_by"] == admin.full_name

        root_host = urlparse(get_settings().APP_BASE_URL).netloc
        parsed = urlparse(event_payload["invite_url"])
        assert parsed.netloc == f"{tenant.staff_subdomain}.{root_host}"
        assert parsed.path == "/complete-staff-invitation"
        assert "token" in parse_qs(parsed.query)

    async def test_existing_user_attach_skips_event(
        self, client, club, player, admin_headers
    ):
        from unittest.mock import patch

        with patch("app.api.v1.endpoints.staff.publish_notification_event") as mock_publish:
            resp = await client.post(
                "/api/v1/staff/invitations",
                headers=admin_headers,
                json=_payload(club, role="front_desk", email=player.email),
            )
        assert resp.status_code == 201
        mock_publish.assert_not_called()


# ---------------------------------------------------------------------------
# POST /auth/complete-staff-invitation
# ---------------------------------------------------------------------------


class TestCompleteStaffInvitation:
    async def _invite(self, client, admin_headers, club, role="trainer", email=None):
        resp = await client.post(
            "/api/v1/staff/invitations",
            headers=admin_headers,
            json=_payload(club, role=role, email=email),
        )
        assert resp.status_code == 201, resp.text
        return resp.json()

    async def test_accept_new_email_creates_active_profile(
        self, client, club, admin_headers, test_session_factory
    ):
        invited = await self._invite(client, admin_headers, club, role="trainer")
        token = create_invite_token({"inv": invited["invitation_id"]})

        resp = await client.post(
            "/api/v1/auth/complete-staff-invitation",
            json={"token": token, "password": "Password1!", "full_name": "New Trainer"},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["club_id"] == str(club.id)
        assert body["role"] == "trainer"

        user_id = uuid.UUID(body["user_id"])
        async with test_session_factory() as session:
            user = await session.get(User, user_id)
            assert user is not None
            assert user.email == invited["email"]
            assert user.full_name == "New Trainer"
            assert user.role == TenantUserRole.player
            assert user.email_verified_at is not None
            prof = (
                await session.execute(
                    select(StaffProfile).where(
                        StaffProfile.user_id == user_id, StaffProfile.club_id == club.id
                    )
                )
            ).scalar_one_or_none()
            assert prof is not None
            assert prof.is_active is True
            assert prof.role == StaffRole.trainer
            inv = await session.get(StaffInvitation, uuid.UUID(invited["invitation_id"]))
            assert inv.status == StaffInvitationStatus.accepted
            assert inv.accepted_user_id == user_id

    async def test_login_works_after_accept(
        self, client, club, admin_headers, tenant
    ):
        invited = await self._invite(client, admin_headers, club, role="trainer")
        token = create_invite_token({"inv": invited["invitation_id"]})
        accept = await client.post(
            "/api/v1/auth/complete-staff-invitation",
            json={"token": token, "password": "Password1!", "full_name": "New Trainer"},
        )
        assert accept.status_code == 200

        login = await client.post(
            "/api/v1/auth/login",
            json={
                "tenant_subdomain": tenant.staff_subdomain,
                "email": invited["email"],
                "password": "Password1!",
            },
        )
        assert login.status_code == 200, login.text
        body = login.json()
        assert "access_token" in body
        match = [c for c in body["clubs"] if c["club_id"] == str(club.id)]
        assert match and match[0]["role"] == "trainer"

    async def test_replay_returns_400(self, client, club, admin_headers):
        invited = await self._invite(client, admin_headers, club, role="trainer")
        token = create_invite_token({"inv": invited["invitation_id"]})
        first = await client.post(
            "/api/v1/auth/complete-staff-invitation",
            json={"token": token, "password": "Password1!", "full_name": "T"},
        )
        assert first.status_code == 200
        second = await client.post(
            "/api/v1/auth/complete-staff-invitation",
            json={"token": token, "password": "Attacker99!", "full_name": "T"},
        )
        assert second.status_code == 400

    async def test_expired_invitation_returns_400(
        self, client, club, admin, tenant, test_session_factory
    ):
        inv = await _seed_invitation(
            test_session_factory,
            tenant_id=tenant.id,
            club_id=club.id,
            invited_by=admin.id,
            expires_at=datetime.now(tz=timezone.utc) - timedelta(hours=1),
        )
        token = create_invite_token({"inv": str(inv.id)})
        resp = await client.post(
            "/api/v1/auth/complete-staff-invitation",
            json={"token": token, "password": "Password1!", "full_name": "T"},
        )
        assert resp.status_code == 400
        async with test_session_factory() as session:
            refreshed = await session.get(StaffInvitation, inv.id)
            assert refreshed.status == StaffInvitationStatus.expired

    async def test_revoked_invitation_returns_400(
        self, client, club, admin, tenant, test_session_factory
    ):
        inv = await _seed_invitation(
            test_session_factory,
            tenant_id=tenant.id,
            club_id=club.id,
            invited_by=admin.id,
            status=StaffInvitationStatus.revoked,
        )
        token = create_invite_token({"inv": str(inv.id)})
        resp = await client.post(
            "/api/v1/auth/complete-staff-invitation",
            json={"token": token, "password": "Password1!", "full_name": "T"},
        )
        assert resp.status_code == 400

    async def test_malformed_token_returns_400(self, client):
        resp = await client.post(
            "/api/v1/auth/complete-staff-invitation",
            json={"token": "not-a-jwt", "password": "Password1!", "full_name": "T"},
        )
        assert resp.status_code == 400

    async def test_wrong_token_type_returns_400(self, client, club, admin, tenant, test_session_factory):
        inv = await _seed_invitation(
            test_session_factory,
            tenant_id=tenant.id,
            club_id=club.id,
            invited_by=admin.id,
        )
        # An access token, not an invite token.
        token = create_access_token({"inv": str(inv.id)})
        resp = await client.post(
            "/api/v1/auth/complete-staff-invitation",
            json={"token": token, "password": "Password1!", "full_name": "T"},
        )
        assert resp.status_code == 400

    async def test_short_password_returns_422(self, client, club, admin_headers):
        invited = await self._invite(client, admin_headers, club, role="trainer")
        token = create_invite_token({"inv": invited["invitation_id"]})
        resp = await client.post(
            "/api/v1/auth/complete-staff-invitation",
            json={"token": token, "password": "short", "full_name": "T"},
        )
        assert resp.status_code == 422


def _payload_with_club(club_id):
    return {
        "club_id": str(club_id),
        "email": f"staffinv-{uuid.uuid4().hex[:6]}@example.com",
        "role": "trainer",
    }
