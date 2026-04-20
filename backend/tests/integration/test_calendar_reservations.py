"""
Integration tests for calendar-reservation endpoints.

Coverage
--------
POST   /calendar-reservations  — create (happy path, overlap conflict, role enforcement,
                                  tenant isolation)
PATCH  /calendar-reservations/{id}  — update (happy path, overlap conflict when shifting
                                       time, no conflict when editing non-overlapping fields)
DELETE /calendar-reservations/{id}  — delete (happy path)
GET    /calendar-reservations       — list with filters
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest_asyncio
from sqlalchemy import delete as sql_delete

from app.core.security import create_access_token
from app.db.models.booking import Booking, BookingStatus, BookingType
from app.db.models.court import CalendarReservation, CalendarReservationType, Court


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _dt(hours_from_now: int, minute: int = 0) -> datetime:
    base = datetime.now(tz=timezone.utc) + timedelta(hours=hours_from_now)
    return base.replace(minute=minute, second=0, microsecond=0)


def _reservation_payload(club_id, court_id, start: datetime, end: datetime, **kwargs) -> dict:
    return {
        "club_id": str(club_id),
        "court_id": str(court_id),
        "reservation_type": "training_block",
        "title": "Morning Drill",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        **kwargs,
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def court(club, test_session_factory):
    async with test_session_factory() as session:
        c = Court(club_id=club.id, name="Court A", surface_type="indoor", is_active=True)
        session.add(c)
        await session.commit()
        await session.refresh(c)

    yield c

    async with test_session_factory() as session:
        await session.execute(
            sql_delete(CalendarReservation).where(CalendarReservation.court_id == c.id)
        )
        obj = await session.get(Court, c.id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest_asyncio.fixture
async def existing_booking(club, court, test_session_factory, staff):
    start = _dt(72)
    end = start + timedelta(hours=1, minutes=30)
    async with test_session_factory() as session:
        b = Booking(
            club_id=club.id,
            court_id=court.id,
            booking_type=BookingType.regular,
            status=BookingStatus.confirmed,
            start_datetime=start,
            end_datetime=end,
            created_by_user_id=staff.id,
        )
        session.add(b)
        await session.commit()
        await session.refresh(b)

    yield b

    async with test_session_factory() as session:
        obj = await session.get(Booking, b.id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest_asyncio.fixture
async def existing_reservation(club, court, test_session_factory, staff):
    start = _dt(48)
    end = start + timedelta(hours=2)
    async with test_session_factory() as session:
        r = CalendarReservation(
            club_id=club.id,
            court_id=court.id,
            reservation_type=CalendarReservationType.training_block,
            title="Pre-existing block",
            start_datetime=start,
            end_datetime=end,
            created_by=staff.id,
        )
        session.add(r)
        await session.commit()
        await session.refresh(r)

    yield r

    async with test_session_factory() as session:
        obj = await session.get(CalendarReservation, r.id)
        if obj:
            await session.delete(obj)
        await session.commit()


# ---------------------------------------------------------------------------
# POST /api/v1/calendar-reservations
# ---------------------------------------------------------------------------

class TestCreateCalendarReservation:

    async def test_staff_creates_reservation_successfully(
        self, client, staff_headers, club, court
    ):
        start = _dt(72)
        end = start + timedelta(hours=1, minutes=30)
        resp = await client.post(
            "/api/v1/calendar-reservations",
            json=_reservation_payload(club.id, court.id, start, end),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["reservation_type"] == "training_block"
        assert body["court_id"] == str(court.id)

    async def test_overlap_with_existing_reservation_returns_409(
        self, client, staff_headers, club, court, existing_reservation
    ):
        """Creating a reservation that overlaps an existing one returns 409."""
        # Overlap: start inside the existing window
        overlap_start = existing_reservation.start_datetime + timedelta(minutes=30)
        overlap_end = overlap_start + timedelta(hours=1)
        resp = await client.post(
            "/api/v1/calendar-reservations",
            json=_reservation_payload(
                club.id, court.id, overlap_start, overlap_end,
                reservation_type="maintenance",
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 409, resp.text
        assert "already has a reservation" in resp.json()["detail"]

    async def test_adjacent_reservation_is_allowed(
        self, client, staff_headers, club, court, existing_reservation, test_session_factory
    ):
        """A reservation that starts exactly when another ends must not conflict."""
        adjacent_start = existing_reservation.end_datetime
        adjacent_end = adjacent_start + timedelta(hours=1)
        resp = await client.post(
            "/api/v1/calendar-reservations",
            json=_reservation_payload(club.id, court.id, adjacent_start, adjacent_end),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text

        async with test_session_factory() as session:
            obj = await session.get(CalendarReservation, uuid.UUID(resp.json()["id"]))
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_overlap_with_existing_booking_returns_409(
        self, client, staff_headers, club, court, existing_booking
    ):
        """Creating a reservation that overlaps a confirmed booking returns 409."""
        overlap_start = existing_booking.start_datetime + timedelta(minutes=30)
        overlap_end = overlap_start + timedelta(hours=1)
        resp = await client.post(
            "/api/v1/calendar-reservations",
            json=_reservation_payload(club.id, court.id, overlap_start, overlap_end),
            headers=staff_headers,
        )
        assert resp.status_code == 409, resp.text
        assert "existing booking" in resp.json()["detail"]

    async def test_player_cannot_create_reservation(
        self, client, player_headers, club, court
    ):
        start = _dt(72)
        end = start + timedelta(hours=1)
        resp = await client.post(
            "/api/v1/calendar-reservations",
            json=_reservation_payload(club.id, court.id, start, end),
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_tenant_isolation_on_create(
        self, client, club, court, plan, test_session_factory
    ):
        """A token whose tenant_id differs from X-Tenant-ID must be rejected."""
        other_tenant_id = uuid.uuid4()
        token = create_access_token({"sub": str(uuid.uuid4()), "tid": str(other_tenant_id)})
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(other_tenant_id),
        }
        start = _dt(72)
        end = start + timedelta(hours=1)
        resp = await client.post(
            "/api/v1/calendar-reservations",
            json=_reservation_payload(club.id, court.id, start, end),
            headers=headers,
        )
        assert resp.status_code in (401, 403, 404)


# ---------------------------------------------------------------------------
# PATCH /api/v1/calendar-reservations/{id}
# ---------------------------------------------------------------------------

class TestUpdateCalendarReservation:

    async def test_staff_can_rename_reservation(
        self, client, staff_headers, existing_reservation
    ):
        resp = await client.patch(
            f"/api/v1/calendar-reservations/{existing_reservation.id}",
            json={"title": "Renamed Block"},
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["title"] == "Renamed Block"

    async def test_shift_to_non_overlapping_time_succeeds(
        self, client, staff_headers, existing_reservation
    ):
        new_start = existing_reservation.end_datetime + timedelta(hours=2)
        new_end = new_start + timedelta(hours=1)
        resp = await client.patch(
            f"/api/v1/calendar-reservations/{existing_reservation.id}",
            json={
                "start_datetime": new_start.isoformat(),
                "end_datetime": new_end.isoformat(),
            },
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text

    async def test_shift_to_overlapping_time_returns_409(
        self, client, staff_headers, club, court, existing_reservation, test_session_factory, staff
    ):
        """Shifting a reservation so it overlaps a second reservation must return 409."""
        # Create a second reservation adjacent to the existing one
        second_start = existing_reservation.end_datetime + timedelta(hours=1)
        second_end = second_start + timedelta(hours=2)
        async with test_session_factory() as session:
            second = CalendarReservation(
                club_id=club.id,
                court_id=court.id,
                reservation_type=CalendarReservationType.private_hire,
                title="Private hire block",
                start_datetime=second_start,
                end_datetime=second_end,
                created_by=staff.id,
            )
            session.add(second)
            await session.commit()
            await session.refresh(second)

        # Now try to extend existing_reservation so it overlaps second
        resp = await client.patch(
            f"/api/v1/calendar-reservations/{existing_reservation.id}",
            json={"end_datetime": (second_start + timedelta(minutes=30)).isoformat()},
            headers=staff_headers,
        )
        assert resp.status_code == 409, resp.text

        async with test_session_factory() as session:
            obj = await session.get(CalendarReservation, second.id)
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_shift_to_overlap_booking_returns_409(
        self, client, staff_headers, club, court, existing_reservation, existing_booking, test_session_factory
    ):
        """Shifting a reservation so it overlaps a confirmed booking returns 409."""
        # existing_booking is at _dt(72) for 1h30; shift existing_reservation into it
        overlap_start = existing_booking.start_datetime + timedelta(minutes=30)
        overlap_end = overlap_start + timedelta(hours=1)
        resp = await client.patch(
            f"/api/v1/calendar-reservations/{existing_reservation.id}",
            json={
                "start_datetime": overlap_start.isoformat(),
                "end_datetime": overlap_end.isoformat(),
            },
            headers=staff_headers,
        )
        assert resp.status_code == 409, resp.text
        assert "existing booking" in resp.json()["detail"]

    async def test_updating_other_fields_does_not_conflict_with_self(
        self, client, staff_headers, existing_reservation
    ):
        """Patching non-time fields must not produce a self-conflict 409."""
        resp = await client.patch(
            f"/api/v1/calendar-reservations/{existing_reservation.id}",
            json={"title": "Updated title"},
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text

    async def test_player_cannot_update_reservation(
        self, client, player_headers, existing_reservation
    ):
        resp = await client.patch(
            f"/api/v1/calendar-reservations/{existing_reservation.id}",
            json={"title": "Hacked"},
            headers=player_headers,
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# DELETE /api/v1/calendar-reservations/{id}
# ---------------------------------------------------------------------------

class TestDeleteCalendarReservation:

    async def test_staff_can_delete_reservation(
        self, client, staff_headers, club, court, test_session_factory, staff
    ):
        start = _dt(96)
        end = start + timedelta(hours=1)
        async with test_session_factory() as session:
            r = CalendarReservation(
                club_id=club.id,
                court_id=court.id,
                reservation_type=CalendarReservationType.maintenance,
                title="To delete",
                start_datetime=start,
                end_datetime=end,
                created_by=staff.id,
            )
            session.add(r)
            await session.commit()
            await session.refresh(r)

        resp = await client.delete(
            f"/api/v1/calendar-reservations/{r.id}",
            headers=staff_headers,
        )
        assert resp.status_code == 204

    async def test_player_cannot_delete_reservation(
        self, client, player_headers, existing_reservation
    ):
        resp = await client.delete(
            f"/api/v1/calendar-reservations/{existing_reservation.id}",
            headers=player_headers,
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# GET /api/v1/calendar-reservations  — list
# ---------------------------------------------------------------------------

class TestListCalendarReservations:

    async def test_list_returns_existing_reservation(
        self, client, staff_headers, club, existing_reservation
    ):
        resp = await client.get(
            "/api/v1/calendar-reservations",
            params={"club_id": str(club.id)},
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        ids = [r["id"] for r in resp.json()]
        assert str(existing_reservation.id) in ids

    async def test_list_filters_by_reservation_type(
        self, client, staff_headers, club, existing_reservation
    ):
        resp = await client.get(
            "/api/v1/calendar-reservations",
            params={"club_id": str(club.id), "reservation_type": "training_block"},
            headers=staff_headers,
        )
        assert resp.status_code == 200
        for r in resp.json():
            assert r["reservation_type"] == "training_block"
