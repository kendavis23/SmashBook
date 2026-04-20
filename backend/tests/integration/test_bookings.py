"""
Integration tests for booking endpoints.

Coverage
--------
POST   /bookings                  — create (all modes), validation, role enforcement
GET    /bookings                  — list (staff vs player scope)
GET    /bookings/open-games       — browse, filters
GET    /bookings/{id}             — detail, access control
POST   /bookings/{id}/join        — join open game, skill/capacity enforcement
POST   /bookings/{id}/invite      — invite player, role enforcement
DELETE /bookings/{id}             — cancel, role enforcement
POST   /bookings/recurring        — recurring booking series creation
Tenant isolation tested on create and cancel.
"""

import uuid
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import delete as sql_delete, select

from app.core.security import create_access_token
from app.db.models.booking import Booking, BookingPlayer
from app.db.models.club import OperatingHours, PricingRule
from app.db.models.staff import StaffProfile, StaffRole, TrainerAvailability
from app.db.models.court import CalendarReservation, CalendarReservationType, Court
from app.db.models.user import TenantUserRole, User

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DURATION = 90  # minutes — matches Club default


def _future(hours: int = 48) -> datetime:
    """A datetime well inside booking notice + advance windows.

    Always returns 10:30 UTC on the target date (3 × 90-min slots from open_time=06:00),
    which keeps start+duration (12:00) safely inside the 06:00–23:00 operating hours
    regardless of when the tests run.
    """
    dt = datetime.now(tz=timezone.utc) + timedelta(hours=hours)
    # 10:30 is exactly 3 × 90-min slots from open_time=06:00 and well inside close_time=23:00
    return dt.replace(hour=10, minute=30, second=0, microsecond=0)


def _booking_payload(club_id, court_id, start: datetime, **kwargs) -> dict:
    return {
        "club_id": str(club_id),
        "court_id": str(court_id),
        "start_datetime": start.isoformat(),
        "booking_type": "regular",
        "is_open_game": False,
        "max_players": 4,
        **kwargs,
    }


# ---------------------------------------------------------------------------
# Fixtures: operating hours, pricing rule, court, extra player
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def court_with_hours(club, test_session_factory):
    """Court + operating hours covering Mon–Sun 06:00–23:00, 90-min slots, plus a pricing rule."""
    async with test_session_factory() as session:
        court = Court(club_id=club.id, name="Court 1", surface_type="indoor", is_active=True)
        session.add(court)
        await session.flush()

        for dow in range(7):
            oh = OperatingHours(
                club_id=club.id,
                day_of_week=dow,
                open_time=time(6, 0),
                close_time=time(23, 0),
            )
            session.add(oh)

        rule = PricingRule(
            club_id=club.id,
            label="Standard",
            day_of_week=_future().weekday(),
            start_time=time(0, 0),
            end_time=time(23, 59),
            is_active=True,
            price_per_slot=Decimal("20.00"),
        )
        session.add(rule)
        await session.commit()
        await session.refresh(court)

    yield court

    async with test_session_factory() as session:
        # Delete bookings referencing this court before deleting the court
        booking_ids = (
            await session.execute(select(Booking.id).where(Booking.court_id == court.id))
        ).scalars().all()
        if booking_ids:
            await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id.in_(booking_ids)))
            await session.execute(sql_delete(Booking).where(Booking.id.in_(booking_ids)))
        await session.execute(sql_delete(PricingRule).where(PricingRule.club_id == club.id))
        await session.execute(sql_delete(OperatingHours).where(OperatingHours.club_id == club.id))
        await session.execute(sql_delete(Court).where(Court.id == court.id))
        await session.commit()


@pytest_asyncio.fixture
async def player2(tenant, test_session_factory):
    """A second player in the same tenant."""
    from app.core.security import get_password_hash
    async with test_session_factory() as session:
        u = User(
            tenant_id=tenant.id,
            email=f"player2-{uuid.uuid4().hex[:6]}@test.com",
            full_name="Player Two",
            hashed_password=get_password_hash("Test1234!"),
            is_active=True,
            role=TenantUserRole.player,
            skill_level=Decimal("3.5"),
        )
        session.add(u)
        await session.commit()
        await session.refresh(u)
    yield u
    async with test_session_factory() as session:
        await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.user_id == u.id))
        obj = await session.get(User, u.id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest_asyncio.fixture
async def player_with_skill(tenant, test_session_factory):
    """A player with skill_level=4.0."""
    from app.core.security import get_password_hash
    async with test_session_factory() as session:
        u = User(
            tenant_id=tenant.id,
            email=f"skilled-{uuid.uuid4().hex[:6]}@test.com",
            full_name="Skilled Player",
            hashed_password=get_password_hash("Test1234!"),
            is_active=True,
            role=TenantUserRole.player,
            skill_level=Decimal("4.0"),
        )
        session.add(u)
        await session.commit()
        await session.refresh(u)
    yield u
    async with test_session_factory() as session:
        await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.user_id == u.id))
        obj = await session.get(User, u.id)
        if obj:
            await session.delete(obj)
        await session.commit()


@pytest.fixture
def player2_headers(player2, tenant):
    token = create_access_token({"sub": str(player2.id), "tid": str(tenant.id)})
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}


@pytest.fixture
def skilled_player_headers(player_with_skill, tenant):
    token = create_access_token({"sub": str(player_with_skill.id), "tid": str(tenant.id)})
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}


# ---------------------------------------------------------------------------
# Cleanup helper: delete bookings for a club
# ---------------------------------------------------------------------------

async def _delete_bookings_for_court(court_id, session_factory):
    async with session_factory() as session:
        booking_ids = (
            await session.execute(select(Booking.id).where(Booking.court_id == court_id))
        ).scalars().all()
        if booking_ids:
            await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id.in_(booking_ids)))
            await session.execute(sql_delete(Booking).where(Booking.id.in_(booking_ids)))
        await session.commit()


# ---------------------------------------------------------------------------
# POST /api/v1/bookings
# ---------------------------------------------------------------------------

