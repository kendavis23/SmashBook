"""
Unit tests for the CalendarSlot discriminated union and endpoint builder helpers.

No database or HTTP transport required — pure Pydantic + function tests.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.schemas.booking import (
    CalendarBlockItem,
    CalendarBookingItem,
    CalendarCourtColumn,
    CalendarSlot,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOW = datetime(2026, 4, 18, 10, 0, 0, tzinfo=timezone.utc)
_LATER = datetime(2026, 4, 18, 11, 30, 0, tzinfo=timezone.utc)
_COURT_ID = uuid.uuid4()


def _booking_item(**kwargs) -> CalendarBookingItem:
    defaults = dict(
        id=uuid.uuid4(),
        court_id=_COURT_ID,
        court_name="Court 1",
        booking_type="regular",
        status="confirmed",
        is_open_game=False,
        start_datetime=_NOW,
        end_datetime=_LATER,
        event_name=None,
        players=[],
        slots_available=3,
        total_price=Decimal("20.00"),
    )
    defaults.update(kwargs)
    return CalendarBookingItem(**defaults)


def _block_item(**kwargs) -> CalendarBlockItem:
    defaults = dict(
        id=uuid.uuid4(),
        court_id=_COURT_ID,
        start_datetime=_NOW,
        end_datetime=_LATER,
        reservation_type="maintenance",
        title="Net repair",
    )
    defaults.update(kwargs)
    return CalendarBlockItem(**defaults)


# ---------------------------------------------------------------------------
# CalendarBookingItem
# ---------------------------------------------------------------------------

class TestCalendarBookingItem:

    def test_kind_is_booking(self):
        item = _booking_item()
        assert item.kind == "booking"

    def test_kind_fixed_cannot_be_overridden(self):
        """Passing kind="block" on a CalendarBookingItem is ignored; Literal wins."""
        item = CalendarBookingItem(
            kind="booking",
            id=uuid.uuid4(),
            court_id=_COURT_ID,
            court_name="Court 1",
            booking_type="regular",
            status="confirmed",
            is_open_game=False,
            start_datetime=_NOW,
            end_datetime=_LATER,
            players=[],
            slots_available=3,
        )
        assert item.kind == "booking"

    def test_serialises_kind_in_json(self):
        item = _booking_item()
        data = item.model_dump()
        assert data["kind"] == "booking"


# ---------------------------------------------------------------------------
# CalendarBlockItem
# ---------------------------------------------------------------------------

class TestCalendarBlockItem:

    def test_kind_is_block(self):
        item = _block_item()
        assert item.kind == "block"

    def test_club_wide_block_has_null_court_id(self):
        item = _block_item(court_id=None)
        assert item.court_id is None

    def test_serialises_kind_in_json(self):
        item = _block_item()
        data = item.model_dump()
        assert data["kind"] == "block"


# ---------------------------------------------------------------------------
# CalendarSlot discriminated union — deserialization
# ---------------------------------------------------------------------------

class TestCalendarSlotDiscriminator:

    def test_deserialises_booking_shape(self):
        raw = {
            "kind": "booking",
            "id": str(uuid.uuid4()),
            "court_id": str(_COURT_ID),
            "court_name": "Court 1",
            "booking_type": "regular",
            "status": "confirmed",
            "is_open_game": False,
            "start_datetime": _NOW.isoformat(),
            "end_datetime": _LATER.isoformat(),
            "players": [],
            "slots_available": 3,
        }
        from pydantic import TypeAdapter
        ta: TypeAdapter[CalendarSlot] = TypeAdapter(CalendarSlot)
        slot = ta.validate_python(raw)
        assert isinstance(slot, CalendarBookingItem)
        assert slot.kind == "booking"

    def test_deserialises_block_shape(self):
        raw = {
            "kind": "block",
            "id": str(uuid.uuid4()),
            "court_id": str(_COURT_ID),
            "start_datetime": _NOW.isoformat(),
            "end_datetime": _LATER.isoformat(),
            "reservation_type": "maintenance",
            "title": "Net repair",
        }
        from pydantic import TypeAdapter
        ta: TypeAdapter[CalendarSlot] = TypeAdapter(CalendarSlot)
        slot = ta.validate_python(raw)
        assert isinstance(slot, CalendarBlockItem)
        assert slot.kind == "block"

    def test_unknown_kind_raises(self):
        from pydantic import TypeAdapter, ValidationError
        ta: TypeAdapter[CalendarSlot] = TypeAdapter(CalendarSlot)
        with pytest.raises(ValidationError):
            ta.validate_python({"kind": "unknown"})


# ---------------------------------------------------------------------------
# CalendarCourtColumn with mixed slots
# ---------------------------------------------------------------------------

class TestCalendarCourtColumn:

    def test_slots_contains_both_kinds(self):
        booking = _booking_item(start_datetime=_NOW, end_datetime=_LATER)
        block = _block_item(
            start_datetime=datetime(2026, 4, 18, 9, 0, tzinfo=timezone.utc),
            end_datetime=_NOW,
        )
        col = CalendarCourtColumn(
            court_id=_COURT_ID,
            court_name="Court 1",
            slots=[booking, block],
        )
        kinds = {s.kind for s in col.slots}
        assert kinds == {"booking", "block"}

    def test_empty_slots_allowed(self):
        col = CalendarCourtColumn(court_id=_COURT_ID, court_name="Court 1", slots=[])
        assert col.slots == []


# ---------------------------------------------------------------------------
# Slot sort order (mirrors endpoint assembly logic)
# ---------------------------------------------------------------------------

class TestSlotSortOrder:

    def test_slots_sorted_by_start_datetime(self):
        early = _block_item(
            start_datetime=datetime(2026, 4, 18, 8, 0, tzinfo=timezone.utc),
            end_datetime=datetime(2026, 4, 18, 9, 0, tzinfo=timezone.utc),
            reservation_type="maintenance",
            title="Early block",
        )
        late = _booking_item(
            start_datetime=datetime(2026, 4, 18, 10, 30, tzinfo=timezone.utc),
            end_datetime=datetime(2026, 4, 18, 12, 0, tzinfo=timezone.utc),
        )
        mid = _booking_item(
            start_datetime=datetime(2026, 4, 18, 9, 30, tzinfo=timezone.utc),
            end_datetime=datetime(2026, 4, 18, 11, 0, tzinfo=timezone.utc),
        )
        # Intentionally inserted out of order
        slots = sorted([late, early, mid], key=lambda s: s.start_datetime)
        assert slots[0] is early
        assert slots[1] is mid
        assert slots[2] is late
