"""
Integration tests for GET /api/v1/clubs/{club_id}/availability.

Coverage:
- Empty courts → bookable slots with pricing
- Bookings remove the court from `available_courts`
- Open games appear in `existing_matches` with skill filtering
- Maintenance / tournament reservations remove the court from both lists
- `from_time` / `to_time` clamp each day's window
- `surface` filter restricts courts
- `end_date` returns a range; no `end_date` caps at 40 + returns `next_cursor`
- Slots with no actionable option are omitted
- Slots with only joinable matches (all courts booked, one open game) still surface
- 404 on unknown / cross-tenant club; 403 unauth; 422 on bad input
- Operating-hours gaps drop the entire day from the response
"""
import uuid
from datetime import datetime, time as TimeType, timezone
from decimal import Decimal

from sqlalchemy import delete as sql_delete


# ---------------------------------------------------------------------------
# Local helpers (lightweight versions of test_courts.py helpers — kept here so
# this test file is self-contained and won't break if test_courts.py refactors)
# ---------------------------------------------------------------------------


async def _make_court(client, staff_headers, club, surface_type="indoor", name="Court A"):
    resp = await client.post(
        "/api/v1/courts",
        json={
            "club_id": str(club.id),
            "name": name,
            "surface_type": surface_type,
            "has_lighting": False,
            "is_active": True,
        },
        headers=staff_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _seed_operating_hours(club_id, session_factory, day_of_week,
                                open_time="07:00", close_time="22:00"):
    from app.db.models.club import OperatingHours
    h_open, m_open = map(int, open_time.split(":"))
    h_close, m_close = map(int, close_time.split(":"))
    async with session_factory() as session:
        oh = OperatingHours(
            club_id=club_id,
            day_of_week=day_of_week,
            open_time=TimeType(h_open, m_open),
            close_time=TimeType(h_close, m_close),
        )
        session.add(oh)
        await session.commit()
        await session.refresh(oh)
    return oh


async def _seed_operating_hours_all_week(club_id, session_factory,
                                          open_time="07:00", close_time="22:00"):
    ids = []
    for dow in range(7):
        oh = await _seed_operating_hours(club_id, session_factory, dow,
                                          open_time=open_time, close_time=close_time)
        ids.append(oh.id)
    return ids


async def _set_club_booking_window(club_id, session_factory,
                                    advance_days=9999, notice_hours=0):
    from app.db.models.club import Club as ClubModel
    async with session_factory() as session:
        c = await session.get(ClubModel, club_id)
        c.max_advance_booking_days = advance_days
        c.min_booking_notice_hours = notice_hours
        await session.commit()


async def _seed_pricing_rule(club_id, session_factory, day_of_week,
                              start_time="07:00", end_time="22:00",
                              label="Off-Peak", price="18.00"):
    from app.db.models.club import PricingRule
    h_s, m_s = map(int, start_time.split(":"))
    h_e, m_e = map(int, end_time.split(":"))
    async with session_factory() as session:
        rule = PricingRule(
            club_id=club_id,
            label=label,
            day_of_week=day_of_week,
            start_time=TimeType(h_s, m_s),
            end_time=TimeType(h_e, m_e),
            is_active=True,
            price_per_slot=Decimal(price),
        )
        session.add(rule)
        await session.commit()
        await session.refresh(rule)
    return rule


async def _seed_booking(court_id, club_id, user_id, start_dt, end_dt,
                         session_factory, is_open_game=False, max_players=4,
                         min_skill=None, max_skill=None, total_price=None,
                         accepted_player_ids=None):
    from app.db.models.booking import (
        Booking, BookingPlayer, BookingStatus, BookingType,
        InviteStatus, PaymentStatus, PlayerRole,
    )
    async with session_factory() as session:
        b = Booking(
            club_id=club_id,
            court_id=court_id,
            booking_type=BookingType.regular,
            status=BookingStatus.confirmed,
            start_datetime=start_dt,
            end_datetime=end_dt,
            created_by_user_id=user_id,
            is_open_game=is_open_game,
            max_players=max_players,
            min_skill_level=Decimal(str(min_skill)) if min_skill is not None else None,
            max_skill_level=Decimal(str(max_skill)) if max_skill is not None else None,
            total_price=Decimal(str(total_price)) if total_price is not None else None,
        )
        session.add(b)
        await session.flush()
        # Organiser as accepted player
        session.add(BookingPlayer(
            booking_id=b.id,
            user_id=user_id,
            role=PlayerRole.organiser,
            invite_status=InviteStatus.accepted,
            payment_status=PaymentStatus.pending,
            amount_due=Decimal("0.00"),
        ))
        for pid in (accepted_player_ids or []):
            session.add(BookingPlayer(
                booking_id=b.id,
                user_id=pid,
                role=PlayerRole.player,
                invite_status=InviteStatus.accepted,
                payment_status=PaymentStatus.pending,
                amount_due=Decimal("0.00"),
            ))
        await session.commit()
        await session.refresh(b)
    return b


async def _seed_reservation(club_id, court_id, start_dt, end_dt, user_id,
                             session_factory, reservation_type="maintenance"):
    from app.db.models.court import CalendarReservation, CalendarReservationType
    async with session_factory() as session:
        r = CalendarReservation(
            club_id=club_id,
            court_id=court_id,
            reservation_type=CalendarReservationType(reservation_type),
            title=reservation_type,
            start_datetime=start_dt,
            end_datetime=end_dt,
            is_recurring=False,
            created_by=user_id,
        )
        session.add(r)
        await session.commit()
        await session.refresh(r)
    return r


async def _cleanup_bookings(booking_ids, session_factory):
    from app.db.models.booking import Booking, BookingPlayer
    async with session_factory() as session:
        await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id.in_(booking_ids)))
        await session.execute(sql_delete(Booking).where(Booking.id.in_(booking_ids)))
        await session.commit()


