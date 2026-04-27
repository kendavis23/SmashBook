"""
Integration tests for /api/v1/players endpoints.

Coverage
--------
GET  /players                 — happy path, name filter, club_id no-op, exclusions, tenant isolation
GET  /players/me              — success, unauthenticated, wrong tenant
PATCH /players/me             — success (partial update), unauthenticated, wrong tenant
GET  /players/me/bookings     — upcoming/past split, isolation, unauthenticated
GET  /players/me/match-history — completed only, isolation, unauthenticated
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import delete as sql_delete, select

from app.core.security import create_access_token, get_password_hash
from app.db.models.booking import (
    Booking,
    BookingPlayer,
    BookingStatus,
    BookingType,
    InviteStatus,
    PaymentStatus,
    PlayerRole,
)
from app.db.models.court import Court
from app.db.models.user import TenantUserRole, User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _future(hours: int = 48) -> datetime:
    return datetime.now(tz=timezone.utc) + timedelta(hours=hours)


def _past(hours: int = 48) -> datetime:
    return datetime.now(tz=timezone.utc) - timedelta(hours=hours)


# ---------------------------------------------------------------------------
# Local fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def court(club, test_session_factory):
    """Minimal court — no operating hours needed for direct DB inserts."""
    async with test_session_factory() as session:
        c = Court(club_id=club.id, name="Court A", surface_type="indoor", is_active=True)
        session.add(c)
        await session.commit()
        await session.refresh(c)

    yield c

    async with test_session_factory() as session:
        booking_ids = (
            await session.execute(select(Booking.id).where(Booking.court_id == c.id))
        ).scalars().all()
        if booking_ids:
            await session.execute(
                sql_delete(BookingPlayer).where(BookingPlayer.booking_id.in_(booking_ids))
            )
            await session.execute(sql_delete(Booking).where(Booking.id.in_(booking_ids)))
        await session.execute(sql_delete(Court).where(Court.id == c.id))
        await session.commit()


async def _insert_booking(
    session_factory,
    *,
    club_id,
    court_id,
    created_by_user_id,
    status: BookingStatus,
    start: datetime,
) -> Booking:
    end = start + timedelta(minutes=90)
    async with session_factory() as session:
        b = Booking(
            club_id=club_id,
            court_id=court_id,
            booking_type=BookingType.regular,
            status=status,
            start_datetime=start,
            end_datetime=end,
            created_by_user_id=created_by_user_id,
            is_open_game=False,
            max_players=4,
            total_price=Decimal("20.00"),
        )
        session.add(b)
        await session.commit()
        await session.refresh(b)
    return b


async def _insert_booking_player(
    session_factory,
    *,
    booking_id,
    user_id,
    role: PlayerRole = PlayerRole.organiser,
    payment_status: PaymentStatus = PaymentStatus.paid,
    amount_due: Decimal = Decimal("20.00"),
) -> BookingPlayer:
    async with session_factory() as session:
        bp = BookingPlayer(
            booking_id=booking_id,
            user_id=user_id,
            role=role,
            invite_status=InviteStatus.accepted,
            payment_status=payment_status,
            amount_due=amount_due,
        )
        session.add(bp)
        await session.commit()
        await session.refresh(bp)
    return bp


@pytest_asyncio.fixture
async def player2(tenant, test_session_factory):
    """Second player in the same tenant — used for isolation checks."""
    async with test_session_factory() as session:
        u = User(
            tenant_id=tenant.id,
            email=f"player2-{uuid.uuid4().hex[:6]}@test.com",
            full_name="Player Two",
            hashed_password=get_password_hash("Test1234!"),
            is_active=True,
            role=TenantUserRole.player,
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
# Tests — GET /players/me
# ---------------------------------------------------------------------------


class TestGetMyProfile:
    async def test_success(self, client, player, player_headers):
        resp = await client.get("/api/v1/players/me", headers=player_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == str(player.id)
        assert body["email"] == player.email
        assert body["full_name"] == player.full_name
        assert body["role"] == "player"
        assert body["is_active"] is True
        assert "preferred_notification_channel" in body

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.get("/api/v1/players/me")
        assert resp.status_code == 403

    async def test_wrong_tenant_returns_401(self, client, player, tenant, plan, test_session_factory):
        from app.db.models.tenant import Tenant as TenantModel

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
                "/api/v1/players/me",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Tenant-ID": str(t2.id),
                },
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()


# ---------------------------------------------------------------------------
# Tests — PATCH /players/me
# ---------------------------------------------------------------------------


class TestUpdateMyProfile:
    async def test_update_full_name(self, client, player_headers):
        resp = await client.patch(
            "/api/v1/players/me",
            headers=player_headers,
            json={"full_name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    async def test_update_phone(self, client, player_headers):
        resp = await client.patch(
            "/api/v1/players/me",
            headers=player_headers,
            json={"phone": "+44 7700 900000"},
        )
        assert resp.status_code == 200
        assert resp.json()["phone"] == "+44 7700 900000"

    async def test_update_notification_channel(self, client, player_headers):
        resp = await client.patch(
            "/api/v1/players/me",
            headers=player_headers,
            json={"preferred_notification_channel": "email"},
        )
        assert resp.status_code == 200
        assert resp.json()["preferred_notification_channel"] == "email"

    async def test_partial_update_preserves_other_fields(self, client, player, player_headers):
        resp = await client.patch(
            "/api/v1/players/me",
            headers=player_headers,
            json={"phone": "+34 600 000000"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == player.email
        assert body["role"] == "player"

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.patch("/api/v1/players/me", json={"full_name": "Hacker"})
        assert resp.status_code == 403

    async def test_invalid_notification_channel_returns_422(self, client, player_headers):
        resp = await client.patch(
            "/api/v1/players/me",
            headers=player_headers,
            json={"preferred_notification_channel": "carrier_pigeon"},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Tests — GET /players/me/bookings
# ---------------------------------------------------------------------------


class TestGetMyBookings:
    async def test_returns_upcoming_and_past_lists(
        self, client, player, player_headers, club, court, test_session_factory
    ):
        """Both upcoming and past lists populated from the player's bookings."""
        future_booking = await _insert_booking(
            test_session_factory,
            club_id=club.id,
            court_id=court.id,
            created_by_user_id=player.id,
            status=BookingStatus.confirmed,
            start=_future(48),
        )
        past_booking = await _insert_booking(
            test_session_factory,
            club_id=club.id,
            court_id=court.id,
            created_by_user_id=player.id,
            status=BookingStatus.completed,
            start=_past(72),
        )
        await _insert_booking_player(
            test_session_factory,
            booking_id=future_booking.id,
            user_id=player.id,
            role=PlayerRole.organiser,
        )
        await _insert_booking_player(
            test_session_factory,
            booking_id=past_booking.id,
            user_id=player.id,
            role=PlayerRole.organiser,
        )

        resp = await client.get("/api/v1/players/me/bookings", headers=player_headers)
        assert resp.status_code == 200

        body = resp.json()
        assert "upcoming" in body
        assert "past" in body

        upcoming_ids = {b["booking_id"] for b in body["upcoming"]}
        past_ids = {b["booking_id"] for b in body["past"]}

        assert str(future_booking.id) in upcoming_ids
        assert str(past_booking.id) in past_ids
        # Cross-check: each booking appears in exactly one list
        assert str(future_booking.id) not in past_ids
        assert str(past_booking.id) not in upcoming_ids

    async def test_upcoming_contains_required_fields(
        self, client, player, player_headers, club, court, test_session_factory
    ):
        booking = await _insert_booking(
            test_session_factory,
            club_id=club.id,
            court_id=court.id,
            created_by_user_id=player.id,
            status=BookingStatus.confirmed,
            start=_future(24),
        )
        await _insert_booking_player(
            test_session_factory,
            booking_id=booking.id,
            user_id=player.id,
            role=PlayerRole.organiser,
            payment_status=PaymentStatus.paid,
            amount_due=Decimal("20.00"),
        )

        resp = await client.get("/api/v1/players/me/bookings", headers=player_headers)
        assert resp.status_code == 200

        upcoming = resp.json()["upcoming"]
        assert len(upcoming) >= 1
        item = next(b for b in upcoming if b["booking_id"] == str(booking.id))
        assert item["court_name"] == "Court A"
        assert item["status"] == "confirmed"
        assert item["role"] == "organiser"
        assert item["payment_status"] == "paid"
        assert item["amount_due"] == "20.00"
        assert "start_datetime" in item
        assert "end_datetime" in item

    async def test_cancelled_booking_appears_in_past(
        self, client, player, player_headers, club, court, test_session_factory
    ):
        booking = await _insert_booking(
            test_session_factory,
            club_id=club.id,
            court_id=court.id,
            created_by_user_id=player.id,
            status=BookingStatus.cancelled,
            start=_past(24),
        )
        await _insert_booking_player(
            test_session_factory,
            booking_id=booking.id,
            user_id=player.id,
            role=PlayerRole.player,
        )

        resp = await client.get("/api/v1/players/me/bookings", headers=player_headers)
        assert resp.status_code == 200

        past_ids = {b["booking_id"] for b in resp.json()["past"]}
        assert str(booking.id) in past_ids

    async def test_player_sees_only_own_bookings(
        self, client, player, player2, player2_headers, club, court, test_session_factory
    ):
        """player2 gets empty lists because the booking belongs to player only."""
        booking = await _insert_booking(
            test_session_factory,
            club_id=club.id,
            court_id=court.id,
            created_by_user_id=player.id,
            status=BookingStatus.confirmed,
            start=_future(48),
        )
        await _insert_booking_player(
            test_session_factory,
            booking_id=booking.id,
            user_id=player.id,  # player only, not player2
        )

        resp = await client.get("/api/v1/players/me/bookings", headers=player2_headers)
        assert resp.status_code == 200

        body = resp.json()
        all_ids = {b["booking_id"] for b in body["upcoming"] + body["past"]}
        assert str(booking.id) not in all_ids

    async def test_no_bookings_returns_empty_lists(self, client, player_headers):
        resp = await client.get("/api/v1/players/me/bookings", headers=player_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body["upcoming"], list)
        assert isinstance(body["past"], list)

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.get("/api/v1/players/me/bookings")
        assert resp.status_code == 403

    async def test_wrong_tenant_returns_401(self, client, player, tenant, plan, test_session_factory):
        from app.db.models.tenant import Tenant as TenantModel

        subdomain_b = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Other Club", subdomain=subdomain_b, plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.commit()
            await session.refresh(t2)

        try:
            token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
            resp = await client.get(
                "/api/v1/players/me/bookings",
                headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2.id)},
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()


