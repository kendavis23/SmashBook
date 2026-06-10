"""
Integration tests for the Phase B3 staff management/read surface.

Coverage
--------
GET    /staff?club_id=                 — list active staff
GET    /staff/invitations?club_id=     — list invitations (recent first)
DELETE /staff/invitations/{id}         — revoke a pending invitation
PATCH  /staff/{staff_id}               — change role/bio (escalation guard)
DELETE /staff/{staff_id}               — deactivate (is_active=false)

Each endpoint: happy path, role 403 (player), tenant-isolation 401. Plus the
escalation guard (no acting on a peer/superior) and the assurance that existing
staff queries are unaffected by invitation rows.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest_asyncio
from sqlalchemy import delete as sql_delete

from app.core.security import create_access_token
from app.db.models.staff import StaffProfile, StaffRole
from app.db.models.staff_invitation import StaffInvitation, StaffInvitationStatus
from app.db.models.tenant import Tenant as TenantModel
from app.db.models.user import TenantUserRole, User
from app.db.models.wallet import Wallet


# ---------------------------------------------------------------------------
# Local fixtures
# ---------------------------------------------------------------------------


async def _make_user(test_session_factory, tenant_id, role=TenantUserRole.player):
    suffix = uuid.uuid4().hex[:8]
    async with test_session_factory() as session:
        u = User(
            tenant_id=tenant_id,
            email=f"sm-{suffix}@example.com",
            full_name=f"Member {suffix}",
            hashed_password="x",
            role=role,
        )
        session.add(u)
        await session.commit()
        await session.refresh(u)
    return u


@pytest_asyncio.fixture
async def trainer_member(tenant, club, test_session_factory):
    """A user with an active trainer StaffProfile at `club`."""
    u = await _make_user(test_session_factory, tenant.id)
    async with test_session_factory() as session:
        sp = StaffProfile(user_id=u.id, club_id=club.id, role=StaffRole.trainer, is_active=True)
        session.add(sp)
        await session.commit()
        await session.refresh(sp)
    yield u, sp
    async with test_session_factory() as session:
        await session.execute(sql_delete(StaffProfile).where(StaffProfile.user_id == u.id))
        await session.execute(sql_delete(Wallet).where(Wallet.user_id == u.id))
        obj = await session.get(User, u.id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest_asyncio.fixture
async def opslead_member(tenant, club, test_session_factory):
    """A user with an active ops_lead StaffProfile at `club` (a peer of `staff`)."""
    u = await _make_user(test_session_factory, tenant.id)
    async with test_session_factory() as session:
        sp = StaffProfile(user_id=u.id, club_id=club.id, role=StaffRole.ops_lead, is_active=True)
        session.add(sp)
        await session.commit()
        await session.refresh(sp)
    yield u, sp
    async with test_session_factory() as session:
        await session.execute(sql_delete(StaffProfile).where(StaffProfile.user_id == u.id))
        await session.execute(sql_delete(Wallet).where(Wallet.user_id == u.id))
        obj = await session.get(User, u.id)
        if obj:
            await session.delete(obj)
        await session.commit()


async def _seed_invitation(
    test_session_factory,
    *,
    tenant_id,
    club_id,
    invited_by,
    status=StaffInvitationStatus.pending,
    role=StaffRole.trainer,
) -> StaffInvitation:
    async with test_session_factory() as session:
        inv = StaffInvitation(
            tenant_id=tenant_id,
            club_id=club_id,
            email=f"seed-{uuid.uuid4().hex[:6]}@example.com",
            role=role,
            invited_by_user_id=invited_by,
            status=status,
            expires_at=datetime.now(tz=timezone.utc) + timedelta(days=7),
        )
        session.add(inv)
        await session.commit()
        await session.refresh(inv)
    return inv


@pytest_asyncio.fixture
async def other_tenant_headers(admin, tenant, plan, test_session_factory):
    """Admin's own token (tid=tenant) pointed at a *different real* tenant via
    X-Tenant-ID → the auth dependency rejects the tid/header mismatch (401).

    A non-existent id would instead 404 at the tenant middleware, so the other
    tenant must really exist.
    """
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
        await session.commit()
        await session.refresh(t2)
    token = create_access_token({"sub": str(admin.id), "tid": str(tenant.id)})
    yield {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2.id)}
    async with test_session_factory() as session:
        obj = await session.get(TenantModel, t2.id)
        if obj:
            await session.delete(obj)
            await session.commit()


# ---------------------------------------------------------------------------
# GET /staff
# ---------------------------------------------------------------------------


class TestListStaff:
    async def test_admin_lists_active_staff(
        self, client, club, admin_headers, trainer_member
    ):
        _, sp = trainer_member
        resp = await client.get(
            "/api/v1/staff", headers=admin_headers, params={"club_id": str(club.id)}
        )
        assert resp.status_code == 200, resp.text
        ids = {row["staff_id"] for row in resp.json()}
        assert str(sp.id) in ids
        row = next(r for r in resp.json() if r["staff_id"] == str(sp.id))
        assert row["role"] == "trainer"
        assert row["is_active"] is True

    async def test_player_forbidden(self, client, club, player_headers):
        resp = await client.get(
            "/api/v1/staff", headers=player_headers, params={"club_id": str(club.id)}
        )
        assert resp.status_code == 403

    async def test_tenant_isolation_401(self, client, club, other_tenant_headers):
        resp = await client.get(
            "/api/v1/staff",
            headers=other_tenant_headers,
            params={"club_id": str(club.id)},
        )
        assert resp.status_code == 401

    async def test_unknown_club_404(self, client, admin_headers):
        resp = await client.get(
            "/api/v1/staff", headers=admin_headers, params={"club_id": str(uuid.uuid4())}
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /staff/invitations
# ---------------------------------------------------------------------------


class TestListInvitations:
    async def test_admin_lists_invitations(
        self, client, club, admin, admin_headers, tenant, test_session_factory
    ):
        inv = await _seed_invitation(
            test_session_factory, tenant_id=tenant.id, club_id=club.id, invited_by=admin.id
        )
        resp = await client.get(
            "/api/v1/staff/invitations",
            headers=admin_headers,
            params={"club_id": str(club.id)},
        )
        assert resp.status_code == 200, resp.text
        ids = {row["invitation_id"] for row in resp.json()}
        assert str(inv.id) in ids

    async def test_player_forbidden(self, client, club, player_headers):
        resp = await client.get(
            "/api/v1/staff/invitations",
            headers=player_headers,
            params={"club_id": str(club.id)},
        )
        assert resp.status_code == 403

    async def test_tenant_isolation_401(self, client, club, other_tenant_headers):
        resp = await client.get(
            "/api/v1/staff/invitations",
            headers=other_tenant_headers,
            params={"club_id": str(club.id)},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /staff/invitations/{id}
# ---------------------------------------------------------------------------


class TestRevokeInvitation:
    async def test_admin_revokes_pending(
        self, client, club, admin, admin_headers, tenant, test_session_factory
    ):
        inv = await _seed_invitation(
            test_session_factory, tenant_id=tenant.id, club_id=club.id, invited_by=admin.id
        )
        resp = await client.delete(
            f"/api/v1/staff/invitations/{inv.id}",
            headers=admin_headers,
            params={"club_id": str(club.id)},
        )
        assert resp.status_code == 204, resp.text
        async with test_session_factory() as session:
            refreshed = await session.get(StaffInvitation, inv.id)
            assert refreshed.status == StaffInvitationStatus.revoked

    async def test_non_pending_returns_409(
        self, client, club, admin, admin_headers, tenant, test_session_factory
    ):
        inv = await _seed_invitation(
            test_session_factory,
            tenant_id=tenant.id,
            club_id=club.id,
            invited_by=admin.id,
            status=StaffInvitationStatus.accepted,
        )
        resp = await client.delete(
            f"/api/v1/staff/invitations/{inv.id}",
            headers=admin_headers,
            params={"club_id": str(club.id)},
        )
        assert resp.status_code == 409

    async def test_unknown_invitation_404(self, client, club, admin_headers):
        resp = await client.delete(
            f"/api/v1/staff/invitations/{uuid.uuid4()}",
            headers=admin_headers,
            params={"club_id": str(club.id)},
        )
        assert resp.status_code == 404

    async def test_player_forbidden(
        self, client, club, admin, player_headers, tenant, test_session_factory
    ):
        inv = await _seed_invitation(
            test_session_factory, tenant_id=tenant.id, club_id=club.id, invited_by=admin.id
        )
        resp = await client.delete(
            f"/api/v1/staff/invitations/{inv.id}",
            headers=player_headers,
            params={"club_id": str(club.id)},
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# PATCH /staff/{staff_id}
# ---------------------------------------------------------------------------


class TestUpdateStaff:
    async def test_admin_changes_role_and_bio(
        self, client, club, admin_headers, trainer_member, test_session_factory
    ):
        _, sp = trainer_member
        resp = await client.patch(
            f"/api/v1/staff/{sp.id}",
            headers=admin_headers,
            params={"club_id": str(club.id)},
            json={"role": "front_desk", "bio": "  Front desk lead  "},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["role"] == "front_desk"
        assert body["bio"] == "Front desk lead"
        async with test_session_factory() as session:
            refreshed = await session.get(StaffProfile, sp.id)
            assert refreshed.role == StaffRole.front_desk
            assert refreshed.bio == "Front desk lead"

    async def test_cannot_promote_to_own_rank(
        self, client, club, admin_headers, trainer_member
    ):
        """Admin (rank 4) may grant up to ops_lead (3) — not admin."""
        _, sp = trainer_member
        resp = await client.patch(
            f"/api/v1/staff/{sp.id}",
            headers=admin_headers,
            params={"club_id": str(club.id)},
            json={"role": "admin"},
        )
        assert resp.status_code == 403

    async def test_cannot_modify_peer(
        self, client, club, staff_club_profile, staff_headers, opslead_member
    ):
        """ops_lead caller cannot modify another ops_lead (a peer)."""
        _, peer_sp = opslead_member
        resp = await client.patch(
            f"/api/v1/staff/{peer_sp.id}",
            headers=staff_headers,
            params={"club_id": str(club.id)},
            json={"bio": "hacked"},
        )
        assert resp.status_code == 403

    async def test_player_forbidden(
        self, client, club, player_headers, trainer_member
    ):
        _, sp = trainer_member
        resp = await client.patch(
            f"/api/v1/staff/{sp.id}",
            headers=player_headers,
            params={"club_id": str(club.id)},
            json={"bio": "x"},
        )
        assert resp.status_code == 403

    async def test_unknown_staff_404(self, client, club, admin_headers):
        resp = await client.patch(
            f"/api/v1/staff/{uuid.uuid4()}",
            headers=admin_headers,
            params={"club_id": str(club.id)},
            json={"bio": "x"},
        )
        assert resp.status_code == 404

    async def test_tenant_isolation_401(self, client, club, other_tenant_headers, trainer_member):
        _, sp = trainer_member
        resp = await client.patch(
            f"/api/v1/staff/{sp.id}",
            headers=other_tenant_headers,
            params={"club_id": str(club.id)},
            json={"bio": "x"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /staff/{staff_id}
# ---------------------------------------------------------------------------


class TestDeactivateStaff:
    async def test_admin_deactivates(
        self, client, club, admin_headers, trainer_member, test_session_factory
    ):
        _, sp = trainer_member
        resp = await client.delete(
            f"/api/v1/staff/{sp.id}",
            headers=admin_headers,
            params={"club_id": str(club.id)},
        )
        assert resp.status_code == 204, resp.text
        async with test_session_factory() as session:
            refreshed = await session.get(StaffProfile, sp.id)
            assert refreshed.is_active is False

    async def test_deactivated_staff_drops_out_of_list(
        self, client, club, admin_headers, trainer_member
    ):
        _, sp = trainer_member
        await client.delete(
            f"/api/v1/staff/{sp.id}",
            headers=admin_headers,
            params={"club_id": str(club.id)},
        )
        listing = await client.get(
            "/api/v1/staff", headers=admin_headers, params={"club_id": str(club.id)}
        )
        assert str(sp.id) not in {r["staff_id"] for r in listing.json()}

    async def test_cannot_deactivate_peer(
        self, client, club, staff_club_profile, staff_headers, opslead_member
    ):
        _, peer_sp = opslead_member
        resp = await client.delete(
            f"/api/v1/staff/{peer_sp.id}",
            headers=staff_headers,
            params={"club_id": str(club.id)},
        )
        assert resp.status_code == 403

    async def test_player_forbidden(self, client, club, player_headers, trainer_member):
        _, sp = trainer_member
        resp = await client.delete(
            f"/api/v1/staff/{sp.id}",
            headers=player_headers,
            params={"club_id": str(club.id)},
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Existing staff queries unaffected by invitation rows
# ---------------------------------------------------------------------------


class TestInvitationsDoNotLeakIntoStaff:
    async def test_pending_invitation_not_listed_as_staff(
        self, client, club, admin, admin_headers, tenant, test_session_factory
    ):
        inv = await _seed_invitation(
            test_session_factory, tenant_id=tenant.id, club_id=club.id, invited_by=admin.id
        )
        resp = await client.get(
            "/api/v1/staff", headers=admin_headers, params={"club_id": str(club.id)}
        )
        assert resp.status_code == 200
        # The invited email has no StaffProfile yet → must not appear.
        assert inv.email not in {r["email"] for r in resp.json()}