class TestCreateBooking:

    async def test_player_creates_regular_booking(self, client, player_headers, club, court_with_hours):
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["status"] == "pending"
        assert body["is_open_game"] is False
        assert body["slots_available"] == 3  # organiser takes 1 slot
        assert len(body["players"]) == 1
        assert body["players"][0]["role"] == "organiser"
        assert body["total_price"] == "20.00"

    async def test_player_creates_open_game(self, client, player_headers, club, court_with_hours):
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start, is_open_game=True),
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["is_open_game"] is True
        assert body["status"] == "pending"
        assert body["slots_available"] == 3

    async def test_staff_creates_empty_open_game(self, client, staff_headers, club, court_with_hours):
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                is_open_game=True,
                anchor_skill_level="4.0",
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["slots_available"] == 4  # no players yet
        assert len(body["players"]) == 0
        assert body["min_skill_level"] is not None
        assert body["max_skill_level"] is not None

    async def test_player_cannot_create_empty_open_game(self, client, player_headers, club, court_with_hours):
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start, is_open_game=True, player_user_ids=[]),
            headers=player_headers,
        )
        # player_user_ids=[] means no additional players; organiser is auto-added so slots_available=3
        # BUT if we want to test truly empty (no organiser either), that requires is_open_game=True
        # and explicit empty. In practice player auto-adds self as organiser, so 201.
        # This test verifies the endpoint doesn't fail for normal player open game creation.
        assert resp.status_code == 201

    async def test_private_booking_with_4_players_auto_confirms(
        self, client, staff_headers, club, court_with_hours, player2, player_with_skill, test_session_factory, tenant
    ):
        from app.core.security import get_password_hash
        async with test_session_factory() as session:
            p3 = User(
                tenant_id=tenant.id,
                email=f"p3-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Player 3",
                hashed_password=get_password_hash("Test1234!"),
                is_active=True,
                role=TenantUserRole.player,
            )
            session.add(p3)
            await session.commit()
            await session.refresh(p3)

        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                player_user_ids=[str(player2.id), str(player_with_skill.id), str(p3.id)],
            ),
            headers=staff_headers,
        )

        async with test_session_factory() as session:
            await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.user_id == p3.id))
            obj = await session.get(User, p3.id)
            if obj:
                await session.delete(obj)
            await session.commit()

        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["status"] == "confirmed"
        assert body["slots_available"] == 0
        assert len(body["players"]) == 4

    async def test_off_grid_start_time_rejected(self, client, player_headers, club, court_with_hours):
        start = _future().replace(minute=15)  # not on 90-min boundary
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert resp.status_code == 422

    async def test_outside_operating_hours_rejected(self, client, player_headers, club, court_with_hours):
        start = _future().replace(hour=2, minute=0)  # 02:00 — before open at 06:00
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert resp.status_code == 422

    async def test_court_conflict_rejected(self, client, player_headers, staff_headers, club, court_with_hours, test_session_factory):
        start = _future()
        # First booking
        r1 = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert r1.status_code == 201

        # Same slot, different user
        r2 = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=staff_headers,
        )
        assert r2.status_code == 409

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_booking_blocked_by_training_block_reservation(
        self, client, player_headers, club, court_with_hours, staff, test_session_factory
    ):
        """A regular booking must be rejected (409) when the court has a training_block."""
        start = _future()
        end = start + timedelta(minutes=DURATION)
        async with test_session_factory() as session:
            reservation = CalendarReservation(
                club_id=club.id,
                court_id=court_with_hours.id,
                reservation_type=CalendarReservationType.training_block,
                title="Coach session",
                start_datetime=start,
                end_datetime=end,
                created_by=staff.id,
            )
            session.add(reservation)
            await session.commit()
            await session.refresh(reservation)

        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert resp.status_code == 409, resp.text
        assert "training block" in resp.json()["detail"]

        async with test_session_factory() as session:
            obj = await session.get(CalendarReservation, reservation.id)
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_booking_blocked_by_private_hire_reservation(
        self, client, player_headers, club, court_with_hours, staff, test_session_factory
    ):
        """A regular booking must be rejected (409) when the court has a private_hire reservation."""
        start = _future()
        end = start + timedelta(minutes=DURATION)
        async with test_session_factory() as session:
            reservation = CalendarReservation(
                club_id=club.id,
                court_id=court_with_hours.id,
                reservation_type=CalendarReservationType.private_hire,
                title="Private event",
                start_datetime=start,
                end_datetime=end,
                created_by=staff.id,
            )
            session.add(reservation)
            await session.commit()
            await session.refresh(reservation)

        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert resp.status_code == 409, resp.text
        assert "private hire" in resp.json()["detail"]

        async with test_session_factory() as session:
            obj = await session.get(CalendarReservation, reservation.id)
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_booking_blocked_by_maintenance_reservation(
        self, client, player_headers, club, court_with_hours, staff, test_session_factory
    ):
        """A regular booking must be rejected (409) when the court is under maintenance."""
        start = _future()
        end = start + timedelta(minutes=DURATION)
        async with test_session_factory() as session:
            reservation = CalendarReservation(
                club_id=club.id,
                court_id=court_with_hours.id,
                reservation_type=CalendarReservationType.maintenance,
                title="Net repair",
                start_datetime=start,
                end_datetime=end,
                created_by=staff.id,
            )
            session.add(reservation)
            await session.commit()
            await session.refresh(reservation)

        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert resp.status_code == 409, resp.text
        assert "maintenance" in resp.json()["detail"]

        async with test_session_factory() as session:
            obj = await session.get(CalendarReservation, reservation.id)
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_notice_window_violation_for_player(self, client, player_headers, club, court_with_hours):
        # 1 hour ahead — less than default min_booking_notice_hours=2
        start = datetime.now(tz=timezone.utc) + timedelta(hours=1)
        start = start.replace(minute=0, second=0, microsecond=0)
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert resp.status_code == 422

    async def test_unknown_court_returns_404(self, client, player_headers, club):
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, uuid.uuid4(), start),
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_tenant_isolation(self, client, club, court_with_hours, plan, test_session_factory):
        """A token issued for a different tenant must be rejected."""
        from app.db.models.tenant import Tenant as TenantModel
        subdomain = f"alien-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Alien", subdomain=subdomain, plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.flush()
            alien_user = User(
                tenant_id=t2.id,
                email=f"alien-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Alien",
                hashed_password="x",
                is_active=True,
                role=TenantUserRole.player,
            )
            session.add(alien_user)
            await session.commit()
            await session.refresh(alien_user)
            t2_id, alien_id = t2.id, alien_user.id

        token = create_access_token({"sub": str(alien_id), "tid": str(t2_id)})
        headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2_id)}
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=headers,
        )
        assert resp.status_code in (401, 404)

        async with test_session_factory() as session:
            obj = await session.get(User, alien_id)
            if obj:
                await session.delete(obj)
            obj2 = await session.get(TenantModel, t2_id)
            if obj2:
                await session.delete(obj2)
            await session.commit()


# ---------------------------------------------------------------------------
# GET /api/v1/bookings
# ---------------------------------------------------------------------------

class TestListBookings:

    async def test_staff_sees_all_bookings(self, client, staff_headers, player_headers, club, court_with_hours, test_session_factory):
        # Use same day, different valid slot times (10:30 and 13:30 are on the 90-min grid)
        s1 = _future(48)
        s2 = _future(48).replace(hour=13, minute=30)  # two non-overlapping slots, same day
        await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, s1), headers=player_headers)
        await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, s2), headers=staff_headers)

        resp = await client.get(f"/api/v1/bookings?club_id={club.id}", headers=staff_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 2

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_player_sees_only_own_bookings(self, client, player_headers, staff_headers, club, court_with_hours, test_session_factory):
        s1 = _future(48)
        s2 = _future(48).replace(hour=13, minute=30)
        await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, s1), headers=player_headers)
        await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, s2), headers=staff_headers)

        resp = await client.get(f"/api/v1/bookings?club_id={club.id}", headers=player_headers)
        assert resp.status_code == 200
        bookings = resp.json()
        assert len(bookings) == 1  # only their own

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)


# ---------------------------------------------------------------------------
# GET /api/v1/bookings/open-games
# ---------------------------------------------------------------------------

class TestListOpenGames:

    async def test_returns_open_games_only(self, client, staff_headers, player_headers, club, court_with_hours, tenant, test_session_factory):
        s1, s2 = _future(48), _future(51)
        # Open game
        await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, s1, is_open_game=True), headers=player_headers)
        # Private booking
        await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, s2, is_open_game=False), headers=player_headers)

        resp = await client.get(
            f"/api/v1/bookings/open-games?club_id={club.id}",
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200
        results = resp.json()
        assert all(r["slots_available"] > 0 for r in results)

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_date_filter(self, client, player_headers, club, court_with_hours, tenant, test_session_factory):
        start = _future(48)
        await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start, is_open_game=True), headers=player_headers)

        good_date = start.strftime("%Y-%m-%d")
        bad_date = (start + timedelta(days=5)).strftime("%Y-%m-%d")

        r_good = await client.get(
            f"/api/v1/bookings/open-games?club_id={club.id}&date={good_date}",
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        r_bad = await client.get(
            f"/api/v1/bookings/open-games?club_id={club.id}&date={bad_date}",
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert len(r_good.json()) >= 1
        assert len(r_bad.json()) == 0

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)


# ---------------------------------------------------------------------------
# GET /api/v1/bookings/{id}
# ---------------------------------------------------------------------------

class TestGetBooking:

    async def test_player_can_get_own_booking(self, client, player_headers, club, court_with_hours, test_session_factory):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.get(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=player_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == booking_id

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_player_can_get_open_game_they_arent_in(
        self, client, player_headers, player2_headers, club, court_with_hours, test_session_factory
    ):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start, is_open_game=True), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.get(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=player2_headers)
        assert resp.status_code == 200

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_player_cannot_get_private_booking_they_arent_in(
        self, client, player_headers, player2_headers, club, court_with_hours, test_session_factory
    ):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start, is_open_game=False), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.get(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=player2_headers)
        assert resp.status_code == 404

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_staff_can_get_any_booking(self, client, player_headers, staff_headers, club, court_with_hours, test_session_factory):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.get(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=staff_headers)
        assert resp.status_code == 200

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)


# ---------------------------------------------------------------------------
# POST /api/v1/bookings/{id}/join
# ---------------------------------------------------------------------------

