"""
Integration tests for the court-hold expiry feature.

Covers
------
- POST /admin/bookings/release-expired-holds — auth gate + happy path counts
- The release sweep behaviour:
    * organiser-only unpaid + expired  → booking cancelled, court freed
    * unpaid joiner + expired, organiser paid → slot freed, booking survives
    * idempotent re-run is a no-op
- Deadlines set at the player entry points (create / join / accept) and NOT
  set for staff placements.
- The conflict check ignores an expired (but not-yet-swept) court hold.

Sweep tests seed via the API, then fast-forward the deadline into the past
through a direct DB update (we can't wait out the real 5-minute window).
"""

import uuid
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import delete as sql_delete, select, update as sql_update

from app.core.security import create_access_token, get_password_hash
from app.db.models.booking import (
    Booking,
    BookingPlayer,
    BookingStatus,
    InviteStatus,
    PaymentStatus,
    PlayerRole,
)
from app.db.models.club import OperatingHours, PricingRule
from app.db.models.court import Court
from app.db.models.payment import Payment, PaymentMethod, PaymentState
from app.db.models.user import TenantUserRole, User
from app.services.payment_service import PaymentService

PLATFORM_KEY = "test-platform-key"
PLATFORM_HEADERS = {"X-Platform-Key": PLATFORM_KEY}
RELEASE_URL = "/api/v1/admin/bookings/release-expired-holds"

DURATION = 90  # minutes — matches Club default


def _future(hours: int = 48) -> datetime:
    """10:30 UTC on a future date — safely inside notice + advance windows."""
    dt = datetime.now(tz=timezone.utc) + timedelta(hours=hours)
    return dt.replace(hour=10, minute=30, second=0, microsecond=0)


def _payload(club_id, court_id, start: datetime, **kwargs) -> dict:
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
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def court_hours(club, test_session_factory):
    """Court + Mon–Sun 06:00–23:00 hours + a flat pricing rule for `club`."""
    async with test_session_factory() as session:
        court = Court(club_id=club.id, name="Hold Court", surface_type="indoor", is_active=True)
        session.add(court)
        await session.flush()
        for dow in range(7):
            session.add(OperatingHours(
                club_id=club.id, day_of_week=dow,
                open_time=time(6, 0), close_time=time(23, 0),
            ))
        session.add(PricingRule(
            club_id=club.id, label="Standard", day_of_week=_future().weekday(),
            start_time=time(0, 0), end_time=time(23, 59),
            is_active=True, price_per_slot=Decimal("20.00"),
        ))
        await session.commit()
        await session.refresh(court)

    yield court

    async with test_session_factory() as session:
        booking_ids = (await session.execute(
            select(Booking.id).where(Booking.court_id == court.id)
        )).scalars().all()
        if booking_ids:
            await session.execute(sql_delete(Payment).where(Payment.booking_id.in_(booking_ids)))
            await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id.in_(booking_ids)))
            await session.execute(sql_delete(Booking).where(Booking.id.in_(booking_ids)))
        await session.execute(sql_delete(PricingRule).where(PricingRule.club_id == club.id))
        await session.execute(sql_delete(OperatingHours).where(OperatingHours.club_id == club.id))
        await session.execute(sql_delete(Court).where(Court.id == court.id))
        await session.commit()


