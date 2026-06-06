"""
Integration tests for the UTC-everywhere datetime convention.

See CLAUDE.md → "Datetime & Timezone Convention". These tests exercise the
operational booking/availability path with **non-UTC** clubs (the default test
club is pinned to UTC in conftest), proving:

- availability slots are rendered in club-local wall-clock time even though
  instants are stored as true UTC,
- the slot grid + operating-hours validation are anchored to club-local time
  and DST-correct,
- naive (offset-less) datetimes are rejected at the schema layer (422).
"""

from datetime import date, datetime, time, timezone
from decimal import Decimal

import pytest_asyncio
from sqlalchemy import delete as sql_delete, select

from app.db.models.booking import Booking, BookingPlayer, BookingStatus, BookingType
from app.db.models.club import Club, OperatingHours, PricingRule
from app.db.models.court import Court

# Jan 7 2030 is a Monday (day_of_week=0); Europe/Madrid is CET (UTC+1) then.
WINTER_DATE = date(2030, 1, 7)
# Jul 1 2030; Europe/Madrid is CEST (UTC+2) then (DST in effect).
SUMMER_DATE = date(2030, 7, 1)
MADRID = "Europe/Madrid"


# ---------------------------------------------------------------------------
# Cleanup — remove bookings created/seeded during a test before the shared
# `club` fixture teardown (which deletes courts) runs, to avoid FK conflicts.
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(autouse=True)
async def _cleanup_bookings(club, staff, player, test_session_factory):
    # Depend on staff + player so this finalizer runs before their user rows are
    # deleted — seeded/created bookings reference users via created_by_user_id.
    yield
    async with test_session_factory() as session:
        court_ids = (
            await session.execute(select(Court.id).where(Court.club_id == club.id))
        ).scalars().all()
        if court_ids:
            booking_ids = (
                await session.execute(select(Booking.id).where(Booking.court_id.in_(court_ids)))
            ).scalars().all()
            if booking_ids:
                await session.execute(
                    sql_delete(BookingPlayer).where(BookingPlayer.booking_id.in_(booking_ids))
                )
                await session.execute(sql_delete(Booking).where(Booking.id.in_(booking_ids)))
        await session.commit()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _configure_club(club_id, session_factory, tz, advance_days=9999, notice_hours=0):
    async with session_factory() as session:
        c = await session.get(Club, club_id)
        c.timezone = tz
        c.max_advance_booking_days = advance_days
        c.min_booking_notice_hours = notice_hours
        await session.commit()


async def _seed_court(club_id, session_factory, name="TZ Court"):
    async with session_factory() as session:
        court = Court(club_id=club_id, name=name, surface_type="indoor", is_active=True)
        session.add(court)
        await session.commit()
        await session.refresh(court)
    return court


async def _seed_oh(club_id, session_factory, day_of_week, open_time, close_time):
    async with session_factory() as session:
        oh = OperatingHours(
            club_id=club_id,
            day_of_week=day_of_week,
            open_time=open_time,
            close_time=close_time,
        )
        session.add(oh)
        await session.commit()
        await session.refresh(oh)
    return oh


async def _seed_all_day_pricing(club_id, session_factory, day_of_week):
    async with session_factory() as session:
        rule = PricingRule(
            club_id=club_id,
            label="standard",
            day_of_week=day_of_week,
            start_time=time(0, 0),
            end_time=time(23, 59),
            is_active=True,
            price_per_slot=Decimal("20.00"),
        )
        session.add(rule)
        await session.commit()


async def _seed_confirmed_booking(court_id, club_id, user_id, start_utc, end_utc, session_factory):
    async with session_factory() as session:
        b = Booking(
            club_id=club_id,
            court_id=court_id,
            booking_type=BookingType.regular,
            status=BookingStatus.confirmed,
            start_datetime=start_utc,
            end_datetime=end_utc,
            created_by_user_id=user_id,
        )
        session.add(b)
        await session.commit()
        await session.refresh(b)
    return b


def _booking_payload(club_id, court_id, start, **kwargs):
    return {
        "club_id": str(club_id),
        "court_id": str(court_id),
        "start_datetime": start,  # caller controls aware/naive
        "booking_type": "regular",
        "is_open_game": False,
        "max_players": 4,
        **kwargs,
    }


# ---------------------------------------------------------------------------
# Availability rendering + local grid
# ---------------------------------------------------------------------------