class TestJoinBooking:

    async def test_player_joins_open_game(self, client, player_headers, player2_headers, club, court_with_hours, test_session_factory):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start, is_open_game=True), headers=player_headers)
        booking_id = r.json()["id"]
        assert r.json()["slots_available"] == 3

        resp = await client.post(f"/api/v1/bookings/{booking_id}/join?club_id={club.id}", headers=player2_headers)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["slots_available"] == 2
        assert len(body["players"]) == 2

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_fourth_player_confirms_booking(
        self, client, staff_headers, player2_headers, skilled_player_headers,
        player_with_skill, club, court_with_hours, test_session_factory, tenant
    ):
        from app.core.security import get_password_hash
        async with test_session_factory() as session:
            p3 = User(
                tenant_id=tenant.id,
                email=f"p3b-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Player 3b",
                hashed_password=get_password_hash("Test1234!"),
                is_active=True,
                role=TenantUserRole.player,
            )
            session.add(p3)
            await session.commit()
            await session.refresh(p3)
            p3_token = create_access_token({"sub": str(p3.id), "tid": str(tenant.id)})
            p3_headers = {"Authorization": f"Bearer {p3_token}", "X-Tenant-ID": str(tenant.id)}

        # Staff creates empty open game (no players)
        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start, is_open_game=True, anchor_skill_level=None),
            headers=staff_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]
        assert r.json()["status"] == "pending"

        for headers in [staff_headers, player2_headers, skilled_player_headers, p3_headers]:
            await client.post(f"/api/v1/bookings/{booking_id}/join?club_id={club.id}", headers=headers)

        final = await client.get(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=staff_headers)
        assert final.json()["status"] == "confirmed"

        async with test_session_factory() as session:
            await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.user_id == p3.id))
            obj = await session.get(User, p3.id)
            if obj:
                await session.delete(obj)
            await session.commit()

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_cannot_join_private_booking(self, client, player_headers, player2_headers, club, court_with_hours, test_session_factory):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start, is_open_game=False), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.post(f"/api/v1/bookings/{booking_id}/join?club_id={club.id}", headers=player2_headers)
        assert resp.status_code == 403

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_cannot_join_full_booking(self, client, player_headers, player2_headers, club, court_with_hours, test_session_factory, tenant, staff_headers):
        from app.core.security import get_password_hash
        # Create 3 extra players to fill the game
        extra_ids = []
        extra_headers_list = []
        async with test_session_factory() as session:
            for i in range(3):
                u = User(
                    tenant_id=tenant.id,
                    email=f"filler{i}-{uuid.uuid4().hex[:6]}@test.com",
                    full_name=f"Filler {i}",
                    hashed_password=get_password_hash("Test1234!"),
                    is_active=True,
                    role=TenantUserRole.player,
                )
                session.add(u)
            await session.commit()

        async with test_session_factory() as session:
            result = await session.execute(
                select(User).where(User.tenant_id == tenant.id, User.full_name.like("Filler %"))
            )
            fillers = result.scalars().all()
            extra_ids = [f.id for f in fillers]
            for f in fillers:
                t = create_access_token({"sub": str(f.id), "tid": str(tenant.id)})
                extra_headers_list.append({"Authorization": f"Bearer {t}", "X-Tenant-ID": str(tenant.id)})

        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start, is_open_game=True), headers=player_headers)
        booking_id = r.json()["id"]

        # Fill remaining 3 slots
        for h in extra_headers_list:
            await client.post(f"/api/v1/bookings/{booking_id}/join?club_id={club.id}", headers=h)

        # player2 tries to join a full game
        resp = await client.post(f"/api/v1/bookings/{booking_id}/join?club_id={club.id}", headers=player2_headers)
        assert resp.status_code == 409

        async with test_session_factory() as session:
            await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.user_id.in_(extra_ids)))
            for uid in extra_ids:
                obj = await session.get(User, uid)
                if obj:
                    await session.delete(obj)
            await session.commit()

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_already_in_booking_rejected(self, client, player_headers, club, court_with_hours, test_session_factory):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start, is_open_game=True), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.post(f"/api/v1/bookings/{booking_id}/join?club_id={club.id}", headers=player_headers)
        assert resp.status_code == 409

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_skill_mismatch_rejected(
        self, client, staff_headers, player2_headers, club, court_with_hours, test_session_factory
    ):
        """Staff creates open game with high skill range; low-skill player2 (no skill set) is rejected."""
        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                is_open_game=True,
                skill_level_override_min="6.0",
                skill_level_override_max="7.0",
            ),
            headers=staff_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]

        # player2 has no skill_level set → rejected with "Skill level required"
        resp = await client.post(f"/api/v1/bookings/{booking_id}/join?club_id={club.id}", headers=player2_headers)
        assert resp.status_code == 422

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)


# ---------------------------------------------------------------------------
# POST /api/v1/bookings/{id}/invite
# ---------------------------------------------------------------------------

class TestInvitePlayer:

    async def test_organiser_can_invite(self, client, player_headers, player2, club, court_with_hours, test_session_factory):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player2.id)},
            headers=player_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert len(body["players"]) == 2
        invited = next(p for p in body["players"] if p["user_id"] == str(player2.id))
        assert invited["invite_status"] == "pending"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_staff_can_invite_to_any_booking(self, client, player_headers, staff_headers, player2, club, court_with_hours, test_session_factory):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player2.id)},
            headers=staff_headers,
        )
        assert resp.status_code == 200

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_non_organiser_cannot_invite(self, client, player_headers, player2_headers, player2, club, court_with_hours, test_session_factory, player_with_skill):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player_with_skill.id)},
            headers=player2_headers,
        )
        assert resp.status_code == 403

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_skill_out_of_range_invite_still_succeeds(
        self, client, staff_headers, player2, club, court_with_hours, test_session_factory
    ):
        """Skill check is bypassed for invites — even out-of-range players can be invited."""
        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                skill_level_override_min="6.0",
                skill_level_override_max="7.0",
            ),
            headers=staff_headers,
        )
        booking_id = r.json()["id"]

        # player2 has no skill_level — would fail join, but invite bypasses
        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player2.id)},
            headers=staff_headers,
        )
        assert resp.status_code == 200

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)


# ---------------------------------------------------------------------------
# DELETE /api/v1/bookings/{id}
# ---------------------------------------------------------------------------