async def _cleanup_operating_hours(oh_ids, session_factory):
    from app.db.models.club import OperatingHours
    async with session_factory() as session:
        await session.execute(sql_delete(OperatingHours).where(OperatingHours.id.in_(oh_ids)))
        await session.commit()


async def _cleanup_pricing_rules(rule_ids, session_factory):
    from app.db.models.club import PricingRule
    async with session_factory() as session:
        await session.execute(sql_delete(PricingRule).where(PricingRule.id.in_(rule_ids)))
        await session.commit()


async def _cleanup_reservations(res_ids, session_factory):
    from app.db.models.court import CalendarReservation
    async with session_factory() as session:
        await session.execute(sql_delete(CalendarReservation).where(CalendarReservation.id.in_(res_ids)))
        await session.commit()


# 2030-01-07 is a Monday — used as our anchor test date so dow=0 maps to Monday.
MON = "2030-01-07"
TUE = "2030-01-08"


# ---------------------------------------------------------------------------
# Happy-path / shape
# ---------------------------------------------------------------------------


class TestAvailabilityShape:
    async def test_returns_empty_days_when_no_operating_hours(
        self, client, staff_headers, player_headers, club, test_session_factory
    ):
        await _make_court(client, staff_headers, club, name="C1")
        await _set_club_booking_window(club.id, test_session_factory)
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/availability",
            params={"start_date": MON, "end_date": MON},
            headers=player_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["club_id"] == str(club.id)
        assert body["days"] == []
        assert body["next_cursor"] is None
        # Courts list still populated
        assert len(body["courts"]) == 1
        assert body["courts"][0]["name"] == "C1"

    async def test_empty_courts_produce_available_slots(
        self, client, staff_headers, player_headers, club, test_session_factory
    ):
        c1 = await _make_court(client, staff_headers, club, name="C1")
        c2 = await _make_court(client, staff_headers, club, name="C2")
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="09:00", close_time="12:00")
        rule = await _seed_pricing_rule(club.id, test_session_factory, 0,
                                         start_time="09:00", end_time="12:00",
                                         label="Off-Peak", price="18.00")
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": MON},
                headers=player_headers,
            )
            assert resp.status_code == 200, resp.text
            body = resp.json()
            assert len(body["days"]) == 1
            day = body["days"][0]
            assert day["date"] == MON
            # 09:00–12:00 with default 90 min duration = 2 slots
            assert [s["start_time"] for s in day["slots"]] == ["09:00", "10:30"]
            # Both courts free in both slots
            for slot in day["slots"]:
                assert slot["available_count"] == 2
                assert {c["court_id"] for c in slot["available_courts"]} == {c1, c2}
                assert all(c["price"] == "18.00" for c in slot["available_courts"])
                assert all(c["price_label"] == "Off-Peak" for c in slot["available_courts"])
                assert slot["existing_matches"] == []
            assert body["next_cursor"] is None
        finally:
            await _cleanup_pricing_rules([rule.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_courts_list_carries_metadata(
        self, client, staff_headers, player_headers, club, test_session_factory
    ):
        await _make_court(client, staff_headers, club, name="Indoor 1", surface_type="indoor")
        await _make_court(client, staff_headers, club, name="Outdoor 1", surface_type="outdoor")
        await _set_club_booking_window(club.id, test_session_factory)
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/availability",
            params={"start_date": MON, "end_date": MON},
            headers=player_headers,
        )
        assert resp.status_code == 200
        courts = {c["name"]: c for c in resp.json()["courts"]}
        assert courts["Indoor 1"]["surface_type"] == "indoor"
        assert courts["Outdoor 1"]["surface_type"] == "outdoor"
        assert "has_lighting" in courts["Indoor 1"]


# ---------------------------------------------------------------------------
# Bookings and reservations affect slot composition
# ---------------------------------------------------------------------------


class TestBookingsAndReservations:
    async def test_private_booking_removes_court_from_available(
        self, client, staff_headers, player_headers, club, staff, test_session_factory
    ):
        c1 = await _make_court(client, staff_headers, club, name="C1")
        c2 = await _make_court(client, staff_headers, club, name="C2")
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="09:00", close_time="12:00")
        # Private booking blocks C1 from 09:00–10:30
        booking = await _seed_booking(
            uuid.UUID(c1), club.id, staff.id,
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            test_session_factory,
            is_open_game=False,
        )
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": MON},
                headers=player_headers,
            )
            assert resp.status_code == 200
            slots = {s["start_time"]: s for s in resp.json()["days"][0]["slots"]}
            # 09:00: C2 only available, no existing match (private booking)
            assert {c["court_id"] for c in slots["09:00"]["available_courts"]} == {c2}
            assert slots["09:00"]["existing_matches"] == []
            # 10:30: both courts free
            assert {c["court_id"] for c in slots["10:30"]["available_courts"]} == {c1, c2}
        finally:
            await _cleanup_bookings([booking.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_open_game_appears_in_existing_matches(
        self, client, staff_headers, player_headers, club, staff, test_session_factory
    ):
        c1 = await _make_court(client, staff_headers, club, name="C1")
        c2 = await _make_court(client, staff_headers, club, name="C2")
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="09:00", close_time="12:00")
        # Open game on C1 at 09:00, max 4 players, 1 accepted (organiser) → 3 slots left
        booking = await _seed_booking(
            uuid.UUID(c1), club.id, staff.id,
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            test_session_factory,
            is_open_game=True,
            max_players=4,
            min_skill=2.5,
            max_skill=3.5,
            total_price="72.00",
        )
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": MON, "skill_level": "3"},
                headers=player_headers,
            )
            assert resp.status_code == 200
            slots = {s["start_time"]: s for s in resp.json()["days"][0]["slots"]}
            slot0900 = slots["09:00"]
            # C1 booked → only C2 available
            assert {c["court_id"] for c in slot0900["available_courts"]} == {c2}
            # Open game surfaces in existing_matches
            assert len(slot0900["existing_matches"]) == 1
            match = slot0900["existing_matches"][0]
            assert match["booking_id"] == str(booking.id)
            assert match["court_id"] == c1
            assert match["slots_available"] == 3
            assert match["min_skill_level"] == "2.5"
            assert match["max_skill_level"] == "3.5"
            assert match["total_price"] == "72.00"
        finally:
            await _cleanup_bookings([booking.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_skill_level_filters_open_games(
        self, client, staff_headers, player_headers, club, staff, test_session_factory
    ):
        c1 = await _make_court(client, staff_headers, club, name="C1")
        c2 = await _make_court(client, staff_headers, club, name="C2")
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="09:00", close_time="12:00")
        # Two open games at 09:00 — one fits skill=3, one doesn't
        in_range = await _seed_booking(
            uuid.UUID(c1), club.id, staff.id,
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            test_session_factory,
            is_open_game=True, max_players=4, min_skill=2.5, max_skill=3.5,
        )
        out_of_range = await _seed_booking(
            uuid.UUID(c2), club.id, staff.id,
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            test_session_factory,
            is_open_game=True, max_players=4, min_skill=4.0, max_skill=5.0,
        )
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": MON, "skill_level": "3"},
                headers=player_headers,
            )
            assert resp.status_code == 200
            slot0900 = next(s for s in resp.json()["days"][0]["slots"] if s["start_time"] == "09:00")
            ids = [m["booking_id"] for m in slot0900["existing_matches"]]
            assert str(in_range.id) in ids
            assert str(out_of_range.id) not in ids
        finally:
            await _cleanup_bookings([in_range.id, out_of_range.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_open_game_with_null_skill_range_always_included(
        self, client, staff_headers, player_headers, club, staff, test_session_factory
    ):
        c1 = await _make_court(client, staff_headers, club, name="C1")
        await _make_court(client, staff_headers, club, name="C2")
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="09:00", close_time="10:30")
        booking = await _seed_booking(
            uuid.UUID(c1), club.id, staff.id,
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            test_session_factory,
            is_open_game=True, max_players=4,
            # both skill levels None → open to all
        )
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": MON, "skill_level": "7"},
                headers=player_headers,
            )
            assert resp.status_code == 200
            slot = resp.json()["days"][0]["slots"][0]
            assert any(m["booking_id"] == str(booking.id) for m in slot["existing_matches"])
        finally:
            await _cleanup_bookings([booking.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_full_open_game_excluded(
        self, client, staff_headers, player_headers, club, staff, player, test_session_factory
    ):
        c1 = await _make_court(client, staff_headers, club, name="C1")
        await _make_court(client, staff_headers, club, name="C2")
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="09:00", close_time="10:30")
        # 2-player open game: organiser + one accepted player → 0 slots left
        booking = await _seed_booking(
            uuid.UUID(c1), club.id, staff.id,
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            test_session_factory,
            is_open_game=True, max_players=2,
            accepted_player_ids=[player.id],
        )
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": MON},
                headers=player_headers,
            )
            assert resp.status_code == 200
            slot = resp.json()["days"][0]["slots"][0]
            assert slot["existing_matches"] == []
        finally:
            await _cleanup_bookings([booking.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_slot_with_only_joinable_match_still_emitted(
        self, client, staff_headers, player_headers, club, staff, test_session_factory
    ):
        """All courts busy, one of them is a joinable open game → slot has [] available + [match]."""
        c1 = await _make_court(client, staff_headers, club, name="C1")
        c2 = await _make_court(client, staff_headers, club, name="C2")
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="09:00", close_time="10:30")
        # C1: private booking. C2: open game with capacity.
        private = await _seed_booking(
            uuid.UUID(c1), club.id, staff.id,
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            test_session_factory,
            is_open_game=False,
        )
        open_game = await _seed_booking(
            uuid.UUID(c2), club.id, staff.id,
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            test_session_factory,
            is_open_game=True, max_players=4,
        )
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": MON},
                headers=player_headers,
            )
            assert resp.status_code == 200
            slots = resp.json()["days"][0]["slots"]
            assert len(slots) == 1
            slot = slots[0]
            assert slot["available_courts"] == []
            assert slot["available_count"] == 0
            assert len(slot["existing_matches"]) == 1
            assert slot["existing_matches"][0]["booking_id"] == str(open_game.id)
        finally:
            await _cleanup_bookings([private.id, open_game.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_slot_with_nothing_actionable_is_omitted(
        self, client, staff_headers, player_headers, club, staff, test_session_factory
    ):
        c1 = await _make_court(client, staff_headers, club, name="C1")
        c2 = await _make_court(client, staff_headers, club, name="C2")
        await _set_club_booking_window(club.id, test_session_factory)
        # Only the 09:00 slot
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="09:00", close_time="10:30")
        # Both courts private bookings → nothing actionable
        b1 = await _seed_booking(
            uuid.UUID(c1), club.id, staff.id,
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            test_session_factory,
        )
        b2 = await _seed_booking(
            uuid.UUID(c2), club.id, staff.id,
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            test_session_factory,
        )
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": MON},
                headers=player_headers,
            )
            assert resp.status_code == 200
            assert resp.json()["days"] == []
        finally:
            await _cleanup_bookings([b1.id, b2.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_reservation_blocks_court_from_both_lists(
        self, client, staff_headers, player_headers, club, staff, test_session_factory
    ):
        c1 = await _make_court(client, staff_headers, club, name="C1")
        c2 = await _make_court(client, staff_headers, club, name="C2")
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="09:00", close_time="10:30")
        # Maintenance on C1 → fully unavailable; C2 should still produce a slot
        res = await _seed_reservation(
            club.id, uuid.UUID(c1),
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            staff.id, test_session_factory, reservation_type="maintenance",
        )
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": MON},
                headers=player_headers,
            )
            assert resp.status_code == 200
            slot = resp.json()["days"][0]["slots"][0]
            assert {c["court_id"] for c in slot["available_courts"]} == {c2}
            assert slot["existing_matches"] == []
        finally:
            await _cleanup_reservations([res.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_club_wide_reservation_blocks_all_courts(
        self, client, staff_headers, player_headers, club, staff, test_session_factory
    ):
        await _make_court(client, staff_headers, club, name="C1")
        await _make_court(client, staff_headers, club, name="C2")
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="09:00", close_time="10:30")
        # club-wide reservation (court_id=NULL) covers the slot
        res = await _seed_reservation(
            club.id, None,
            datetime(2030, 1, 7, 9, 0, tzinfo=timezone.utc),
            datetime(2030, 1, 7, 10, 30, tzinfo=timezone.utc),
            staff.id, test_session_factory, reservation_type="maintenance",
        )
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": MON},
                headers=player_headers,
            )
            assert resp.status_code == 200
            assert resp.json()["days"] == []
        finally:
            await _cleanup_reservations([res.id], test_session_factory)
            await _cleanup_operating_hours([oh.id], test_session_factory)


