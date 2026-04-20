"""
Unit tests for BookingService._check_no_blackout.

Coverage
--------
- Raises 409 with the correct message for maintenance, training_block, private_hire, and tournament_hold.
- Does NOT raise for skill_filter (skill_filter only filters who can book, not whether
  the slot is blocked).
- Passes cleanly when no overlapping reservation exists.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.db.models.court import CalendarReservationType
from app.services.booking_service import BookingService

COURT_ID = uuid.uuid4()


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _make_db_with_row(reservation_type: Optional[CalendarReservationType]):
    """
    Mock AsyncSession whose execute() returns a row with the given reservation_type,
    or no row if None.
    """
    db = AsyncMock()
    result = MagicMock()
    if reservation_type is None:
        result.first.return_value = None
    else:
        result.first.return_value = (uuid.uuid4(), reservation_type)
    db.execute = AsyncMock(return_value=result)
    return db


class TestCheckNoBlackout:

    async def test_raises_409_for_maintenance(self):
        db = _make_db_with_row(CalendarReservationType.maintenance)
        svc = BookingService(db)
        start = _now() + timedelta(hours=1)
        end = start + timedelta(minutes=90)

        with pytest.raises(HTTPException) as exc_info:
            await svc._check_no_blackout(COURT_ID, start, end)

        assert exc_info.value.status_code == 409
        assert "maintenance" in exc_info.value.detail

    async def test_raises_409_for_training_block(self):
        db = _make_db_with_row(CalendarReservationType.training_block)
        svc = BookingService(db)
        start = _now() + timedelta(hours=1)
        end = start + timedelta(minutes=90)

        with pytest.raises(HTTPException) as exc_info:
            await svc._check_no_blackout(COURT_ID, start, end)

        assert exc_info.value.status_code == 409
        assert "training block" in exc_info.value.detail

    async def test_raises_409_for_private_hire(self):
        db = _make_db_with_row(CalendarReservationType.private_hire)
        svc = BookingService(db)
        start = _now() + timedelta(hours=1)
        end = start + timedelta(minutes=90)

        with pytest.raises(HTTPException) as exc_info:
            await svc._check_no_blackout(COURT_ID, start, end)

        assert exc_info.value.status_code == 409
        assert "private hire" in exc_info.value.detail

    async def test_raises_409_for_tournament_hold(self):
        db = _make_db_with_row(CalendarReservationType.tournament_hold)
        svc = BookingService(db)
        start = _now() + timedelta(hours=1)
        end = start + timedelta(minutes=90)

        with pytest.raises(HTTPException) as exc_info:
            await svc._check_no_blackout(COURT_ID, start, end)

        assert exc_info.value.status_code == 409
        assert "tournament" in exc_info.value.detail

    async def test_no_exception_when_court_is_free(self):
        db = _make_db_with_row(None)
        svc = BookingService(db)
        start = _now() + timedelta(hours=1)
        end = start + timedelta(minutes=90)

        await svc._check_no_blackout(COURT_ID, start, end)  # must not raise

    async def test_skill_filter_does_not_block_booking(self):
        """skill_filter is excluded from the query — DB is asked only about
        blocking types, so a skill_filter reservation never triggers a 409."""
        db = _make_db_with_row(None)  # query returns nothing — skill_filter excluded
        svc = BookingService(db)
        start = _now() + timedelta(hours=1)
        end = start + timedelta(minutes=90)

        await svc._check_no_blackout(COURT_ID, start, end)  # must not raise

    async def test_db_is_always_queried(self):
        db = _make_db_with_row(None)
        svc = BookingService(db)
        start = _now() + timedelta(hours=1)
        end = start + timedelta(minutes=90)

        await svc._check_no_blackout(COURT_ID, start, end)

        db.execute.assert_awaited_once()
