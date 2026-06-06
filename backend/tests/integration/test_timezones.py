"""
Integration tests for the UTC-everywhere datetime convention.

See CLAUDE.md → "Datetime & Timezone Convention". These tests exercise the
operational booking/availability path with **non-UTC** clubs (the default test
club is pinned to UTC in conftest), proving:

- availability slots are rendered in club-local wall-clock time even though
  instants are stored as true UTC,
- the slot grid + operating-hours validation are anchored to club-local time
  and DST-correct,
- naive (offset-less) datetimes are accepted and interpreted as club-local
  wall-clock (DST-correct), while offset-bearing values are still honored,
- non-club-scoped inputs (billing anchors) coerce naive values to UTC.
"""

from datetime import date, datetime, time, timedelta, timezone
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
    async def _stored_start(self, court_id, session_factory):
        async with session_factory() as session:
            return (
                await session.execute(
                    select(Booking.start_datetime).where(Booking.court_id == court_id)
                )
            ).scalar_one()

    async def test_naive_datetime_interpreted_as_club_local_winter(
        self, client, player_headers, club, test_session_factory
    ):
        """A naive start_datetime is interpreted as club-local wall-clock, not
        rejected: 09:00 at a Madrid club in winter (CET) stores 08:00Z."""
        await _configure_club(club.id, test_session_factory, MADRID)
        court = await _seed_court(club.id, test_session_factory)
        await _seed_oh(club.id, test_session_factory, WINTER_DATE.weekday(), time(9, 0), time(21, 0))
        await _seed_all_day_pricing(club.id, test_session_factory, WINTER_DATE.weekday())

        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court.id, "2030-01-07T09:00:00"),  # naive
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text
        stored = await self._stored_start(court.id, test_session_factory)
        assert stored.astimezone(timezone.utc) == datetime(2030, 1, 7, 8, 0, tzinfo=timezone.utc)

    async def test_naive_datetime_interpreted_as_club_local_summer(
        self, client, player_headers, club, test_session_factory
    ):
        """DST-correct: a naive 09:00 at a Madrid club in summer (CEST) stores
        07:00Z, proving the offset is resolved from the wall-clock date."""
        await _configure_club(club.id, test_session_factory, MADRID)
        court = await _seed_court(club.id, test_session_factory)
        await _seed_oh(club.id, test_session_factory, SUMMER_DATE.weekday(), time(9, 0), time(21, 0))
        await _seed_all_day_pricing(club.id, test_session_factory, SUMMER_DATE.weekday())

        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court.id, "2030-07-01T09:00:00"),  # naive
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text
        stored = await self._stored_start(court.id, test_session_factory)
        assert stored.astimezone(timezone.utc) == datetime(2030, 7, 1, 7, 0, tzinfo=timezone.utc)

    async def test_offset_bearing_datetime_honored_not_relocalized(
        self, client, player_headers, club, test_session_factory
    ):
        """Hybrid: an explicit offset is honored as-is (converted from its own
        offset), never reinterpreted in the club's zone. 09:30+09:00 == 00:30Z
        (01:30 Madrid CET), regardless of the club being Madrid."""
        await _configure_club(club.id, test_session_factory, MADRID)
        court = await _seed_court(club.id, test_session_factory)
        # Open from 00:00 local so 01:30 Madrid is on a 90-min slot boundary.
        await _seed_oh(club.id, test_session_factory, WINTER_DATE.weekday(), time(0, 0), time(23, 59))
        await _seed_all_day_pricing(club.id, test_session_factory, WINTER_DATE.weekday())

        resp = await client.post(
            "/api/v1/bookings",
            json=_booking_payload(club.id, court.id, "2030-01-07T09:30:00+09:00"),
            headers=player_headers,
        )
        assert resp.status_code == 201, resp.text
        stored = await self._stored_start(court.id, test_session_factory)
        assert stored.astimezone(timezone.utc) == datetime(2030, 1, 7, 0, 30, tzinfo=timezone.utc)

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


# ---------------------------------------------------------------------------
# Staff calendar view: existing bookings + time-slot grid rendered club-local
# ---------------------------------------------------------------------------