# ---------------------------------------------------------------------------
# Filters: from_time / to_time / surface
# ---------------------------------------------------------------------------


class TestFilters:
    async def test_from_time_to_time_clamp_window(
        self, client, staff_headers, player_headers, club, test_session_factory
    ):
        await _make_court(client, staff_headers, club, name="C1")
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="07:00", close_time="22:00")
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={
                    "start_date": MON, "end_date": MON,
                    "from_time": "11:30", "to_time": "13:00",
                },
                headers=player_headers,
            )
            assert resp.status_code == 200
            slots = resp.json()["days"][0]["slots"]
            assert [s["start_time"] for s in slots] == ["11:30"]
            assert slots[0]["end_time"] == "13:00"
        finally:
            await _cleanup_operating_hours([oh.id], test_session_factory)

    async def test_surface_filter_restricts_courts(
        self, client, staff_headers, player_headers, club, test_session_factory
    ):
        indoor = await _make_court(client, staff_headers, club, name="Indoor", surface_type="indoor")
        await _make_court(client, staff_headers, club, name="Outdoor", surface_type="outdoor")
        await _set_club_booking_window(club.id, test_session_factory)
        oh = await _seed_operating_hours(club.id, test_session_factory, 0,
                                          open_time="09:00", close_time="10:30")
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": MON, "surface": "indoor"},
                headers=player_headers,
            )
            assert resp.status_code == 200
            body = resp.json()
            # Only indoor court in the courts list and in availability
            assert [c["name"] for c in body["courts"]] == ["Indoor"]
            slot = body["days"][0]["slots"][0]
            assert [c["court_id"] for c in slot["available_courts"]] == [indoor]
        finally:
            await _cleanup_operating_hours([oh.id], test_session_factory)