@pytest_asyncio.fixture
async def player2(tenant, test_session_factory):
    """A second player in the same tenant (skill 3.5)."""
    async with test_session_factory() as session:
        u = User(
            tenant_id=tenant.id,
            email=f"holdp2-{uuid.uuid4().hex[:6]}@test.com",
            full_name="Hold Player Two",
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


@pytest.fixture
def player2_headers(player2, tenant):
    token = create_access_token({"sub": str(player2.id), "tid": str(tenant.id)})
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------


async def _players(session_factory, booking_id) -> list[BookingPlayer]:
    async with session_factory() as session:
        return (await session.execute(
            select(BookingPlayer).where(BookingPlayer.booking_id == booking_id)
        )).scalars().all()


async def _booking(session_factory, booking_id) -> Booking:
    async with session_factory() as session:
        return await session.get(Booking, booking_id)


async def _expire_holds(session_factory, booking_id) -> None:
    """Fast-forward every still-live hold on a booking to one minute ago."""
    past = datetime.now(tz=timezone.utc) - timedelta(minutes=1)
    async with session_factory() as session:
        await session.execute(
            sql_update(BookingPlayer)
            .where(
                BookingPlayer.booking_id == booking_id,
                BookingPlayer.payment_deadline.is_not(None),
            )
            .values(payment_deadline=past)
        )
        await session.execute(
            sql_update(Booking)
            .where(Booking.id == booking_id, Booking.hold_expires_at.is_not(None))
            .values(hold_expires_at=past)
        )
        await session.commit()


async def _mark_paid(session_factory, booking_id, user_id) -> None:
    """Simulate a player paying: clear their slot deadline + the court hold."""
    async with session_factory() as session:
        await session.execute(
            sql_update(BookingPlayer)
            .where(
                BookingPlayer.booking_id == booking_id,
                BookingPlayer.user_id == user_id,
            )
            .values(payment_status=PaymentStatus.paid, payment_deadline=None)
        )
        await session.execute(
            sql_update(Booking).where(Booking.id == booking_id).values(hold_expires_at=None)
        )
        await session.commit()


# ---------------------------------------------------------------------------
# Auth gate
# ---------------------------------------------------------------------------


class TestReleaseExpiredHoldsAuth:

    async def test_missing_platform_key_returns_422(self, client):
        resp = await client.post(RELEASE_URL)
        assert resp.status_code == 422

    async def test_wrong_platform_key_returns_403(self, client):
        resp = await client.post(RELEASE_URL, headers={"X-Platform-Key": "nope"})
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Happy path / sweep behaviour
# ---------------------------------------------------------------------------


class TestReleaseExpiredHoldsSweep:

    async def test_no_expired_holds_returns_zero_counts(self, client):
        resp = await client.post(RELEASE_URL, headers=PLATFORM_HEADERS)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body == {"released": 0, "reconciled": 0, "cancelled_bookings": 0}

    async def test_organiser_unpaid_expired_cancels_booking(
        self, client, player_headers, club, court_hours, test_session_factory
    ):
        resp = await client.post(
            "/api/v1/bookings",
            json=_payload(club.id, court_hours.id, _future()),
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text
        booking_id = resp.json()["id"]

        await _expire_holds(test_session_factory, booking_id)

        resp = await client.post(RELEASE_URL, headers=PLATFORM_HEADERS)
        assert resp.status_code == 200, resp.text
        assert resp.json() == {"released": 1, "reconciled": 0, "cancelled_bookings": 1}

        booking = await _booking(test_session_factory, booking_id)
        assert booking.status == BookingStatus.cancelled
        assert booking.hold_expires_at is None
        players = await _players(test_session_factory, booking_id)
        assert all(p.invite_status == InviteStatus.declined for p in players)
        assert all(p.payment_deadline is None for p in players)

    async def test_unpaid_joiner_freed_booking_survives(
        self, client, player_headers, player2, player2_headers, club, court_hours, test_session_factory
    ):
        # Organiser opens a game, then "pays" (clears their hold + the court hold).
        resp = await client.post(
            "/api/v1/bookings",
            json=_payload(club.id, court_hours.id, _future(), is_open_game=True),
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text
        booking_id = resp.json()["id"]
        organiser_players = await _players(test_session_factory, booking_id)
        await _mark_paid(test_session_factory, booking_id, organiser_players[0].user_id)

        # Second player self-joins (unpaid → gets a slot deadline), then abandons.
        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/join?club_id={club.id}",
            headers=player2_headers,
        )
        assert resp.status_code == 200, resp.text
        await _expire_holds(test_session_factory, booking_id)

        resp = await client.post(RELEASE_URL, headers=PLATFORM_HEADERS)
        assert resp.status_code == 200, resp.text
        assert resp.json() == {"released": 1, "reconciled": 0, "cancelled_bookings": 0}

        booking = await _booking(test_session_factory, booking_id)
        assert booking.status == BookingStatus.pending  # survives — organiser still paid
        players = {p.user_id: p for p in await _players(test_session_factory, booking_id)}
        assert players[player2.id].invite_status == InviteStatus.declined
        assert players[player2.id].payment_deadline is None
        assert players[organiser_players[0].user_id].payment_status == PaymentStatus.paid

    async def test_idempotent_second_run_is_noop(
        self, client, player_headers, club, court_hours, test_session_factory
    ):
        resp = await client.post(
            "/api/v1/bookings",
            json=_payload(club.id, court_hours.id, _future()),
            headers=player_headers,
        )
        booking_id = resp.json()["id"]
        await _expire_holds(test_session_factory, booking_id)

        first = await client.post(RELEASE_URL, headers=PLATFORM_HEADERS)
        assert first.json()["released"] == 1
        second = await client.post(RELEASE_URL, headers=PLATFORM_HEADERS)
        assert second.json() == {"released": 0, "reconciled": 0, "cancelled_bookings": 0}


# ---------------------------------------------------------------------------
# Deadlines set at the player entry points (and skipped for staff)
# ---------------------------------------------------------------------------


class TestHoldDeadlines:

    async def test_player_create_sets_organiser_deadline_and_court_hold(
        self, client, player_headers, club, court_hours, test_session_factory
    ):
        resp = await client.post(
            "/api/v1/bookings",
            json=_payload(club.id, court_hours.id, _future()),
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text
        booking_id = resp.json()["id"]

        booking = await _booking(test_session_factory, booking_id)
        assert booking.hold_expires_at is not None
        players = await _players(test_session_factory, booking_id)
        assert len(players) == 1
        assert players[0].role == PlayerRole.organiser
        assert players[0].payment_deadline is not None

    async def test_staff_create_sets_no_deadline_or_hold(
        self, client, staff_headers, club, court_hours, test_session_factory
    ):
        resp = await client.post(
            "/api/v1/bookings",
            json=_payload(club.id, court_hours.id, _future()),
            headers=staff_headers,
        )
        assert resp.status_code == 201, resp.text
        booking_id = resp.json()["id"]

        booking = await _booking(test_session_factory, booking_id)
        assert booking.hold_expires_at is None
        players = await _players(test_session_factory, booking_id)
        assert all(p.payment_deadline is None for p in players)

    async def test_join_sets_joiner_deadline(
        self, client, player_headers, player2, player2_headers, club, court_hours, test_session_factory
    ):
        resp = await client.post(
            "/api/v1/bookings",
            json=_payload(club.id, court_hours.id, _future(), is_open_game=True),
            headers=player_headers,
        )
        booking_id = resp.json()["id"]

        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/join?club_id={club.id}",
            headers=player2_headers,
        )
        assert resp.status_code == 200, resp.text

        players = {p.user_id: p for p in await _players(test_session_factory, booking_id)}
        assert players[player2.id].payment_deadline is not None

    async def test_accept_sets_invitee_deadline(
        self, client, player_headers, player2, player2_headers, club, court_hours, test_session_factory
    ):
        resp = await client.post(
            "/api/v1/bookings",
            json=_payload(club.id, court_hours.id, _future()),
            headers=player_headers,
        )
        booking_id = resp.json()["id"]

        # Organiser invites player2 → pending invite (no deadline yet).
        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/invite?club_id={club.id}",
            json={"user_id": str(player2.id)},
            headers=player_headers,
        )
        assert resp.status_code == 200, resp.text
        players = {p.user_id: p for p in await _players(test_session_factory, booking_id)}
        assert players[player2.id].payment_deadline is None

        # player2 accepts → their slot is now held.
        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/respond-invite?club_id={club.id}",
            json={"action": "accepted"},
            headers=player2_headers,
        )
        assert resp.status_code == 200, resp.text
        players = {p.user_id: p for p in await _players(test_session_factory, booking_id)}
        assert players[player2.id].invite_status == InviteStatus.accepted
        assert players[player2.id].payment_deadline is not None