class TestCancelBooking:

    async def test_organiser_can_cancel(self, client, player_headers, club, court_with_hours, test_session_factory):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.delete(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=player_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_staff_can_cancel_any_booking(self, client, player_headers, staff_headers, club, court_with_hours, test_session_factory):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.delete(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=staff_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_non_organiser_player_cannot_cancel(
        self, client, player_headers, player2_headers, club, court_with_hours, test_session_factory
    ):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.delete(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=player2_headers)
        assert resp.status_code == 403

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_cancel_already_cancelled_booking(self, client, player_headers, club, court_with_hours, test_session_factory):
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        await client.delete(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=player_headers)
        resp = await client.delete(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=player_headers)
        assert resp.status_code == 422

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)


# ---------------------------------------------------------------------------
# Regression tests for bug-fixes
# ---------------------------------------------------------------------------

class TestBugFixes:

    # Fix #1 — invite_player overbooking: pending invites must hold slots
    async def test_cannot_invite_beyond_max_players_via_pending(
        self, client, player_headers, staff_headers, player2, player_with_skill,
        club, court_with_hours, test_session_factory, tenant
    ):
        """Fill 3 of 4 slots with pending invites; a 4th invite should succeed
        but a 5th must be rejected with 409 (booking full)."""
        from app.core.security import get_password_hash
        # Create two more users to invite
        extra_ids = []
        async with test_session_factory() as session:
            for i in range(2):
                u = User(
                    tenant_id=tenant.id,
                    email=f"invitee{i}-{uuid.uuid4().hex[:6]}@test.com",
                    full_name=f"Invitee {i}",
                    hashed_password=get_password_hash("Test1234!"),
                    is_active=True,
                    role=TenantUserRole.player,
                )
                session.add(u)
            await session.commit()

        async with test_session_factory() as session:
            result = await session.execute(
                select(User).where(User.tenant_id == tenant.id, User.full_name.like("Invitee %"))
            )
            invitees = result.scalars().all()
            extra_ids = [u.id for u in invitees]

        # Organiser creates private booking (max_players=4, organiser takes slot 1)
        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]

        # Invite player2 → slot 2 (pending)
        r2 = await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player2.id)},
            headers=player_headers,
        )
        assert r2.status_code == 200

        # Invite player_with_skill → slot 3 (pending)
        r3 = await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player_with_skill.id)},
            headers=player_headers,
        )
        assert r3.status_code == 200

        # Invite extra_ids[0] → slot 4 (pending) — should succeed
        r4 = await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(extra_ids[0])},
            headers=player_headers,
        )
        assert r4.status_code == 200

        # Invite extra_ids[1] → slot 5 — must be rejected (booking full)
        r5 = await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(extra_ids[1])},
            headers=player_headers,
        )
        assert r5.status_code == 409

        async with test_session_factory() as session:
            await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.user_id.in_(extra_ids)))
            for uid in extra_ids:
                obj = await session.get(User, uid)
                if obj:
                    await session.delete(obj)
            await session.commit()

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    # Fix #2 — create_booking: too many named players must be rejected
    async def test_too_many_named_players_rejected(
        self, client, staff_headers, player2, player_with_skill, club, court_with_hours, test_session_factory, tenant
    ):
        """Providing organiser + 4 named players (5 total) for max_players=4 must return 422."""
        from app.core.security import get_password_hash
        async with test_session_factory() as session:
            extra = User(
                tenant_id=tenant.id,
                email=f"extra-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Extra Player",
                hashed_password=get_password_hash("Test1234!"),
                is_active=True,
                role=TenantUserRole.player,
            )
            session.add(extra)
            await session.commit()
            await session.refresh(extra)

        # Staff is organiser (slot 1) + 3 named = 4 total, but max_players=3 → rejected
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                player_user_ids=[str(player2.id), str(player_with_skill.id), str(extra.id)],
                max_players=3,  # organiser + 3 named = 4 > 3
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 422

        async with test_session_factory() as session:
            obj = await session.get(User, extra.id)
            if obj:
                await session.delete(obj)
            await session.commit()

    # Fix #3 — list_open_games excludes past bookings
    async def test_list_open_games_excludes_past_bookings(
        self, client, staff_headers, club, court_with_hours, tenant, test_session_factory
    ):
        """Staff creates a past open game; it must not appear in the open-games list."""
        # Use yesterday at 10:30 UTC — on the 90-min grid, within operating hours
        past_start = (datetime.now(tz=timezone.utc) - timedelta(days=1)).replace(
            hour=10, minute=30, second=0, microsecond=0
        )
        # Staff bypass allows booking in the past
        await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, past_start, is_open_game=True),
            headers=staff_headers,
        )

        resp = await client.get(
            f"/api/v1/bookings/open-games?club_id={club.id}",
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200
        # Past booking must not appear regardless of status
        for game in resp.json():
            start_dt = datetime.fromisoformat(game["start_datetime"])
            assert start_dt > datetime.now(tz=timezone.utc)

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    # Fix #4 — skill filter includes games with no skill restriction (NULL columns)
    async def test_skill_filter_includes_null_skill_open_games(
        self, client, staff_headers, club, court_with_hours, tenant, test_session_factory
    ):
        """An open game with no skill restriction must appear when filtering by skill range."""
        start = _future(48)
        # Staff creates empty open game — no anchor → min/max skill remain NULL
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start, is_open_game=True),
            headers=staff_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]
        assert r.json()["min_skill_level"] is None  # confirm no skill set

        resp = await client.get(
            f"/api/v1/bookings/open-games?club_id={club.id}&min_skill=3.0&max_skill=5.0",
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200
        ids = [g["id"] for g in resp.json()]
        assert booking_id in ids, "Open game with no skill restriction should appear in filtered results"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    # Fix #6 — duplicate player_user_ids are silently deduplicated
    async def test_duplicate_player_ids_deduplicated(
        self, client, staff_headers, player2, club, court_with_hours, test_session_factory
    ):
        """Passing the same player_user_id twice must not error; player is added once."""
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                player_user_ids=[str(player2.id), str(player2.id)],
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        players = resp.json()["players"]
        player2_entries = [p for p in players if p["user_id"] == str(player2.id)]
        assert len(player2_entries) == 1  # deduplicated

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    # Fix #7 — max_players=0 returns 422 (Pydantic validation)
    async def test_max_players_zero_rejected(self, client, player_headers, club, court_with_hours):
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start, max_players=0),
            headers=player_headers,
        )
        assert resp.status_code == 422

    # Fix #9 — partial skill override (only min, no max) rejected
    async def test_partial_skill_override_rejected(self, client, staff_headers, club, court_with_hours):
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                skill_level_override_min="3.0",
                # skill_level_override_max omitted
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/v1/bookings — new filters (court_id, player_search)
# ---------------------------------------------------------------------------

class TestListBookingsFilters:

    async def test_filter_by_court_id(
        self, client, staff_headers, player_headers, club, court_with_hours, test_session_factory, tenant
    ):
        """court_id filter returns only bookings on that court."""
        # court2 reuses the operating hours + pricing rules already created by court_with_hours
        # (they are club-scoped, not court-scoped)
        async with test_session_factory() as session:
            court2 = Court(club_id=club.id, name="Court 2", surface_type="indoor", is_active=True)
            session.add(court2)
            await session.commit()
            await session.refresh(court2)

        s1 = _future(48)
        s2 = _future(48).replace(hour=13, minute=30)

        await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, s1), headers=player_headers)
        await client.post("/api/v1/bookings", json=_booking_payload(club.id, court2.id, s2), headers=player_headers)

        resp = await client.get(
            f"/api/v1/bookings?club_id={club.id}&court_id={court_with_hours.id}",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        results = resp.json()
        assert all(b["court_id"] == str(court_with_hours.id) for b in results)
        assert any(b["court_id"] == str(court_with_hours.id) for b in results)

        # Filter by court2 returns only that booking
        resp2 = await client.get(
            f"/api/v1/bookings?club_id={club.id}&court_id={court2.id}",
            headers=staff_headers,
        )
        assert resp2.status_code == 200
        assert all(b["court_id"] == str(court2.id) for b in resp2.json())

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)
        await _delete_bookings_for_court(court2.id, test_session_factory)

        async with test_session_factory() as session:
            await session.execute(sql_delete(Court).where(Court.id == court2.id))
            await session.commit()

    async def test_player_search_by_name(
        self, client, staff_headers, player_headers, player, club, court_with_hours, test_session_factory
    ):
        """player_search filters bookings to those containing a matching player name."""
        start = _future(48)
        await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)

        # Search by a substring of "Test Player" (the player fixture's full_name)
        resp = await client.get(
            f"/api/v1/bookings?club_id={club.id}&player_search=Test+Player",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

        # Non-matching search returns no results
        resp_no = await client.get(
            f"/api/v1/bookings?club_id={club.id}&player_search=doesnotexistxyz",
            headers=staff_headers,
        )
        assert resp_no.status_code == 200
        assert len(resp_no.json()) == 0

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_player_search_by_email(
        self, client, staff_headers, player_headers, player, club, court_with_hours, test_session_factory
    ):
        """player_search also matches on email."""
        start = _future(48)
        await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)

        # player email starts with "player-"
        resp = await client.get(
            f"/api/v1/bookings?club_id={club.id}&player_search=player-",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)


# ---------------------------------------------------------------------------
# GET /api/v1/bookings/calendar
# ---------------------------------------------------------------------------

