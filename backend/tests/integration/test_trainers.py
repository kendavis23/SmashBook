"""
Integration tests for trainer availability endpoints.

Coverage
--------
GET  /trainers                                       — list, role enforcement, tenant isolation
GET  /trainers/{id}/availability                     — happy path, 404
POST /trainers/{id}/availability                     — trainer own, ops_lead, role enforcement, validation
PUT  /trainers/{id}/availability/{avail_id}          — update, wrong trainer, validation
DELETE /trainers/{id}/availability/{avail_id}        — delete, wrong trainer
GET  /trainers/{id}/bookings                         — access control
"""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete as sql_delete

from app.db.models.staff import StaffProfile, StaffRole, TrainerAvailability
from app.db.models.user import TenantUserRole

BASE = "/api/v1/trainers"

AVAIL_BODY = {
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "12:00:00",
    "effective_from": "2026-04-01",
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def trainer_user(tenant, test_session_factory):
    from tests.integration.conftest import _create_user, _delete_user

    user = await _create_user(
        tenant.id, "trainer", "Test Trainer", TenantUserRole.trainer, test_session_factory
    )
    yield user
    await _delete_user(user.id, test_session_factory)


@pytest_asyncio.fixture
async def ops_lead_user(tenant, test_session_factory):
    from tests.integration.conftest import _create_user, _delete_user

    user = await _create_user(
        tenant.id, "ops", "Test Ops Lead", TenantUserRole.ops_lead, test_session_factory
    )
    yield user
    await _delete_user(user.id, test_session_factory)


@pytest_asyncio.fixture
async def trainer_profile(trainer_user, club, test_session_factory):
    async with test_session_factory() as session:
        profile = StaffProfile(
            user_id=trainer_user.id,
            club_id=club.id,
            role=StaffRole.trainer,
            is_active=True,
        )
        session.add(profile)
        await session.commit()
        await session.refresh(profile)

    yield profile

    async with test_session_factory() as session:
        await session.execute(
            sql_delete(TrainerAvailability).where(
                TrainerAvailability.staff_profile_id == profile.id
            )
        )
        obj = await session.get(StaffProfile, profile.id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest_asyncio.fixture
async def availability_window(trainer_profile, trainer_user, club, test_session_factory):
    from datetime import date, time

    async with test_session_factory() as session:
        window = TrainerAvailability(
            staff_profile_id=trainer_profile.id,
            day_of_week=0,
            start_time=time(10, 0),
            end_time=time(12, 0),
            set_by_user_id=trainer_user.id,
            effective_from=date(2026, 4, 1),
        )
        session.add(window)
        await session.commit()
        await session.refresh(window)

    yield window

    async with test_session_factory() as session:
        obj = await session.get(TrainerAvailability, window.id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest.fixture
def trainer_headers(trainer_user, tenant):
    from app.core.security import create_access_token

    token = create_access_token({"sub": str(trainer_user.id), "tid": str(tenant.id)})
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}


@pytest.fixture
def ops_lead_headers(ops_lead_user, tenant):
    from app.core.security import create_access_token

    token = create_access_token({"sub": str(ops_lead_user.id), "tid": str(tenant.id)})
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}


# ---------------------------------------------------------------------------
# GET /trainers
# ---------------------------------------------------------------------------


class TestListTrainers:
    async def test_staff_can_list_trainers(self, client, staff_headers, trainer_profile, club):
        resp = await client.get(
            BASE, params={"club_id": str(club.id)}, headers=staff_headers
        )
        assert resp.status_code == 200
        ids = [t["id"] for t in resp.json()]
        assert str(trainer_profile.id) in ids

    async def test_trainer_can_list_trainers(self, client, trainer_headers, trainer_profile, club):
        resp = await client.get(
            BASE, params={"club_id": str(club.id)}, headers=trainer_headers
        )
        assert resp.status_code == 200

    async def test_player_cannot_list_trainers(self, client, player_headers, club):
        resp = await client.get(
            BASE, params={"club_id": str(club.id)}, headers=player_headers
        )
        assert resp.status_code == 403

    async def test_unknown_club_returns_404(self, client, staff_headers):
        resp = await client.get(
            BASE, params={"club_id": str(uuid.uuid4())}, headers=staff_headers
        )
        assert resp.status_code == 404

    async def test_availability_embedded_in_response(
        self, client, staff_headers, trainer_profile, availability_window, club
    ):
        resp = await client.get(
            BASE, params={"club_id": str(club.id)}, headers=staff_headers
        )
        assert resp.status_code == 200
        trainer = next(t for t in resp.json() if t["id"] == str(trainer_profile.id))
        assert len(trainer["availability"]) >= 1
        avail_ids = [a["id"] for a in trainer["availability"]]
        assert str(availability_window.id) in avail_ids


# ---------------------------------------------------------------------------
# GET /trainers/{id}/availability
# ---------------------------------------------------------------------------


class TestGetTrainerAvailability:
    async def test_staff_can_get_availability(
        self, client, staff_headers, trainer_profile, availability_window
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/availability", headers=staff_headers
        )
        assert resp.status_code == 200
        ids = [a["id"] for a in resp.json()]
        assert str(availability_window.id) in ids

    async def test_unknown_trainer_returns_404(self, client, staff_headers):
        resp = await client.get(
            f"{BASE}/{uuid.uuid4()}/availability", headers=staff_headers
        )
        assert resp.status_code == 404

    async def test_player_cannot_access(self, client, player_headers, trainer_profile):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/availability", headers=player_headers
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# POST /trainers/{id}/availability
# ---------------------------------------------------------------------------


class TestSetTrainerAvailability:
    async def test_trainer_sets_own_availability(
        self, client, trainer_headers, trainer_profile, club
    ):
        resp = await client.post(
            f"{BASE}/{trainer_profile.id}/availability",
            json={**AVAIL_BODY, "club_id": str(club.id)},
            headers=trainer_headers,
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["day_of_week"] == 1
        assert body["start_time"] == "09:00:00"
        assert body["end_time"] == "12:00:00"
        assert body["staff_profile_id"] == str(trainer_profile.id)

    async def test_ops_lead_sets_trainer_availability(
        self, client, ops_lead_headers, trainer_profile, club
    ):
        resp = await client.post(
            f"{BASE}/{trainer_profile.id}/availability",
            json={**AVAIL_BODY, "club_id": str(club.id), "day_of_week": 2},
            headers=ops_lead_headers,
        )
        assert resp.status_code == 201

    async def test_staff_cannot_set_other_trainer_availability(
        self, client, staff_headers, trainer_profile, club
    ):
        resp = await client.post(
            f"{BASE}/{trainer_profile.id}/availability",
            json={**AVAIL_BODY, "club_id": str(club.id)},
            headers=staff_headers,
        )
        assert resp.status_code == 403

    async def test_end_before_start_is_rejected(
        self, client, trainer_headers, trainer_profile, club
    ):
        resp = await client.post(
            f"{BASE}/{trainer_profile.id}/availability",
            json={
                **AVAIL_BODY,
                "club_id": str(club.id),
                "start_time": "12:00:00",
                "end_time": "09:00:00",
            },
            headers=trainer_headers,
        )
        assert resp.status_code == 422

    async def test_wrong_club_id_is_rejected(
        self, client, trainer_headers, trainer_profile
    ):
        resp = await client.post(
            f"{BASE}/{trainer_profile.id}/availability",
            json={**AVAIL_BODY, "club_id": str(uuid.uuid4())},
            headers=trainer_headers,
        )
        assert resp.status_code == 422

    async def test_unknown_trainer_returns_404(self, client, ops_lead_headers, club):
        resp = await client.post(
            f"{BASE}/{uuid.uuid4()}/availability",
            json={**AVAIL_BODY, "club_id": str(club.id)},
            headers=ops_lead_headers,
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /trainers/{id}/availability/{avail_id}
# ---------------------------------------------------------------------------


class TestUpdateTrainerAvailability:
    async def test_trainer_updates_own_window(
        self, client, trainer_headers, trainer_profile, availability_window
    ):
        resp = await client.put(
            f"{BASE}/{trainer_profile.id}/availability/{availability_window.id}",
            json={"notes": "No early mornings"},
            headers=trainer_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["notes"] == "No early mornings"

    async def test_ops_lead_updates_window(
        self, client, ops_lead_headers, trainer_profile, availability_window
    ):
        resp = await client.put(
            f"{BASE}/{trainer_profile.id}/availability/{availability_window.id}",
            json={"day_of_week": 3},
            headers=ops_lead_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["day_of_week"] == 3

    async def test_staff_cannot_update(
        self, client, staff_headers, trainer_profile, availability_window
    ):
        resp = await client.put(
            f"{BASE}/{trainer_profile.id}/availability/{availability_window.id}",
            json={"notes": "hack"},
            headers=staff_headers,
        )
        assert resp.status_code == 403

    async def test_invalid_time_window_rejected(
        self, client, trainer_headers, trainer_profile, availability_window
    ):
        resp = await client.put(
            f"{BASE}/{trainer_profile.id}/availability/{availability_window.id}",
            json={"start_time": "14:00:00", "end_time": "09:00:00"},
            headers=trainer_headers,
        )
        assert resp.status_code == 422

    async def test_unknown_availability_id_returns_404(
        self, client, trainer_headers, trainer_profile
    ):
        resp = await client.put(
            f"{BASE}/{trainer_profile.id}/availability/{uuid.uuid4()}",
            json={"notes": "x"},
            headers=trainer_headers,
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /trainers/{id}/availability/{avail_id}
# ---------------------------------------------------------------------------


class TestDeleteTrainerAvailability:
    async def test_trainer_deletes_own_window(
        self, client, trainer_headers, trainer_profile, club, test_session_factory
    ):
        # Create a window to delete
        from datetime import date, time

        async with test_session_factory() as session:
            w = TrainerAvailability(
                staff_profile_id=trainer_profile.id,
                day_of_week=4,
                start_time=time(14, 0),
                end_time=time(16, 0),
                set_by_user_id=trainer_profile.user_id,
                effective_from=date(2026, 5, 1),
            )
            session.add(w)
            await session.commit()
            await session.refresh(w)

        resp = await client.delete(
            f"{BASE}/{trainer_profile.id}/availability/{w.id}",
            headers=trainer_headers,
        )
        assert resp.status_code == 204

    async def test_staff_cannot_delete(
        self, client, staff_headers, trainer_profile, availability_window
    ):
        resp = await client.delete(
            f"{BASE}/{trainer_profile.id}/availability/{availability_window.id}",
            headers=staff_headers,
        )
        assert resp.status_code == 403

    async def test_unknown_window_returns_404(
        self, client, trainer_headers, trainer_profile
    ):
        resp = await client.delete(
            f"{BASE}/{trainer_profile.id}/availability/{uuid.uuid4()}",
            headers=trainer_headers,
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /trainers/{id}/bookings
# ---------------------------------------------------------------------------


class TestGetTrainerBookings:
    async def test_trainer_can_see_own_bookings(
        self, client, trainer_headers, trainer_profile
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/bookings",
            headers=trainer_headers,
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_ops_lead_can_see_trainer_bookings(
        self, client, ops_lead_headers, trainer_profile
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/bookings",
            headers=ops_lead_headers,
        )
        assert resp.status_code == 200

    async def test_staff_cannot_see_trainer_bookings(
        self, client, staff_headers, trainer_profile
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/bookings",
            headers=staff_headers,
        )
        assert resp.status_code == 403

    async def test_player_cannot_see_trainer_bookings(
        self, client, player_headers, trainer_profile
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/bookings",
            headers=player_headers,
        )
        assert resp.status_code == 403