# ---------------------------------------------------------------------------
# Conflict check ignores an expired hold
# ---------------------------------------------------------------------------


class TestConflictExcludesExpiredHold:

    async def test_live_hold_blocks_new_booking(
        self, client, player_headers, player2_headers, club, court_hours
    ):
        start = _future()
        first = await client.post(
            "/api/v1/bookings", json=_payload(club.id, court_hours.id, start), headers=player_headers
        )
        assert first.status_code == 201, first.text
        # Same court + slot while the first hold is still live → blocked.
        second = await client.post(
            "/api/v1/bookings", json=_payload(club.id, court_hours.id, start), headers=player2_headers
        )
        assert second.status_code == 409

    async def test_expired_hold_frees_court_for_new_booking(
        self, client, player_headers, player2_headers, club, court_hours, test_session_factory
    ):
        start = _future()
        first = await client.post(
            "/api/v1/bookings", json=_payload(club.id, court_hours.id, start), headers=player_headers
        )
        assert first.status_code == 201, first.text
        await _expire_holds(test_session_factory, first.json()["id"])

        # The expired hold no longer blocks the court, even before the sweep runs.
        second = await client.post(
            "/api/v1/bookings", json=_payload(club.id, court_hours.id, start), headers=player2_headers
        )
        assert second.status_code == 201, second.text