# ---------------------------------------------------------------------------
# Tests — GET /players/me/match-history
# ---------------------------------------------------------------------------


class TestGetMatchHistory:
    async def test_returns_only_completed_bookings(
        self, client, player, player_headers, club, court, test_session_factory
    ):
        completed = await _insert_booking(
            test_session_factory,
            club_id=club.id,
            court_id=court.id,
            created_by_user_id=player.id,
            status=BookingStatus.completed,
            start=_past(72),
        )
        pending = await _insert_booking(
            test_session_factory,
            club_id=club.id,
            court_id=court.id,
            created_by_user_id=player.id,
            status=BookingStatus.confirmed,
            start=_future(48),
        )
        await _insert_booking_player(
            test_session_factory, booking_id=completed.id, user_id=player.id
        )
        await _insert_booking_player(
            test_session_factory, booking_id=pending.id, user_id=player.id
        )

        resp = await client.get("/api/v1/players/me/match-history", headers=player_headers)
        assert resp.status_code == 200

        ids = {b["booking_id"] for b in resp.json()}
        assert str(completed.id) in ids
        assert str(pending.id) not in ids

    async def test_match_history_contains_required_fields(
        self, client, player, player_headers, club, court, test_session_factory
    ):
        booking = await _insert_booking(
            test_session_factory,
            club_id=club.id,
            court_id=court.id,
            created_by_user_id=player.id,
            status=BookingStatus.completed,
            start=_past(48),
        )
        await _insert_booking_player(
            test_session_factory,
            booking_id=booking.id,
            user_id=player.id,
            role=PlayerRole.organiser,
            payment_status=PaymentStatus.paid,
            amount_due=Decimal("20.00"),
        )

        resp = await client.get("/api/v1/players/me/match-history", headers=player_headers)
        assert resp.status_code == 200

        items = resp.json()
        assert len(items) >= 1
        item = next(b for b in items if b["booking_id"] == str(booking.id))
        assert item["status"] == "completed"
        assert item["court_name"] == "Court A"
        assert item["role"] == "organiser"
        assert "start_datetime" in item
        assert "end_datetime" in item

    async def test_cancelled_booking_excluded_from_match_history(
        self, client, player, player_headers, club, court, test_session_factory
    ):
        cancelled = await _insert_booking(
            test_session_factory,
            club_id=club.id,
            court_id=court.id,
            created_by_user_id=player.id,
            status=BookingStatus.cancelled,
            start=_past(48),
        )
        await _insert_booking_player(
            test_session_factory, booking_id=cancelled.id, user_id=player.id
        )

        resp = await client.get("/api/v1/players/me/match-history", headers=player_headers)
        assert resp.status_code == 200

        ids = {b["booking_id"] for b in resp.json()}
        assert str(cancelled.id) not in ids

    async def test_player_sees_only_own_matches(
        self, client, player, player2, player2_headers, club, court, test_session_factory
    ):
        """player2 sees empty match history even though player has a completed match."""
        booking = await _insert_booking(
            test_session_factory,
            club_id=club.id,
            court_id=court.id,
            created_by_user_id=player.id,
            status=BookingStatus.completed,
            start=_past(48),
        )
        await _insert_booking_player(
            test_session_factory, booking_id=booking.id, user_id=player.id
        )

        resp = await client.get("/api/v1/players/me/match-history", headers=player2_headers)
        assert resp.status_code == 200

        ids = {b["booking_id"] for b in resp.json()}
        assert str(booking.id) not in ids

    async def test_no_matches_returns_empty_list(self, client, player_headers):
        resp = await client.get("/api/v1/players/me/match-history", headers=player_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.get("/api/v1/players/me/match-history")
        assert resp.status_code == 403

    async def test_wrong_tenant_returns_401(self, client, player, tenant, plan, test_session_factory):
        from app.db.models.tenant import Tenant as TenantModel

        subdomain_b = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Other Club", subdomain=subdomain_b, plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.commit()
            await session.refresh(t2)

        try:
            token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
            resp = await client.get(
                "/api/v1/players/me/match-history",
                headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2.id)},
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()