class TestAvailabilityTimezone:
    async def test_slots_rendered_in_club_local_time(
        self, client, club, tenant, test_session_factory
    ):
        """A Madrid club open 09:00–12:00 local renders local wall-clock times,
        even though the slot instants are stored/compared in UTC."""
        await _configure_club(club.id, test_session_factory, MADRID)
        court = await _seed_court(club.id, test_session_factory)
        await _seed_oh(club.id, test_session_factory, WINTER_DATE.weekday(), time(9, 0), time(12, 0))

        resp = await client.get(
            f"/api/v1/courts/{court.id}/availability",
            params={"date": WINTER_DATE.isoformat()},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200, resp.text
        slots = resp.json()["slots"]
        # 09:00–12:00 with default 90-min slots → 09:00–10:30, 10:30–12:00 (LOCAL)
        assert [s["start_time"] for s in slots] == ["09:00", "10:30"]
        assert [s["end_time"] for s in slots] == ["10:30", "12:00"]

    async def test_grid_anchored_to_local_open_winter(
        self, client, club, tenant, staff, test_session_factory
    ):
        """A booking stored at 08:00Z (== 09:00 Madrid CET) must mark the first
        local slot unavailable — proving 09:00 local maps to 08:00Z."""
        await _configure_club(club.id, test_session_factory, MADRID)
        court = await _seed_court(club.id, test_session_factory)
        await _seed_oh(club.id, test_session_factory, WINTER_DATE.weekday(), time(9, 0), time(12, 0))
        # 09:00 Madrid CET == 08:00 UTC
        start_utc = datetime(2030, 1, 7, 8, 0, tzinfo=timezone.utc)
        end_utc = datetime(2030, 1, 7, 9, 30, tzinfo=timezone.utc)
        await _seed_confirmed_booking(court.id, club.id, staff.id, start_utc, end_utc, test_session_factory)

        resp = await client.get(
            f"/api/v1/courts/{court.id}/availability",
            params={"date": WINTER_DATE.isoformat()},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200, resp.text
        slots = resp.json()["slots"]
        assert slots[0]["start_time"] == "09:00"
        assert slots[0]["is_available"] is False
        assert slots[1]["start_time"] == "10:30"
        assert slots[1]["is_available"] is True

    async def test_grid_dst_summer_offset(
        self, client, club, tenant, staff, test_session_factory
    ):
        """During CEST (UTC+2), 09:00 Madrid local == 07:00Z. A booking at 07:00Z
        must block the first local slot — proving the DST offset is applied."""
        await _configure_club(club.id, test_session_factory, MADRID)
        court = await _seed_court(club.id, test_session_factory)
        await _seed_oh(club.id, test_session_factory, SUMMER_DATE.weekday(), time(9, 0), time(12, 0))
        # 09:00 Madrid CEST == 07:00 UTC
        start_utc = datetime(2030, 7, 1, 7, 0, tzinfo=timezone.utc)
        end_utc = datetime(2030, 7, 1, 8, 30, tzinfo=timezone.utc)
        await _seed_confirmed_booking(court.id, club.id, staff.id, start_utc, end_utc, test_session_factory)

        resp = await client.get(
            f"/api/v1/courts/{court.id}/availability",
            params={"date": SUMMER_DATE.isoformat()},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 200, resp.text
        slots = resp.json()["slots"]
        assert slots[0]["start_time"] == "09:00"
        assert slots[0]["is_available"] is False
        assert slots[1]["is_available"] is True


# ---------------------------------------------------------------------------
# Booking create: schema contract + local operating-hours validation
# ---------------------------------------------------------------------------


class TestBookingCreateTimezone:
    async def test_naive_datetime_rejected(
        self, client, player_headers, club, test_session_factory
    ):
        """A start_datetime without an offset must be rejected at the schema
        layer (422), not silently treated as UTC."""
        court = await _seed_court(club.id, test_session_factory)
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court.id, "2030-01-07T09:00:00"),  # naive
            headers=player_headers,
        )
        assert resp.status_code == 422, resp.text

    async def test_within_local_hours_succeeds(
        self, client, player_headers, club, test_session_factory
    ):
        """09:00 Madrid local (08:00Z winter) is the club's opening slot → 201."""
        await _configure_club(club.id, test_session_factory, MADRID)
        court = await _seed_court(club.id, test_session_factory)
        await _seed_oh(club.id, test_session_factory, WINTER_DATE.weekday(), time(9, 0), time(21, 0))
        await _seed_all_day_pricing(club.id, test_session_factory, WINTER_DATE.weekday())

        start = datetime(2030, 1, 7, 8, 0, tzinfo=timezone.utc)  # 09:00 Madrid CET
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court.id, start.isoformat()),
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text

    async def test_before_local_open_rejected(
        self, client, player_headers, club, test_session_factory
    ):
        """07:00 Madrid local (06:00Z winter) is before the 09:00 local open →
        422 'outside club operating hours', even though 06:00Z would have been
        'inside hours' under the old local==UTC assumption."""
        await _configure_club(club.id, test_session_factory, MADRID)
        court = await _seed_court(club.id, test_session_factory)
        await _seed_oh(club.id, test_session_factory, WINTER_DATE.weekday(), time(9, 0), time(21, 0))
        await _seed_all_day_pricing(club.id, test_session_factory, WINTER_DATE.weekday())

        start = datetime(2030, 1, 7, 6, 0, tzinfo=timezone.utc)  # 07:00 Madrid CET
        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court.id, start.isoformat()),
            headers=player_headers,
        )
        assert resp.status_code == 422, resp.text
        assert "operating hours" in resp.text.lower()