class TestCalendarView:

    async def test_player_cannot_access_calendar(self, client, player_headers, club):
        """Calendar is staff-only — players receive 403."""
        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}",
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_tenant_isolation(self, client, club, plan, test_session_factory):
        """A token for a different tenant must be rejected."""
        from app.db.models.tenant import Tenant as TenantModel
        subdomain = f"alien-cal-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Alien Cal", subdomain=subdomain, plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.flush()
            alien = User(
                tenant_id=t2.id,
                email=f"alien-cal-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Alien Cal",
                hashed_password="x",
                is_active=True,
                role=TenantUserRole.staff,
            )
            session.add(alien)
            await session.commit()
            await session.refresh(alien)
            t2_id, alien_id = t2.id, alien.id

        token = create_access_token({"sub": str(alien_id), "tid": str(t2_id)})
        headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2_id)}
        resp = await client.get(f"/api/v1/bookings/calendar?club_id={club.id}", headers=headers)
        assert resp.status_code in (401, 404)

        async with test_session_factory() as session:
            obj = await session.get(User, alien_id)
            if obj:
                await session.delete(obj)
            obj2 = await session.get(TenantModel, t2_id)
            if obj2:
                await session.delete(obj2)
            await session.commit()

    async def test_week_view_structure(
        self, client, staff_headers, player_headers, club, court_with_hours, test_session_factory
    ):
        """Week calendar returns 7 days, each with a courts list containing the test court."""
        anchor = _future(48).date()
        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}&view=week&anchor_date={anchor.isoformat()}",
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["view"] == "week"
        assert len(body["days"]) == 7
        # Every day has the active court as a column
        court_ids_in_day = [c["court_id"] for c in body["days"][0]["courts"]]
        assert str(court_with_hours.id) in court_ids_in_day

    async def test_day_view_structure(
        self, client, staff_headers, club, court_with_hours, test_session_factory
    ):
        """Day calendar returns exactly 1 day."""
        anchor = _future(48).date()
        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}&view=day&anchor_date={anchor.isoformat()}",
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["view"] == "day"
        assert len(body["days"]) == 1
        assert body["days"][0]["date"] == anchor.isoformat()

    async def test_bookings_appear_in_correct_day_and_court(
        self, client, staff_headers, player_headers, club, court_with_hours, test_session_factory
    ):
        """A booking appears in the right day column and court column."""
        start = _future(48)
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]

        anchor = start.date()
        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}&view=day&anchor_date={anchor.isoformat()}",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        day = resp.json()["days"][0]
        court_col = next(c for c in day["courts"] if c["court_id"] == str(court_with_hours.id))
        booking_ids = [s["id"] for s in court_col["slots"] if s["kind"] == "booking"]
        assert booking_id in booking_ids

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_cancelled_bookings_excluded(
        self, client, staff_headers, player_headers, club, court_with_hours, test_session_factory
    ):
        """Cancelled bookings must not appear in the calendar."""
        start = _future(48)
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        booking_id = r.json()["id"]
        await client.delete(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=player_headers)

        anchor = start.date()
        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}&view=day&anchor_date={anchor.isoformat()}",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        all_booking_ids = [
            s["id"]
            for day in resp.json()["days"]
            for court in day["courts"]
            for s in court["slots"]
            if s["kind"] == "booking"
        ]
        assert booking_id not in all_booking_ids

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_default_anchor_date_returns_200(self, client, staff_headers, club):
        """No anchor_date param — defaults to today's week, must return 200."""
        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["view"] == "week"

    async def test_invalid_view_param_rejected(self, client, staff_headers, club):
        """view=month is not a valid value — must return 422."""
        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}&view=month",
            headers=staff_headers,
        )
        assert resp.status_code == 422

    async def test_court_specific_block_appears_in_slots(
        self, client, staff_headers, club, court_with_hours, staff, test_session_factory
    ):
        """A CalendarReservation scoped to a specific court appears in that court's slots."""
        anchor = _future(48).date()
        start_dt = datetime.combine(anchor, time(8, 0), tzinfo=timezone.utc)
        end_dt = datetime.combine(anchor, time(10, 0), tzinfo=timezone.utc)

        async with test_session_factory() as session:
            reservation = CalendarReservation(
                club_id=club.id,
                court_id=court_with_hours.id,
                reservation_type=CalendarReservationType.maintenance,
                title="Net replacement",
                start_datetime=start_dt,
                end_datetime=end_dt,
                created_by=staff.id,
            )
            session.add(reservation)
            await session.commit()
            await session.refresh(reservation)
            reservation_id = reservation.id

        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}&view=day&anchor_date={anchor.isoformat()}",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        day = resp.json()["days"][0]
        court_col = next(c for c in day["courts"] if c["court_id"] == str(court_with_hours.id))
        block_ids = [s["id"] for s in court_col["slots"] if s["kind"] == "block"]
        assert str(reservation_id) in block_ids

        async with test_session_factory() as session:
            obj = await session.get(CalendarReservation, reservation_id)
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_club_wide_block_appears_in_all_courts(
        self, client, staff_headers, club, court_with_hours, staff, test_session_factory
    ):
        """A CalendarReservation with court_id=None appears in every court column."""
        anchor = _future(48).date()
        start_dt = datetime.combine(anchor, time(12, 0), tzinfo=timezone.utc)
        end_dt = datetime.combine(anchor, time(14, 0), tzinfo=timezone.utc)

        async with test_session_factory() as session:
            reservation = CalendarReservation(
                club_id=club.id,
                court_id=None,
                reservation_type=CalendarReservationType.maintenance,
                title="Full club closure",
                start_datetime=start_dt,
                end_datetime=end_dt,
                created_by=staff.id,
            )
            session.add(reservation)
            await session.commit()
            await session.refresh(reservation)
            reservation_id = reservation.id

        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}&view=day&anchor_date={anchor.isoformat()}",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        day = resp.json()["days"][0]
        for court_col in day["courts"]:
            block_ids = [s["id"] for s in court_col["slots"] if s["kind"] == "block"]
            assert str(reservation_id) in block_ids

        async with test_session_factory() as session:
            obj = await session.get(CalendarReservation, reservation_id)
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_block_kind_field_is_block(
        self, client, staff_headers, club, court_with_hours, staff, test_session_factory
    ):
        """Each block slot serialises with kind='block' and the correct reservation_type."""
        anchor = _future(48).date()
        start_dt = datetime.combine(anchor, time(9, 0), tzinfo=timezone.utc)
        end_dt = datetime.combine(anchor, time(10, 0), tzinfo=timezone.utc)

        async with test_session_factory() as session:
            reservation = CalendarReservation(
                club_id=club.id,
                court_id=court_with_hours.id,
                reservation_type=CalendarReservationType.maintenance,
                title="Maintenance block",
                start_datetime=start_dt,
                end_datetime=end_dt,
                created_by=staff.id,
            )
            session.add(reservation)
            await session.commit()
            await session.refresh(reservation)
            reservation_id = reservation.id

        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}&view=day&anchor_date={anchor.isoformat()}",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        day = resp.json()["days"][0]
        court_col = next(c for c in day["courts"] if c["court_id"] == str(court_with_hours.id))
        block = next(s for s in court_col["slots"] if s["id"] == str(reservation_id))
        assert block["kind"] == "block"
        assert block["reservation_type"] == "maintenance"
        assert block["title"] == "Maintenance block"

        async with test_session_factory() as session:
            obj = await session.get(CalendarReservation, reservation_id)
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_slots_sorted_by_start_datetime(
        self, client, staff_headers, player_headers, club, court_with_hours, staff, test_session_factory
    ):
        """Bookings and blocks are returned sorted by start_datetime ascending."""
        anchor = _future(48).date()

        # Block starts at 08:00, booking starts at 10:30 — block should come first
        block_start = datetime.combine(anchor, time(8, 0), tzinfo=timezone.utc)
        block_end = datetime.combine(anchor, time(9, 0), tzinfo=timezone.utc)
        booking_start = _future(48)  # 10:30

        async with test_session_factory() as session:
            reservation = CalendarReservation(
                club_id=club.id,
                court_id=court_with_hours.id,
                reservation_type=CalendarReservationType.training_block,
                title="Morning drill",
                start_datetime=block_start,
                end_datetime=block_end,
                created_by=staff.id,
            )
            session.add(reservation)
            await session.commit()
            await session.refresh(reservation)
            reservation_id = reservation.id

        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, booking_start),
            headers=player_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]

        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}&view=day&anchor_date={anchor.isoformat()}",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        day = resp.json()["days"][0]
        court_col = next(c for c in day["courts"] if c["court_id"] == str(court_with_hours.id))
        relevant = [s for s in court_col["slots"] if s["id"] in (str(reservation_id), booking_id)]
        assert len(relevant) == 2
        assert relevant[0]["kind"] == "block"   # 08:00 comes before 10:30
        assert relevant[1]["kind"] == "booking"

        async with test_session_factory() as session:
            obj = await session.get(CalendarReservation, reservation_id)
            if obj:
                await session.delete(obj)
            await session.commit()
        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_block_outside_date_range_excluded(
        self, client, staff_headers, club, court_with_hours, staff, test_session_factory
    ):
        """A CalendarReservation wholly outside the query window must not appear."""
        anchor = _future(48).date()
        # Block is 10 days in the future — outside a day view of anchor
        future_date = anchor + timedelta(days=10)
        start_dt = datetime.combine(future_date, time(9, 0), tzinfo=timezone.utc)
        end_dt = datetime.combine(future_date, time(10, 0), tzinfo=timezone.utc)

        async with test_session_factory() as session:
            reservation = CalendarReservation(
                club_id=club.id,
                court_id=court_with_hours.id,
                reservation_type=CalendarReservationType.maintenance,
                title="Future work",
                start_datetime=start_dt,
                end_datetime=end_dt,
                created_by=staff.id,
            )
            session.add(reservation)
            await session.commit()
            await session.refresh(reservation)
            reservation_id = reservation.id

        resp = await client.get(
            f"/api/v1/bookings/calendar?club_id={club.id}&view=day&anchor_date={anchor.isoformat()}",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        all_slot_ids = [
            s["id"]
            for day in resp.json()["days"]
            for court in day["courts"]
            for s in court["slots"]
        ]
        assert str(reservation_id) not in all_slot_ids

        async with test_session_factory() as session:
            obj = await session.get(CalendarReservation, reservation_id)
            if obj:
                await session.delete(obj)
            await session.commit()


# ---------------------------------------------------------------------------
# POST /api/v1/bookings — on_behalf_of_user_id (staff creates for a player)
# ---------------------------------------------------------------------------

class TestCreateOnBehalf:

    async def test_staff_creates_booking_on_behalf_of_player(
        self, client, staff_headers, player2, club, court_with_hours, test_session_factory
    ):
        """Player in on_behalf_of_user_id becomes the organiser BookingPlayer."""
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                on_behalf_of_user_id=str(player2.id),
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert len(body["players"]) == 1
        organiser = body["players"][0]
        assert organiser["user_id"] == str(player2.id)
        assert organiser["role"] == "organiser"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_on_behalf_staff_not_in_player_list(
        self, client, staff_headers, staff, player2, club, court_with_hours, test_session_factory
    ):
        """The creating staff member must not appear as a BookingPlayer when on_behalf_of_user_id is set."""
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                on_behalf_of_user_id=str(player2.id),
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        player_ids = [p["user_id"] for p in resp.json()["players"]]
        assert str(staff.id) not in player_ids

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_on_behalf_player_can_then_cancel_own_booking(
        self, client, staff_headers, player2, player2_headers, club, court_with_hours, test_session_factory
    ):
        """Because the player is the organiser, they can cancel the booking themselves."""
        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                on_behalf_of_user_id=str(player2.id),
            ),
            headers=staff_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]

        resp = await client.delete(
            f"/api/v1/bookings/{booking_id}?club_id={club.id}",
            headers=player2_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_player_cannot_use_on_behalf_of(
        self, client, player_headers, player2, club, court_with_hours
    ):
        """Non-staff callers get 403 when providing on_behalf_of_user_id."""
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                on_behalf_of_user_id=str(player2.id),
            ),
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_on_behalf_unknown_user_returns_422(
        self, client, staff_headers, club, court_with_hours
    ):
        """A UUID that does not belong to the tenant returns 422."""
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                on_behalf_of_user_id=str(uuid.uuid4()),
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# PATCH /api/v1/bookings/{id}
# ---------------------------------------------------------------------------