# ---------------------------------------------------------------------------
# Tests — PATCH /players/{player_id}/skill-level
# ---------------------------------------------------------------------------


class TestUpdateSkillLevel:
    async def test_success(self, client, player, staff, staff_headers):
        resp = await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=staff_headers,
            json={"new_level": "3.5"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["user_id"] == str(player.id)
        assert float(body["skill_level"]) == 3.5
        assert body["skill_assigned_by"] == str(staff.id)
        assert "skill_assigned_at" in body
        assert "history_entry" in body

    async def test_history_entry_shape(self, client, player, staff, staff_headers):
        resp = await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=staff_headers,
            json={"new_level": "4.0", "reason": "Tournament win"},
        )
        assert resp.status_code == 200
        h = resp.json()["history_entry"]
        assert float(h["new_level"]) == 4.0
        assert h["previous_level"] is None  # first assignment
        assert h["assigned_by"] == str(staff.id)
        assert h["reason"] == "Tournament win"
        assert "id" in h
        assert "created_at" in h

    async def test_subsequent_assignment_captures_previous_level(
        self, client, player, staff, staff_headers
    ):
        await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=staff_headers,
            json={"new_level": "3.0"},
        )
        resp = await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=staff_headers,
            json={"new_level": "4.0"},
        )
        assert resp.status_code == 200
        h = resp.json()["history_entry"]
        assert float(h["previous_level"]) == 3.0
        assert float(h["new_level"]) == 4.0

    async def test_player_not_found_returns_404(self, client, staff_headers):
        resp = await client.patch(
            f"/api/v1/players/{uuid.uuid4()}/skill-level",
            headers=staff_headers,
            json={"new_level": "3.5"},
        )
        assert resp.status_code == 404

    async def test_player_role_cannot_update_skill_level(self, client, player, player_headers):
        resp = await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=player_headers,
            json={"new_level": "3.5"},
        )
        assert resp.status_code == 403

    async def test_unauthenticated_returns_403(self, client, player):
        resp = await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            json={"new_level": "3.5"},
        )
        assert resp.status_code == 403

    async def test_skill_level_below_minimum_returns_422(self, client, player, staff_headers):
        resp = await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=staff_headers,
            json={"new_level": "0.5"},
        )
        assert resp.status_code == 422

    async def test_skill_level_above_maximum_returns_422(self, client, player, staff_headers):
        resp = await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=staff_headers,
            json={"new_level": "7.5"},
        )
        assert resp.status_code == 422

    async def test_missing_new_level_returns_422(self, client, player, staff_headers):
        resp = await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=staff_headers,
            json={"reason": "no level provided"},
        )
        assert resp.status_code == 422

    async def test_wrong_tenant_returns_401(self, client, player, staff, tenant, plan, test_session_factory):
        from app.db.models.tenant import Tenant as TenantModel

        subdomain_b = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Other Club", subdomain=subdomain_b, plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.commit()
            await session.refresh(t2)

        try:
            token = create_access_token({"sub": str(staff.id), "tid": str(tenant.id)})
            resp = await client.patch(
                f"/api/v1/players/{player.id}/skill-level",
                headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2.id)},
                json={"new_level": "3.5"},
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()