# ---------------------------------------------------------------------------
# Multi-day, paging, and cursor behaviour
# ---------------------------------------------------------------------------


class TestPaging:
    async def test_end_date_returns_multiple_days(
        self, client, staff_headers, player_headers, club, test_session_factory
    ):
        await _make_court(client, staff_headers, club, name="C1")
        await _set_club_booking_window(club.id, test_session_factory)
        # Mon (dow=0) and Tue (dow=1)
        oh_ids = []
        for dow in (0, 1):
            oh = await _seed_operating_hours(club.id, test_session_factory, dow,
                                              open_time="09:00", close_time="10:30")
            oh_ids.append(oh.id)
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON, "end_date": TUE},
                headers=player_headers,
            )
            assert resp.status_code == 200
            body = resp.json()
            assert [d["date"] for d in body["days"]] == [MON, TUE]
            assert body["next_cursor"] is None
        finally:
            await _cleanup_operating_hours(oh_ids, test_session_factory)

    async def test_no_end_date_caps_at_40_and_returns_cursor(
        self, client, staff_headers, player_headers, club, test_session_factory
    ):
        await _make_court(client, staff_headers, club, name="C1")
        await _set_club_booking_window(club.id, test_session_factory)
        # Wide hours all week → 10 slots/day × 4 days = 40, day 5 produces cursor
        oh_ids = await _seed_operating_hours_all_week(
            club.id, test_session_factory, open_time="07:00", close_time="22:00"
        )
        try:
            resp = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON},
                headers=player_headers,
            )
            assert resp.status_code == 200
            body = resp.json()
            total_slots = sum(len(d["slots"]) for d in body["days"])
            assert total_slots == 40
            assert body["next_cursor"] is not None
            # Cursor points at the next slot we would have produced: Fri 2030-01-11 07:00
            assert body["next_cursor"]["date"] == "2030-01-11"
            assert body["next_cursor"]["from_time"] == "07:00"
        finally:
            await _cleanup_operating_hours(oh_ids, test_session_factory)

    async def test_cursor_round_trip_continues_from_where_we_left_off(
        self, client, staff_headers, player_headers, club, test_session_factory
    ):
        await _make_court(client, staff_headers, club, name="C1")
        await _set_club_booking_window(club.id, test_session_factory)
        oh_ids = await _seed_operating_hours_all_week(
            club.id, test_session_factory, open_time="07:00", close_time="22:00"
        )
        try:
            r1 = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={"start_date": MON},
                headers=player_headers,
            )
            cursor = r1.json()["next_cursor"]
            r2 = await client.get(
                f"/api/v1/clubs/{club.id}/availability",
                params={
                    "start_date": cursor["date"],
                    "from_time": cursor["from_time"],
                },
                headers=player_headers,
            )
            assert r2.status_code == 200
            day0 = r2.json()["days"][0]
            # First slot of the second page starts at the cursor's date+time
            assert day0["date"] == cursor["date"]
            assert day0["slots"][0]["start_time"] == cursor["from_time"]
        finally:
            await _cleanup_operating_hours(oh_ids, test_session_factory)