# ---------------------------------------------------------------------------
# Stripe-dependent release paths (driven directly against the service)
# ---------------------------------------------------------------------------


class TestReleaseStripePaths:

    async def test_payment_failure_frees_slot(
        self, client, player, player_headers, club, court_hours, test_session_factory
    ):
        resp = await client.post(
            "/api/v1/bookings",
            json=_payload(club.id, court_hours.id, _future()),
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text
        booking_id = resp.json()["id"]

        # Seed the in-flight card Payment that the failed-webhook will reference.
        async with test_session_factory() as session:
            session.add(Payment(
                booking_id=uuid.UUID(booking_id),
                club_id=club.id,
                user_id=player.id,
                stripe_payment_intent_id="pi_test_fail",
                amount=Decimal("20.00"),
                currency="GBP",
                payment_method=PaymentMethod.stripe_card,
                state=PaymentState.pending,
            ))
            await session.commit()

        event = {"data": {"object": {
            "id": "pi_test_fail",
            "last_payment_error": {"message": "card declined"},
        }}}
        async with test_session_factory() as session:
            await PaymentService(session).handle_payment_failed(event)

        players = await _players(test_session_factory, booking_id)
        assert all(p.invite_status == InviteStatus.declined for p in players)
        assert all(p.payment_deadline is None for p in players)
        booking = await _booking(test_session_factory, booking_id)
        # Organiser was the only player and never paid → booking cancelled.
        assert booking.status == BookingStatus.cancelled

    async def test_pi_already_succeeded_race_reconciles_to_paid(
        self, client, player_headers, player2, player2_headers, club, court_hours, test_session_factory
    ):
        resp = await client.post(
            "/api/v1/bookings",
            json=_payload(club.id, court_hours.id, _future(), is_open_game=True),
            headers=player_headers,
        )
        booking_id = resp.json()["id"]
        organiser_players = await _players(test_session_factory, booking_id)
        await _mark_paid(test_session_factory, booking_id, organiser_players[0].user_id)

        resp = await client.post(
            f"/api/v1/bookings/{booking_id}/join?club_id={club.id}",
            headers=player2_headers,
        )
        assert resp.status_code == 200, resp.text
        await _expire_holds(test_session_factory, booking_id)

        # supersede raising 409 means the card PI actually succeeded on Stripe's side.
        from fastapi import HTTPException, status as http_status

        async def _raise_409(*_args, **_kwargs):
            raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail="paid")

        async with test_session_factory() as session:
            svc = PaymentService(session)
            svc.supersede_pending_stripe_payment = _raise_409  # type: ignore[assignment]
            result = await svc.release_expired_holds()

        assert result == {"released": 0, "reconciled": 1, "cancelled_bookings": 0}
        players = {p.user_id: p for p in await _players(test_session_factory, booking_id)}
        assert players[player2.id].payment_status == PaymentStatus.paid
        assert players[player2.id].payment_deadline is None
        assert players[player2.id].invite_status == InviteStatus.accepted
        booking = await _booking(test_session_factory, booking_id)
        assert booking.status == BookingStatus.pending  # not full (4 slots) → stays pending