# ---------------------------------------------------------------------------
# Tests — GET /players/{player_id}/skill-history
# ---------------------------------------------------------------------------


class TestGetSkillHistory:
    async def test_empty_history(self, client, player, staff_headers):
        resp = await client.get(
            f"/api/v1/players/{player.id}/skill-history",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_returns_history_after_assignment(self, client, player, staff, staff_headers):
        await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=staff_headers,
            json={"new_level": "3.5", "reason": "First assessment"},
        )
        resp = await client.get(
            f"/api/v1/players/{player.id}/skill-history",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        item = items[0]
        assert float(item["new_level"]) == 3.5
        assert item["previous_level"] is None
        assert item["assigned_by"] == str(staff.id)
        assert item["reason"] == "First assessment"

    async def test_multiple_assignments_all_in_history(self, client, player, staff, staff_headers):
        await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=staff_headers,
            json={"new_level": "3.0"},
        )
        await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=staff_headers,
            json={"new_level": "4.0"},
        )
        resp = await client.get(
            f"/api/v1/players/{player.id}/skill-history",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    async def test_history_contains_required_fields(self, client, player, staff_headers):
        await client.patch(
            f"/api/v1/players/{player.id}/skill-level",
            headers=staff_headers,
            json={"new_level": "3.5"},
        )
        resp = await client.get(
            f"/api/v1/players/{player.id}/skill-history",
            headers=staff_headers,
        )
        assert resp.status_code == 200
        item = resp.json()[0]
        for field in ("id", "new_level", "previous_level", "assigned_by", "reason", "created_at"):
            assert field in item

    async def test_player_role_cannot_view_skill_history(self, client, player, player_headers):
        resp = await client.get(
            f"/api/v1/players/{player.id}/skill-history",
            headers=player_headers,
        )
        assert resp.status_code == 403

    async def test_unauthenticated_returns_403(self, client, player):
        resp = await client.get(f"/api/v1/players/{player.id}/skill-history")
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Tests — GET /players
# ---------------------------------------------------------------------------


class TestSearchPlayers:
    async def test_returns_players_in_tenant(self, client, player, player_headers):
        resp = await client.get("/api/v1/players", headers=player_headers)
        assert resp.status_code == 200
        ids = {p["id"] for p in resp.json()}
        assert str(player.id) in ids

    async def test_response_shape(self, client, player, player_headers):
        resp = await client.get("/api/v1/players", headers=player_headers)
        assert resp.status_code == 200
        items = resp.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        item = next(p for p in items if p["id"] == str(player.id))
        assert "id" in item
        assert "full_name" in item
        assert "skill_level" in item

    async def test_sorted_by_name(self, client, player, player2, player_headers):
        resp = await client.get("/api/v1/players", headers=player_headers)
        assert resp.status_code == 200
        names = [p["full_name"] for p in resp.json()]
        assert names == sorted(names)

    async def test_name_filter_returns_matching_player(self, client, player, player2, player_headers):
        # player2 full_name is "Player Two"; search for a prefix unique to them
        resp = await client.get("/api/v1/players?q=Player+Two", headers=player_headers)
        assert resp.status_code == 200
        ids = {p["id"] for p in resp.json()}
        assert str(player2.id) in ids

    async def test_name_filter_excludes_non_matches(self, client, player, player2, player_headers):
        resp = await client.get("/api/v1/players?q=Player+Two", headers=player_headers)
        assert resp.status_code == 200
        ids = {p["id"] for p in resp.json()}
        # player fixture is "Test Player" — should not appear
        assert str(player.id) not in ids

    async def test_name_filter_is_case_insensitive(self, client, player, player_headers):
        resp = await client.get("/api/v1/players?q=test+player", headers=player_headers)
        assert resp.status_code == 200
        ids = {p["id"] for p in resp.json()}
        assert str(player.id) in ids

    async def test_club_id_param_accepted_as_no_op(self, client, player, player_headers):
        resp = await client.get(
            f"/api/v1/players?club_id={uuid.uuid4()}", headers=player_headers
        )
        assert resp.status_code == 200
        ids = {p["id"] for p in resp.json()}
        assert str(player.id) in ids

    async def test_excludes_suspended_players(self, client, player, player_headers, tenant, test_session_factory):
        async with test_session_factory() as session:
            u = User(
                tenant_id=tenant.id,
                email=f"suspended-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Suspended Player",
                hashed_password="x",
                is_active=True,
                is_suspended=True,
                role=TenantUserRole.player,
            )
            session.add(u)
            await session.commit()
            await session.refresh(u)

        try:
            resp = await client.get("/api/v1/players", headers=player_headers)
            assert resp.status_code == 200
            ids = {p["id"] for p in resp.json()}
            assert str(u.id) not in ids
        finally:
            async with test_session_factory() as session:
                obj = await session.get(User, u.id)
                if obj:
                    await session.delete(obj)
                await session.commit()

    async def test_excludes_inactive_players(self, client, player, player_headers, tenant, test_session_factory):
        async with test_session_factory() as session:
            u = User(
                tenant_id=tenant.id,
                email=f"inactive-{uuid.uuid4().hex[:6]}@test.com",
                full_name="Inactive Player",
                hashed_password="x",
                is_active=False,
                role=TenantUserRole.player,
            )
            session.add(u)
            await session.commit()
            await session.refresh(u)

        try:
            resp = await client.get("/api/v1/players", headers=player_headers)
            assert resp.status_code == 200
            ids = {p["id"] for p in resp.json()}
            assert str(u.id) not in ids
        finally:
            async with test_session_factory() as session:
                obj = await session.get(User, u.id)
                if obj:
                    await session.delete(obj)
                await session.commit()

    async def test_excludes_staff_users(self, client, player, staff, player_headers):
        resp = await client.get("/api/v1/players", headers=player_headers)
        assert resp.status_code == 200
        ids = {p["id"] for p in resp.json()}
        assert str(staff.id) not in ids

    async def test_no_results_returns_empty_list(self, client, player_headers):
        resp = await client.get("/api/v1/players?q=zzznomatch", headers=player_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.get("/api/v1/players")
        assert resp.status_code == 403

    async def test_wrong_tenant_returns_401(self, client, player, tenant, plan, test_session_factory):
        from app.db.models.tenant import Tenant as TenantModel

        subdomain_b = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Other Club", subdomain=subdomain_b, plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.commit()
            await session.refresh(t2)

        try:
            token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
            resp = await client.get(
                "/api/v1/players",
                headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2.id)},
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()