# ---------------------------------------------------------------------------
# Auth, tenant isolation, validation
# ---------------------------------------------------------------------------


class TestAuthAndValidation:
    async def test_unauthenticated_returns_403(self, client, club, tenant):
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/availability",
            params={"start_date": MON, "end_date": MON},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 403

    async def test_unknown_club_returns_404(self, client, player_headers):
        resp = await client.get(
            f"/api/v1/clubs/{uuid.uuid4()}/availability",
            params={"start_date": MON, "end_date": MON},
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_other_tenant_club_returns_404(
        self, client, player_headers, plan, test_session_factory
    ):
        from app.db.models.club import Club as ClubModel
        from app.db.models.tenant import Tenant as TenantModel

        subdomain = f"avail-other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(
                name="Other", trading_name="Other",
                player_subdomain=subdomain, staff_subdomain=f"{subdomain}-staff",
                plan_id=plan.id, is_active=True,
            )
            session.add(t2)
            await session.flush()
            other_club = ClubModel(tenant_id=t2.id, name="Other Club", currency="GBP")
            session.add(other_club)
            await session.commit()
            other_club_id, t2_id = other_club.id, t2.id
        try:
            resp = await client.get(
                f"/api/v1/clubs/{other_club_id}/availability",
                params={"start_date": MON, "end_date": MON},
                headers=player_headers,
            )
            # The token's tenant doesn't own that club → 404 from the service
            assert resp.status_code == 404
        finally:
            async with test_session_factory() as session:
                await session.execute(sql_delete(ClubModel).where(ClubModel.id == other_club_id))
                obj = await session.get(TenantModel, t2_id)
                if obj:
                    await session.delete(obj)
                await session.commit()

    async def test_end_date_before_start_date_returns_422(
        self, client, player_headers, club
    ):
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/availability",
            params={"start_date": TUE, "end_date": MON},
            headers=player_headers,
        )
        assert resp.status_code == 422

    async def test_bad_time_format_returns_422(self, client, player_headers, club):
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/availability",
            params={"start_date": MON, "end_date": MON, "from_time": "9am"},
            headers=player_headers,
        )
        assert resp.status_code == 422

    async def test_from_time_not_before_to_time_returns_422(
        self, client, player_headers, club
    ):
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/availability",
            params={
                "start_date": MON, "end_date": MON,
                "from_time": "13:00", "to_time": "11:00",
            },
            headers=player_headers,
        )
        assert resp.status_code == 422

    async def test_invalid_surface_returns_422(self, client, player_headers, club):
        resp = await client.get(
            f"/api/v1/clubs/{club.id}/availability",
            params={"start_date": MON, "end_date": MON, "surface": "carpet"},
            headers=player_headers,
        )
        assert resp.status_code == 422