class TestCalendarTimezone:
    async def test_booking_rendered_in_club_local_time(
        self, client, club, tenant, staff, staff_headers, test_session_factory
    ):
        """A booking stored at 06:00Z must surface on the staff calendar as
        08:00 club-local (Madrid CEST, UTC+2) — not 06:00. Regression test for
        the calendar returning raw UTC instants instead of club-local time."""
        await _configure_club(club.id, test_session_factory, MADRID)
        court = await _seed_court(club.id, test_session_factory)
        await _seed_oh(club.id, test_session_factory, SUMMER_DATE.weekday(), time(9, 0), time(21, 0))
        # 06:00Z == 08:00 Madrid CEST
        start_utc = datetime(2030, 7, 1, 6, 0, tzinfo=timezone.utc)
        end_utc = datetime(2030, 7, 1, 7, 30, tzinfo=timezone.utc)
        await _seed_confirmed_booking(court.id, club.id, staff.id, start_utc, end_utc, test_session_factory)

        resp = await client.get(
            "/api/v1/bookings/calendar",
            params={"club_id": str(club.id), "view": "day", "anchor_date": SUMMER_DATE.isoformat()},
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        days = resp.json()["days"]
        assert len(days) == 1
        court_col = next(c for c in days[0]["courts"] if c["court_id"] == str(court.id))
        booking_items = [s for s in court_col["slots"] if s["kind"] == "booking"]
        assert len(booking_items) == 1
        start = datetime.fromisoformat(booking_items[0]["start_datetime"])
        assert start.hour == 8  # local wall-clock, not the stored 06:00Z
        assert start.utcoffset() == timezone(timedelta(hours=2)).utcoffset(None)

    async def test_time_slot_grid_anchored_to_local_open(
        self, client, club, tenant, staff_headers, test_session_factory
    ):
        """The calendar time-slot grid starts at the club-local open time, not
        the open time misread as UTC."""
        await _configure_club(club.id, test_session_factory, MADRID)
        court = await _seed_court(club.id, test_session_factory)
        await _seed_oh(club.id, test_session_factory, SUMMER_DATE.weekday(), time(9, 0), time(12, 0))

        resp = await client.get(
            "/api/v1/bookings/calendar",
            params={"club_id": str(club.id), "view": "day", "anchor_date": SUMMER_DATE.isoformat()},
            headers=staff_headers,
        )
        assert resp.status_code == 200, resp.text
        court_col = next(
            c for c in resp.json()["days"][0]["courts"] if c["court_id"] == str(court.id)
        )
        time_slots = court_col["time_slots"]
        assert time_slots, "expected operating-hours slots"
        first = datetime.fromisoformat(time_slots[0]["start_datetime"])
        assert first.hour == 9  # 09:00 local (== 07:00Z), not 09:00Z
        assert first.utcoffset() == timezone(timedelta(hours=2)).utcoffset(None)


# ---------------------------------------------------------------------------
# Booking responses (list / detail) rendered club-local
# ---------------------------------------------------------------------------


class TestBookingResponseTimezone:
    async def test_list_and_detail_rendered_in_club_local_time(
        self, client, club, tenant, staff, staff_headers, test_session_factory
    ):
        """GET /bookings and GET /bookings/{id} must render start/end in
        club-local time (08:00 Madrid CEST) rather than the stored 06:00Z."""
        await _configure_club(club.id, test_session_factory, MADRID)
        court = await _seed_court(club.id, test_session_factory)
        start_utc = datetime(2030, 7, 1, 6, 0, tzinfo=timezone.utc)  # 08:00 Madrid CEST
        end_utc = datetime(2030, 7, 1, 7, 30, tzinfo=timezone.utc)
        booking = await _seed_confirmed_booking(
            court.id, club.id, staff.id, start_utc, end_utc, test_session_factory
        )

        list_resp = await client.get(
            "/api/v1/bookings",
            params={"club_id": str(club.id)},
            headers=staff_headers,
        )
        assert list_resp.status_code == 200, list_resp.text
        item = next(b for b in list_resp.json() if b["id"] == str(booking.id))
        start = datetime.fromisoformat(item["start_datetime"])
        assert start.hour == 8
        assert start.utcoffset() == timezone(timedelta(hours=2)).utcoffset(None)

        detail_resp = await client.get(
            f"/api/v1/bookings/{booking.id}",
            params={"club_id": str(club.id)},
            headers=staff_headers,
        )
        assert detail_resp.status_code == 200, detail_resp.text
        assert datetime.fromisoformat(detail_resp.json()["start_datetime"]).hour == 8


# ---------------------------------------------------------------------------
# Non-club-scoped parse-in: billing anchors coerce naive -> UTC (no club zone)
# ---------------------------------------------------------------------------


class TestNonClubScopedParseIn:
    """`subscription_start_date` has no single club zone, so naive values are
    treated as UTC (UtcCoercedDatetime) rather than rejected or localized."""

    def test_naive_subscription_start_date_stamped_utc(self):
        from app.schemas.admin import TenantUpdate

        parsed = TenantUpdate(subscription_start_date="2026-06-01T00:00:00")
        assert parsed.subscription_start_date == datetime(2026, 6, 1, 0, 0, tzinfo=timezone.utc)

    def test_offset_subscription_start_date_converted_to_utc(self):
        from app.schemas.admin import TenantUpdate

        # +02:00 → 22:00Z the previous day; offset honored, then normalized.
        parsed = TenantUpdate(subscription_start_date="2026-06-01T00:00:00+02:00")
        assert parsed.subscription_start_date == datetime(2026, 5, 31, 22, 0, tzinfo=timezone.utc)
