"""Unit tests for the pure court-utilisation computation core (G7).

No database or fixtures — exercises ``compute_court_day_snapshots`` directly,
which is why the computation is kept separate from the worker's I/O.
"""
from datetime import date, datetime, time
from decimal import Decimal
from zoneinfo import ZoneInfo

from app.analytics.services.court_utilisation_service import (
    BookingInput,
    OperatingWindow,
    PricingWindow,
    ReservationInput,
    compute_court_day_snapshots,
)
from app.db.models.booking import BookingStatus

LONDON = ZoneInfo("Europe/London")
UTC = ZoneInfo("UTC")
MONDAY = date(2026, 6, 1)  # a Monday → weekday() == 0


def _rows(**overrides):
    params = dict(
        snapshot_date=MONDAY,
        tz=LONDON,
        booking_duration_minutes=90,
        windows=[OperatingWindow(time(9, 0), time(12, 0))],  # 2 × 90-min slots
        pricing=[PricingWindow(0, time(0, 0), time(23, 59), Decimal("20"))],
        bookings=[],
        reservations=[],
    )
    params.update(overrides)
    return compute_court_day_snapshots(**params)


def _daily(rows):
    return next(r for r in rows if r.hour_of_day is None)


def _hour(rows, h):
    return next(r for r in rows if r.hour_of_day == h)


def test_closed_day_returns_no_rows():
    assert _rows(windows=[]) == []


def test_empty_day_full_denominator_zero_utilisation():
    rows = _rows()
    # Two slots anchored to hours 9 and 10, plus the daily-rollup row.
    assert {r.hour_of_day for r in rows} == {9, 10, None}
    daily = _daily(rows)
    assert daily.total_slots == 2
    assert daily.booked_slots == 0
    assert daily.utilisation_pct == Decimal("0.00")
    assert daily.revenue_potential == Decimal("40")  # 2 slots × £20
    assert daily.revenue_actual == Decimal("0")
    assert daily.avg_booking_lead_time_h is None


def test_one_booking_is_slot_anchored_to_its_start_hour():
    booking = BookingInput(
        start_local=datetime(2026, 6, 1, 9, 0, tzinfo=LONDON),
        status=BookingStatus.confirmed,
        total_price=Decimal("20"),
        created_at=datetime(2026, 6, 1, 6, 0, tzinfo=UTC),  # 09:00 BST == 08:00 UTC
    )
    rows = _rows(bookings=[booking])

    assert _hour(rows, 9).booked_slots == 1
    assert _hour(rows, 9).utilisation_pct == Decimal("100.00")
    assert _hour(rows, 10).booked_slots == 0  # not double-counted into a later slot

    daily = _daily(rows)
    assert daily.booked_slots == 1
    assert daily.total_slots == 2
    assert daily.utilisation_pct == Decimal("50.00")
    assert daily.revenue_actual == Decimal("20")
    assert daily.avg_booking_lead_time_h == Decimal("2.0")  # 08:00 − 06:00 UTC


def test_cancelled_and_pending_bookings_do_not_count():
    for ignored in (BookingStatus.cancelled, BookingStatus.pending):
        booking = BookingInput(
            start_local=datetime(2026, 6, 1, 9, 0, tzinfo=LONDON),
            status=ignored,
            total_price=Decimal("20"),
            created_at=None,
        )
        assert _daily(_rows(bookings=[booking])).booked_slots == 0


def test_reservation_removes_slot_from_denominator():
    reservation = ReservationInput(
        start_local=datetime(2026, 6, 1, 10, 30, tzinfo=LONDON),
        end_local=datetime(2026, 6, 1, 12, 0, tzinfo=LONDON),  # covers 2nd slot
    )
    rows = _rows(reservations=[reservation])
    daily = _daily(rows)
    assert daily.total_slots == 1  # blocked slot dropped, not counted
    assert daily.revenue_potential == Decimal("20")  # only the one bookable slot
    assert {r.hour_of_day for r in rows} == {9, None}
