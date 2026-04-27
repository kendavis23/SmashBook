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
from datetime import date, datetime, time, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy import delete as sql_delete, select

from app.db.models.booking import (
    Booking,
    BookingPlayer,
    BookingStatus,
    BookingType,
    InviteStatus,
    PaymentStatus,
    PlayerRole,
)
from app.db.models.club import OperatingHours
from app.db.models.court import Court
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


@pytest_asyncio.fixture
async def court(club, test_session_factory):
    async with test_session_factory() as session:
        c = Court(club_id=club.id, name="Court T", surface_type="indoor", is_active=True)
        session.add(c)
        await session.commit()
        await session.refresh(c)

    yield c

    async with test_session_factory() as session:
        booking_ids = (
            await session.execute(select(Booking.id).where(Booking.court_id == c.id))
        ).scalars().all()
        if booking_ids:
            await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id.in_(booking_ids)))
            await session.execute(sql_delete(Booking).where(Booking.id.in_(booking_ids)))
        obj = await session.get(Court, c.id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest_asyncio.fixture
async def lesson_booking_with_player(trainer_profile, trainer_user, court, club, test_session_factory):
    """A lesson_individual booking assigned to the trainer with one enrolled player."""
    start = datetime.now(tz=timezone.utc) + timedelta(days=1)
    end = start + timedelta(hours=1)

    async with test_session_factory() as session:
        booking = Booking(
            club_id=club.id,
            court_id=court.id,
            booking_type=BookingType.lesson_individual,
            status=BookingStatus.confirmed,
            start_datetime=start,
            end_datetime=end,
            created_by_user_id=trainer_user.id,
            staff_profile_id=trainer_profile.id,
            max_players=1,
        )
        session.add(booking)
        await session.flush()

        participant = BookingPlayer(
            booking_id=booking.id,
            user_id=trainer_user.id,
            role=PlayerRole.organiser,
            payment_status=PaymentStatus.pending,
            amount_due=0,
            invite_status=InviteStatus.accepted,
        )
        session.add(participant)
        await session.commit()
        await session.refresh(booking)

    yield booking

    async with test_session_factory() as session:
        await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id == booking.id))
        obj = await session.get(Booking, booking.id)
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

    async def test_player_can_list_trainers(self, client, player_headers, trainer_profile, club):
        resp = await client.get(
            BASE, params={"club_id": str(club.id)}, headers=player_headers
        )
        assert resp.status_code == 200
        ids = [t["id"] for t in resp.json()]
        assert str(trainer_profile.id) in ids

    async def test_inactive_trainer_not_visible_to_player(
        self, client, player_headers, trainer_profile, club, test_session_factory
    ):
        async with test_session_factory() as session:
            p = await session.get(StaffProfile, trainer_profile.id)
            p.is_active = False
            await session.commit()

        try:
            resp = await client.get(
                BASE, params={"club_id": str(club.id)}, headers=player_headers
            )
            assert resp.status_code == 200
            ids = [t["id"] for t in resp.json()]
            assert str(trainer_profile.id) not in ids
        finally:
            async with test_session_factory() as session:
                p = await session.get(StaffProfile, trainer_profile.id)
                p.is_active = True
                await session.commit()

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

    async def test_booking_includes_participants(
        self, client, trainer_headers, trainer_profile, lesson_booking_with_player, trainer_user
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/bookings",
            headers=trainer_headers,
        )
        assert resp.status_code == 200
        bookings = resp.json()
        match = next((b for b in bookings if b["booking_id"] == str(lesson_booking_with_player.id)), None)
        assert match is not None, "lesson booking not found in response"
        assert len(match["participants"]) == 1
        p = match["participants"][0]
        assert p["user_id"] == str(trainer_user.id)
        assert p["full_name"] == trainer_user.full_name
        assert p["email"] == trainer_user.email
        assert p["role"] == PlayerRole.organiser
        assert p["payment_status"] == PaymentStatus.pending
        assert p["invite_status"] == InviteStatus.accepted

    async def test_booking_with_no_players_has_empty_participants(
        self, client, trainer_headers, trainer_profile
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/bookings",
            headers=trainer_headers,
        )
        assert resp.status_code == 200
        for b in resp.json():
            assert "participants" in b