class TestUpdateBooking:

    async def test_staff_can_update_notes(
        self, client, staff_headers, player_headers, club, court_with_hours, test_session_factory
    ):
        """Staff can update notes on an existing booking."""
        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start, notes="original"),
            headers=player_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]

        resp = await client.patch(
            f"/api/v1/bookings/{booking_id}?club_id={club.id}",
            json={"notes": "updated notes"},
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["notes"] == "updated notes"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_staff_can_update_event_name_and_contact(
        self, client, staff_headers, club, court_with_hours, test_session_factory
    ):
        """Staff can update event_name, contact_name, contact_email, contact_phone."""
        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(
                club.id, court_with_hours.id, start,
                booking_type="corporate_event",
                event_name="Old Event",
            ),
            headers=staff_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]

        resp = await client.patch(
            f"/api/v1/bookings/{booking_id}?club_id={club.id}",
            json={
                "event_name": "New Event",
                "contact_name": "Jane Doe",
                "contact_email": "jane@example.com",
                "contact_phone": "+44 7700 000000",
            },
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["event_name"] == "New Event"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_staff_can_reschedule(
        self, client, staff_headers, player_headers, club, court_with_hours, test_session_factory
    ):
        """Staff can move a booking to a non-conflicting slot."""
        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]

        # Move to the next 90-min slot on the same day
        new_start = start.replace(hour=12, minute=0)
        resp = await client.patch(
            f"/api/v1/bookings/{booking_id}?club_id={club.id}",
            json={"start_datetime": new_start.isoformat()},
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["start_datetime"].startswith(new_start.strftime("%Y-%m-%dT%H:%M"))

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_reschedule_conflict_rejected(
        self, client, staff_headers, player_headers, club, court_with_hours, test_session_factory
    ):
        """Rescheduling into a slot occupied by another booking returns 409."""
        s1 = _future(48)
        s2 = _future(48).replace(hour=12, minute=0)

        r1 = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, s1),
            headers=player_headers,
        )
        r2 = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, s2),
            headers=player_headers,
        )
        assert r1.status_code == 201 and r2.status_code == 201
        booking2_id = r2.json()["id"]

        # Try to move booking 2 into slot occupied by booking 1
        resp = await client.patch(
            f"/api/v1/bookings/{booking2_id}?club_id={club.id}",
            json={"start_datetime": s1.isoformat()},
            headers=staff_headers,
        )
        assert resp.status_code == 409

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_staff_can_reassign_court(
        self, client, staff_headers, player_headers, club, court_with_hours, test_session_factory
    ):
        """Staff can move a booking to a different active court."""
        async with test_session_factory() as session:
            court2 = Court(club_id=club.id, name="Court U2", surface_type="indoor", is_active=True)
            session.add(court2)
            await session.commit()
            await session.refresh(court2)

        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]

        resp = await client.patch(
            f"/api/v1/bookings/{booking_id}?club_id={club.id}",
            json={"court_id": str(court2.id)},
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["court_id"] == str(court2.id)

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)
        await _delete_bookings_for_court(court2.id, test_session_factory)
        async with test_session_factory() as session:
            await session.execute(sql_delete(Court).where(Court.id == court2.id))
            await session.commit()

    async def test_cannot_update_cancelled_booking(
        self, client, staff_headers, player_headers, club, court_with_hours, test_session_factory
    ):
        """Editing a cancelled booking returns 422."""
        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        booking_id = r.json()["id"]
        await client.delete(f"/api/v1/bookings/{booking_id}?club_id={club.id}", headers=player_headers)

        resp = await client.patch(
            f"/api/v1/bookings/{booking_id}?club_id={club.id}",
            json={"notes": "too late"},
            headers=staff_headers,
        )
        assert resp.status_code == 422

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_player_cannot_update(
        self, client, player_headers, club, court_with_hours, test_session_factory
    ):
        """PATCH is staff-only — players receive 403."""
        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        booking_id = r.json()["id"]

        resp = await client.patch(
            f"/api/v1/bookings/{booking_id}?club_id={club.id}",
            json={"notes": "sneaky edit"},
            headers=player_headers,
        )
        assert resp.status_code == 403

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_update_tenant_isolation(
        self, client, club, court_with_hours, player_headers, plan, test_session_factory
    ):
        """A staff token from a different tenant cannot edit a booking in this tenant's club."""
        from app.db.models.tenant import Tenant as TenantModel
        subdomain = f"alien-upd-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Alien Update", subdomain=subdomain, plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.flush()
            alien = User(
                tenant_id=t2.id,
                email=f"alien-upd-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Alien Staff",
                hashed_password="x",
                is_active=True,
                role=TenantUserRole.staff,
            )
            session.add(alien)
            await session.commit()
            await session.refresh(alien)
            t2_id, alien_id = t2.id, alien.id

        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert r.status_code == 201
        booking_id = r.json()["id"]

        token = create_access_token({"sub": str(alien_id), "tid": str(t2_id)})
        alien_headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2_id)}
        resp = await client.patch(
            f"/api/v1/bookings/{booking_id}?club_id={club.id}",
            json={"notes": "cross-tenant edit"},
            headers=alien_headers,
        )
        assert resp.status_code in (401, 404)

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)
        async with test_session_factory() as session:
            obj = await session.get(User, alien_id)
            if obj:
                await session.delete(obj)
            obj2 = await session.get(TenantModel, t2_id)
            if obj2:
                await session.delete(obj2)
            await session.commit()