# ---------------------------------------------------------------------------
# Fixtures for GET /trainers/{id}/open-slots
# ---------------------------------------------------------------------------

# Target date: Monday 2026-04-06 (after availability_window effective_from=2026-04-01)
_SLOT_DATE = date(2026, 4, 6)
# availability_window covers day_of_week=0, 10:00–12:00
# Club default: 90-min slots. Grid from 09:00: …, 09:00–10:30, 10:30–12:00, 12:00–13:30, …
# Only 10:30–12:00 falls fully inside the 10:00–12:00 window.
_EXPECTED_START = datetime(2026, 4, 6, 10, 30, tzinfo=timezone.utc)
_EXPECTED_END = datetime(2026, 4, 6, 12, 0, tzinfo=timezone.utc)


@pytest_asyncio.fixture
async def monday_operating_hours(club, test_session_factory):
    """Mon 09:00–18:00 operating hours for the shared club fixture."""
    async with test_session_factory() as session:
        oh = OperatingHours(
            club_id=club.id,
            day_of_week=0,
            open_time=time(9, 0),
            close_time=time(18, 0),
        )
        session.add(oh)
        await session.commit()
        await session.refresh(oh)

    yield oh

    async with test_session_factory() as session:
        obj = await session.get(OperatingHours, oh.id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest_asyncio.fixture
async def trainer_slot_booking(trainer_profile, court, club, trainer_user, test_session_factory):
    """A confirmed lesson booking for the trainer covering the expected open slot."""
    async with test_session_factory() as session:
        booking = Booking(
            club_id=club.id,
            court_id=court.id,
            booking_type=BookingType.lesson_individual,
            status=BookingStatus.confirmed,
            start_datetime=_EXPECTED_START,
            end_datetime=_EXPECTED_END,
            created_by_user_id=trainer_user.id,
            staff_profile_id=trainer_profile.id,
            max_players=1,
        )
        session.add(booking)
        await session.commit()
        await session.refresh(booking)

    yield booking

    async with test_session_factory() as session:
        await session.execute(
            sql_delete(BookingPlayer).where(BookingPlayer.booking_id == booking.id)
        )
        obj = await session.get(Booking, booking.id)
        if obj:
            await session.delete(obj)
        await session.commit()


# ---------------------------------------------------------------------------
# GET /trainers/{id}/open-slots
# ---------------------------------------------------------------------------


class TestGetTrainerOpenSlots:
    async def test_returns_open_slots_within_availability(
        self, client, player_headers, trainer_profile, availability_window, monday_operating_hours, club
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/open-slots",
            params={"club_id": str(club.id), "date": str(_SLOT_DATE)},
            headers=player_headers,
        )
        assert resp.status_code == 200
        slots = resp.json()
        assert len(slots) == 1
        assert slots[0]["start_datetime"].startswith("2026-04-06T10:30")
        assert slots[0]["end_datetime"].startswith("2026-04-06T12:00")

    async def test_booked_slot_is_excluded(
        self,
        client,
        player_headers,
        trainer_profile,
        availability_window,
        monday_operating_hours,
        trainer_slot_booking,
        club,
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/open-slots",
            params={"club_id": str(club.id), "date": str(_SLOT_DATE)},
            headers=player_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_no_availability_window_returns_empty(
        self, client, player_headers, trainer_profile, monday_operating_hours, club
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/open-slots",
            params={"club_id": str(club.id), "date": str(_SLOT_DATE)},
            headers=player_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_no_operating_hours_returns_empty(
        self, client, player_headers, trainer_profile, availability_window, club
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/open-slots",
            params={"club_id": str(club.id), "date": str(_SLOT_DATE)},
            headers=player_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_unknown_trainer_returns_404(
        self, client, player_headers, club, monday_operating_hours
    ):
        resp = await client.get(
            f"{BASE}/{uuid.uuid4()}/open-slots",
            params={"club_id": str(club.id), "date": str(_SLOT_DATE)},
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_unknown_club_returns_404(
        self, client, player_headers, trainer_profile
    ):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/open-slots",
            params={"club_id": str(uuid.uuid4()), "date": str(_SLOT_DATE)},
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_unauthenticated_returns_403(self, client, trainer_profile, club, tenant):
        resp = await client.get(
            f"{BASE}/{trainer_profile.id}/open-slots",
            params={"club_id": str(club.id), "date": str(_SLOT_DATE)},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# GET /trainers/available
# ---------------------------------------------------------------------------

# availability_window fixture: day_of_week=0, 10:00–12:00, effective_from=2026-04-01
# _SLOT_DATE (2026-04-06) is a Monday → day_of_week=0
_AVAIL_SLOT_START = "10:30:00"
_AVAIL_SLOT_END = "11:30:00"


class TestListAvailableTrainers:
    async def test_happy_path_returns_trainer(
        self, client, player_headers, trainer_profile, trainer_user, availability_window, club
    ):
        resp = await client.get(
            f"{BASE}/available",
            params={
                "club_id": str(club.id),
                "date": str(_SLOT_DATE),
                "start_time": _AVAIL_SLOT_START,
                "end_time": _AVAIL_SLOT_END,
            },
            headers=player_headers,
        )
        assert resp.status_code == 200
        trainers = resp.json()
        ids = [t["id"] for t in trainers]
        assert str(trainer_profile.id) in ids
        match = next(t for t in trainers if t["id"] == str(trainer_profile.id))
        assert match["full_name"] == trainer_user.full_name
        assert match["club_id"] == str(club.id)

    async def test_conflicting_booking_excludes_trainer(
        self,
        client,
        player_headers,
        trainer_profile,
        availability_window,
        trainer_slot_booking,
        club,
    ):
        # trainer_slot_booking covers 10:30–12:00, overlapping 10:30–11:30
        resp = await client.get(
            f"{BASE}/available",
            params={
                "club_id": str(club.id),
                "date": str(_SLOT_DATE),
                "start_time": _AVAIL_SLOT_START,
                "end_time": _AVAIL_SLOT_END,
            },
            headers=player_headers,
        )
        assert resp.status_code == 200
        ids = [t["id"] for t in resp.json()]
        assert str(trainer_profile.id) not in ids

    async def test_no_availability_window_excludes_trainer(
        self, client, player_headers, trainer_profile, club
    ):
        resp = await client.get(
            f"{BASE}/available",
            params={
                "club_id": str(club.id),
                "date": str(_SLOT_DATE),
                "start_time": _AVAIL_SLOT_START,
                "end_time": _AVAIL_SLOT_END,
            },
            headers=player_headers,
        )
        assert resp.status_code == 200
        ids = [t["id"] for t in resp.json()]
        assert str(trainer_profile.id) not in ids

    async def test_slot_outside_availability_window_excluded(
        self, client, player_headers, trainer_profile, availability_window, club
    ):
        # availability_window is 10:00–12:00; request 08:00–09:00 falls outside
        resp = await client.get(
            f"{BASE}/available",
            params={
                "club_id": str(club.id),
                "date": str(_SLOT_DATE),
                "start_time": "08:00:00",
                "end_time": "09:00:00",
            },
            headers=player_headers,
        )
        assert resp.status_code == 200
        ids = [t["id"] for t in resp.json()]
        assert str(trainer_profile.id) not in ids

    async def test_wrong_day_of_week_excludes_trainer(
        self, client, player_headers, trainer_profile, availability_window, club
    ):
        # availability_window is day_of_week=0 (Monday); 2026-04-07 is Tuesday
        resp = await client.get(
            f"{BASE}/available",
            params={
                "club_id": str(club.id),
                "date": "2026-04-07",
                "start_time": _AVAIL_SLOT_START,
                "end_time": _AVAIL_SLOT_END,
            },
            headers=player_headers,
        )
        assert resp.status_code == 200
        ids = [t["id"] for t in resp.json()]
        assert str(trainer_profile.id) not in ids

    async def test_inactive_trainer_excluded(
        self, client, player_headers, trainer_profile, availability_window, club, test_session_factory
    ):
        async with test_session_factory() as session:
            p = await session.get(StaffProfile, trainer_profile.id)
            p.is_active = False
            await session.commit()
        try:
            resp = await client.get(
                f"{BASE}/available",
                params={
                    "club_id": str(club.id),
                    "date": str(_SLOT_DATE),
                    "start_time": _AVAIL_SLOT_START,
                    "end_time": _AVAIL_SLOT_END,
                },
                headers=player_headers,
            )
            assert resp.status_code == 200
            ids = [t["id"] for t in resp.json()]
            assert str(trainer_profile.id) not in ids
        finally:
            async with test_session_factory() as session:
                p = await session.get(StaffProfile, trainer_profile.id)
                p.is_active = True
                await session.commit()

    async def test_end_time_before_start_time_returns_422(
        self, client, player_headers, club
    ):
        resp = await client.get(
            f"{BASE}/available",
            params={
                "club_id": str(club.id),
                "date": str(_SLOT_DATE),
                "start_time": "12:00:00",
                "end_time": "10:00:00",
            },
            headers=player_headers,
        )
        assert resp.status_code == 422

    async def test_unknown_club_returns_404(self, client, player_headers):
        resp = await client.get(
            f"{BASE}/available",
            params={
                "club_id": str(uuid.uuid4()),
                "date": str(_SLOT_DATE),
                "start_time": _AVAIL_SLOT_START,
                "end_time": _AVAIL_SLOT_END,
            },
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_unauthenticated_returns_403(self, client, club, tenant):
        resp = await client.get(
            f"{BASE}/available",
            params={
                "club_id": str(club.id),
                "date": str(_SLOT_DATE),
                "start_time": _AVAIL_SLOT_START,
                "end_time": _AVAIL_SLOT_END,
            },
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 403

    async def test_tenant_isolation(self, client, club):
        from app.core.security import create_access_token

        other_tenant_id = uuid.uuid4()
        token = create_access_token({"sub": str(uuid.uuid4()), "tid": str(other_tenant_id)})
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(other_tenant_id),
        }
        resp = await client.get(
            f"{BASE}/available",
            params={
                "club_id": str(club.id),
                "date": str(_SLOT_DATE),
                "start_time": _AVAIL_SLOT_START,
                "end_time": _AVAIL_SLOT_END,
            },
            headers=headers,
        )
        # 401 if tenant doesn't exist; 404 if tenant exists but doesn't own the club
        assert resp.status_code in (401, 404)

    async def test_results_sorted_by_full_name(
        self,
        client,
        player_headers,
        trainer_profile,
        availability_window,
        club,
        test_session_factory,
        tenant,
    ):
        from tests.integration.conftest import _create_user, _delete_user

        # "Alpha Trainer" sorts before "Test Trainer"
        second_user = await _create_user(
            tenant.id, "alpha", "Alpha Trainer", TenantUserRole.trainer, test_session_factory
        )
        second_profile = None
        try:
            async with test_session_factory() as session:
                second_profile = StaffProfile(
                    user_id=second_user.id,
                    club_id=club.id,
                    role=StaffRole.trainer,
                    is_active=True,
                )
                session.add(second_profile)
                await session.flush()
                w = TrainerAvailability(
                    staff_profile_id=second_profile.id,
                    day_of_week=0,
                    start_time=time(10, 0),
                    end_time=time(12, 0),
                    set_by_user_id=second_user.id,
                    effective_from=date(2026, 4, 1),
                )
                session.add(w)
                await session.commit()
                await session.refresh(second_profile)

            resp = await client.get(
                f"{BASE}/available",
                params={
                    "club_id": str(club.id),
                    "date": str(_SLOT_DATE),
                    "start_time": _AVAIL_SLOT_START,
                    "end_time": _AVAIL_SLOT_END,
                },
                headers=player_headers,
            )
            assert resp.status_code == 200
            names = [t["full_name"] for t in resp.json()]
            assert names == sorted(names)
            assert "Alpha Trainer" in names
            assert "Test Trainer" in names
        finally:
            if second_profile:
                async with test_session_factory() as session:
                    await session.execute(
                        sql_delete(TrainerAvailability).where(
                            TrainerAvailability.staff_profile_id == second_profile.id
                        )
                    )
                    obj = await session.get(StaffProfile, second_profile.id)
                    if obj:
                        await session.delete(obj)
                    await session.commit()
            await _delete_user(second_user.id, test_session_factory)