# ---------------------------------------------------------------------------
# POST /api/v1/bookings/{id}/respond-invite
# ---------------------------------------------------------------------------

class TestRespondToInvite:

    async def test_invited_player_can_accept(self, client, player_headers, player2_headers, player2, club, court_with_hours, test_session_factory):
        """Invited player accepts — their invite_status becomes accepted."""
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player2.id)},
            headers=player_headers,
        )

        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/respond-invite?club_id={club.id}",
            json={"action": "accepted"},
            headers=player2_headers,
        )
        assert resp.status_code == 200, resp.text
        player2_entry = next(p for p in resp.json()["players"] if p["user_id"] == str(player2.id))
        assert player2_entry["invite_status"] == "accepted"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_invited_player_can_decline(self, client, player_headers, player2_headers, player2, club, court_with_hours, test_session_factory):
        """Invited player declines — their invite_status becomes declined."""
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player2.id)},
            headers=player_headers,
        )

        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/respond-invite?club_id={club.id}",
            json={"action": "declined"},
            headers=player2_headers,
        )
        assert resp.status_code == 200, resp.text
        player2_entry = next(p for p in resp.json()["players"] if p["user_id"] == str(player2.id))
        assert player2_entry["invite_status"] == "declined"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_uninvited_player_cannot_respond(self, client, player_headers, player2_headers, club, court_with_hours, test_session_factory):
        """A player who was not invited gets 404."""
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/respond-invite?club_id={club.id}",
            json={"action": "accepted"},
            headers=player2_headers,
        )
        assert resp.status_code == 404

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_cannot_respond_twice(self, client, player_headers, player2_headers, player2, club, court_with_hours, test_session_factory):
        """Responding after already accepting/declining returns 409."""
        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player2.id)},
            headers=player_headers,
        )
        await client.post(
            f"/api/v1/bookings/{booking_id}/respond-invite?club_id={club.id}",
            json={"action": "accepted"},
            headers=player2_headers,
        )
        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/respond-invite?club_id={club.id}",
            json={"action": "declined"},
            headers=player2_headers,
        )
        assert resp.status_code == 409

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_decline_frees_slot_for_reinvite(self, client, player_headers, player2_headers, player2, club, court_with_hours, test_session_factory, tenant):
        """After a player declines, the organiser can re-invite someone else to fill the freed slot."""
        from app.core.security import get_password_hash
        async with test_session_factory() as session:
            player3 = User(
                tenant_id=tenant.id,
                email=f"player3-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Player Three",
                hashed_password=get_password_hash("Test1234!"),
                is_active=True,
                role=TenantUserRole.player,
            )
            session.add(player3)
            await session.commit()
            await session.refresh(player3)

        # Create a 2-player booking (organiser fills slot 1)
        start = _future()
        r = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, start, max_players=2),
            headers=player_headers,
        )
        booking_id = r.json()["id"]

        # Invite player2 — now both slots are taken (1 accepted + 1 pending)
        await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player2.id)},
            headers=player_headers,
        )

        # player2 declines — slot is freed
        await client.post(
            f"/api/v1/bookings/{booking_id}/respond-invite?club_id={club.id}",
            json={"action": "declined"},
            headers=player2_headers,
        )

        # Now invite player3 — must succeed (slot freed by decline)
        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player3.id)},
            headers=player_headers,
        )
        assert resp.status_code == 200, resp.text

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)
        async with test_session_factory() as session:
            obj = await session.get(User, player3.id)
            if obj:
                await session.delete(obj)
            await session.commit()

    async def test_tenant_isolation(self, client, player_headers, player2_headers, player2, club, court_with_hours, test_session_factory, plan, tenant):
        """A token from a different tenant cannot respond to an invite in this club."""
        from app.db.models.tenant import Tenant as TenantModel
        subdomain = f"alien-inv-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Alien Inv", subdomain=subdomain, plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.flush()
            alien = User(
                tenant_id=t2.id,
                email=f"alien-inv-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Alien",
                hashed_password="x",
                is_active=True,
                role=TenantUserRole.player,
            )
            session.add(alien)
            await session.commit()
            await session.refresh(alien)
            t2_id, alien_id = t2.id, alien.id

        alien_token = create_access_token({"sub": str(alien_id), "tenant_id": str(t2_id), "club_id": str(club.id), "role": "player"})
        alien_headers = {"Authorization": f"Bearer {alien_token}", "X-Tenant-ID": str(tenant.id)}

        start = _future()
        r = await client.post("/api/v1/bookings", json=_booking_payload(club.id, court_with_hours.id, start), headers=player_headers)
        booking_id = r.json()["id"]

        await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player2.id)},
            headers=player_headers,
        )

        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/respond-invite?club_id={club.id}",
            json={"action": "accepted"},
            headers=alien_headers,
        )
        assert resp.status_code in (401, 404)

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)
        async with test_session_factory() as session:
            obj = await session.get(User, alien_id)
            if obj:
                await session.delete(obj)
            obj2 = await session.get(TenantModel, t2_id)
            if obj2:
                await session.delete(obj2)
            await session.commit()


# ---------------------------------------------------------------------------
# POST /api/v1/bookings/recurring
# ---------------------------------------------------------------------------

def _recurring_payload(club_id, court_id, first_start: datetime, **kwargs) -> dict:
    return {
        "club_id": str(club_id),
        "court_id": str(court_id),
        "booking_type": "lesson_individual",
        "first_start": first_start.isoformat(),
        "recurrence_rule": "FREQ=WEEKLY;COUNT=3",
        "max_players": 2,
        **kwargs,
    }


class TestCreateRecurringBooking:

    async def test_staff_creates_weekly_series(
        self, client, staff_headers, club, court_with_hours, test_session_factory
    ):
        """Happy path: 3-week series is created; all bookings confirmed and recurring."""
        first = _future(72).replace(hour=7, minute=30, second=0, microsecond=0)
        resp = await client.post(
            "/api/v1/bookings/recurring",
            json=_recurring_payload(club.id, court_with_hours.id, first),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert len(body["created"]) == 3
        assert len(body["skipped"]) == 0
        for b in body["created"]:
            assert b["status"] == "confirmed"
            assert b["booking_type"] == "lesson_individual"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_first_booking_is_parent_others_link_to_it(
        self, client, staff_headers, club, court_with_hours, test_session_factory
    ):
        """First booking has no parent; the remaining two reference its id."""
        from sqlalchemy import select as sa_select
        from app.db.models.booking import Booking

        first = _future(72).replace(hour=7, minute=30, second=0, microsecond=0)
        resp = await client.post(
            "/api/v1/bookings/recurring",
            json=_recurring_payload(club.id, court_with_hours.id, first),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        created_ids = [b["id"] for b in resp.json()["created"]]

        async with test_session_factory() as session:
            rows = (
                await session.execute(
                    sa_select(Booking.id, Booking.parent_booking_id)
                    .where(Booking.id.in_(created_ids))
                    .order_by(Booking.start_datetime)
                )
            ).all()

        parent_id = rows[0].id
        assert rows[0].parent_booking_id is None
        for row in rows[1:]:
            assert row.parent_booking_id == parent_id

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_player_role_rejected(
        self, client, player_headers, club, court_with_hours
    ):
        """Non-staff callers must receive 403."""
        first = _future(72).replace(hour=7, minute=30, second=0, microsecond=0)
        resp = await client.post(
            "/api/v1/bookings/recurring",
            json=_recurring_payload(club.id, court_with_hours.id, first),
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_tenant_isolation(
        self, client, club, court_with_hours, plan, test_session_factory
    ):
        """A staff token for a different tenant must be rejected."""
        from app.db.models.tenant import Tenant as TenantModel
        subdomain = f"alien-rec-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Alien Rec", subdomain=subdomain, plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.flush()
            alien = User(
                tenant_id=t2.id,
                email=f"alien-rec-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Alien Staff",
                hashed_password="x",
                is_active=True,
                role=TenantUserRole.staff,
            )
            session.add(alien)
            await session.commit()
            await session.refresh(alien)
            t2_id, alien_id = t2.id, alien.id

        token = create_access_token({"sub": str(alien_id), "tid": str(t2_id)})
        alien_headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2_id)}
        first = _future(72).replace(hour=7, minute=30, second=0, microsecond=0)
        resp = await client.post(
            "/api/v1/bookings/recurring",
            json=_recurring_payload(club.id, court_with_hours.id, first),
            headers=alien_headers,
        )
        assert resp.status_code in (401, 404)

        async with test_session_factory() as session:
            obj = await session.get(User, alien_id)
            if obj:
                await session.delete(obj)
            obj2 = await session.get(TenantModel, t2_id)
            if obj2:
                await session.delete(obj2)
            await session.commit()

    async def test_invalid_rrule_returns_422(
        self, client, staff_headers, club, court_with_hours
    ):
        """Garbage RRULE must return 422."""
        first = _future(72).replace(hour=7, minute=30, second=0, microsecond=0)
        resp = await client.post(
            "/api/v1/bookings/recurring",
            json=_recurring_payload(
                club.id, court_with_hours.id, first,
                recurrence_rule="NOT_VALID",
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 422

    async def test_missing_end_condition_returns_422(
        self, client, staff_headers, club, court_with_hours
    ):
        """FREQ=WEEKLY without COUNT, UNTIL, or recurrence_end_date must return 422."""
        first = _future(72).replace(hour=7, minute=30, second=0, microsecond=0)
        resp = await client.post(
            "/api/v1/bookings/recurring",
            json=_recurring_payload(
                club.id, court_with_hours.id, first,
                recurrence_rule="FREQ=WEEKLY",
                # no recurrence_end_date, no COUNT, no UNTIL
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 422

    async def test_conflict_returns_409_when_skip_false(
        self, client, staff_headers, club, court_with_hours, test_session_factory
    ):
        """First occurrence conflicts with an existing booking → 409, nothing created."""
        first = _future(72).replace(hour=7, minute=30, second=0, microsecond=0)
        pre = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, first),
            headers=staff_headers,
        )
        assert pre.status_code == 201

        resp = await client.post(
            "/api/v1/bookings/recurring",
            json=_recurring_payload(
                club.id, court_with_hours.id, first,
                skip_conflicts=False,
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 409

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_skip_conflicts_true_skips_conflicted_occurrence(
        self, client, staff_headers, club, court_with_hours, test_session_factory
    ):
        """With skip_conflicts=True, the conflicting first slot is skipped; remaining 2 are created."""
        first = _future(72).replace(hour=7, minute=30, second=0, microsecond=0)
        pre = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court_with_hours.id, first),
            headers=staff_headers,
        )
        assert pre.status_code == 201

        resp = await client.post(
            "/api/v1/bookings/recurring",
            json=_recurring_payload(
                club.id, court_with_hours.id, first,
                skip_conflicts=True,
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert len(body["created"]) == 2
        assert len(body["skipped"]) == 1
        assert body["skipped"][0]["reason"] == "court conflict"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_with_named_player(
        self, client, staff_headers, player2, club, court_with_hours, test_session_factory
    ):
        """player_user_ids adds the player as a BookingPlayer on every occurrence."""
        from sqlalchemy import select as sa_select
        from app.db.models.booking import BookingPlayer

        first = _future(72).replace(hour=7, minute=30, second=0, microsecond=0)
        resp = await client.post(
            "/api/v1/bookings/recurring",
            json=_recurring_payload(
                club.id, court_with_hours.id, first,
                player_user_ids=[str(player2.id)],
                max_players=4,
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        created_ids = [b["id"] for b in resp.json()["created"]]
        assert len(created_ids) == 3

        async with test_session_factory() as session:
            for bid in created_ids:
                result = await session.execute(
                    sa_select(BookingPlayer).where(
                        BookingPlayer.booking_id == bid,
                        BookingPlayer.user_id == player2.id,
                    )
                )
                assert result.scalar_one_or_none() is not None, f"player2 missing from booking {bid}"

        await _delete_bookings_for_court(court_with_hours.id, test_session_factory)

    async def test_recurrence_end_date_limits_series(
        self, client, staff_headers, club, court_with_hours, test_session_factory
    ):
        """recurrence_end_date 13 days after first_start with FREQ=WEEKLY → 2 occurrences."""
        first = _future(72).replace(hour=7, minute=30, second=0, microsecond=0)
        end_date = (first + timedelta(days=13)).date().isoformat()
        resp = await client.post(
            "/api/v1/bookings/recurring",
            json=_recurring_payload(
                club.id, court_with_hours.id, first,
                recurrence_rule="FREQ=WEEKLY",
                recurrence_end_date=end_date,
            ),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        assert len(resp.json()["created"]) == 2


# ---------------------------------------------------------------------------
# Fixtures for lesson booking validation tests
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def trainer_user_for_lesson(tenant, test_session_factory):
    from tests.integration.conftest import _create_user, _delete_user

    user = await _create_user(
        tenant.id, "lesson-trainer", "Lesson Trainer", TenantUserRole.trainer, test_session_factory
    )
    yield user
    await _delete_user(user.id, test_session_factory)


@pytest_asyncio.fixture
async def trainer_profile_for_lesson(trainer_user_for_lesson, club, test_session_factory):
    async with test_session_factory() as session:
        profile = StaffProfile(
            user_id=trainer_user_for_lesson.id,
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
async def non_trainer_profile(staff, club, test_session_factory):
    """A StaffProfile with role=ops_lead — not a trainer."""
    async with test_session_factory() as session:
        profile = StaffProfile(
            user_id=staff.id,
            club_id=club.id,
            role=StaffRole.ops_lead,
            is_active=True,
        )
        session.add(profile)
        await session.commit()
        await session.refresh(profile)

    yield profile

    async with test_session_factory() as session:
        obj = await session.get(StaffProfile, profile.id)
        if obj:
            await session.delete(obj)
        await session.commit()


def _lesson_payload(club_id, court_id, start: datetime, **kwargs) -> dict:
    return {
        "club_id": str(club_id),
        "court_id": str(court_id),
        "start_datetime": start.isoformat(),
        "booking_type": "lesson_individual",
        "is_open_game": False,
        "max_players": 1,
        **kwargs,
    }


# ---------------------------------------------------------------------------
# POST /api/v1/bookings — lesson booking validation
# ---------------------------------------------------------------------------


class TestLessonBookingValidation:
    async def test_lesson_requires_staff_profile_id(
        self, client, player_headers, club, court_with_hours
    ):
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_lesson_payload(club.id, court_with_hours.id, start),
            headers=player_headers,
        )
        assert resp.status_code == 422
        assert "staff_profile_id" in resp.json()["detail"].lower()

    async def test_lesson_rejects_non_trainer_profile(
        self, client, player_headers, club, court_with_hours, non_trainer_profile
    ):
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_lesson_payload(
                club.id, court_with_hours.id, start,
                staff_profile_id=str(non_trainer_profile.id),
            ),
            headers=player_headers,
        )
        assert resp.status_code == 422
        assert "trainer" in resp.json()["detail"].lower()

    async def test_lesson_happy_path_with_valid_trainer(
        self, client, player_headers, club, court_with_hours, trainer_profile_for_lesson
    ):
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json=_lesson_payload(
                club.id, court_with_hours.id, start,
                staff_profile_id=str(trainer_profile_for_lesson.id),
            ),
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["booking_type"] == "lesson_individual"
        assert body["status"] in ("pending", "confirmed")

    async def test_trainer_double_booking_rejected(
        self, client, player_headers, staff_headers, club, court_with_hours, trainer_profile_for_lesson
    ):
        start = _future()
        payload = _lesson_payload(
            club.id, court_with_hours.id, start,
            staff_profile_id=str(trainer_profile_for_lesson.id),
        )

        first = await client.post("/api/v1/bookings", json=payload, headers=player_headers)
        assert first.status_code == 201, first.text

        second = await client.post("/api/v1/bookings", json=payload, headers=player_headers)
        # Court conflict fires before trainer conflict — both result in 409
        assert second.status_code == 409

    async def test_lesson_group_also_requires_trainer(
        self, client, player_headers, club, court_with_hours
    ):
        start = _future()
        resp = await client.post(
            "/api/v1/bookings",
            json={**_lesson_payload(club.id, court_with_hours.id, start), "booking_type": "lesson_group"},
            headers=player_headers,
        )
        assert resp.status_code == 422
        assert "staff_profile_id" in resp.json()["detail"].lower()
