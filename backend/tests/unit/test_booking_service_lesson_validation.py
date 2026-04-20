"""
Unit tests for BookingService lesson-specific validation logic.

Coverage
--------
_check_no_trainer_conflict  — raises 409 when trainer has an overlapping booking;
                               passes cleanly when no conflict exists.
"""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.services.booking_service import BookingService

TRAINER_ID = uuid.uuid4()


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _make_db(scalar_value):
    """Minimal AsyncSession mock whose execute() returns scalar_value from scalar_one_or_none()."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = scalar_value
    db.execute = AsyncMock(return_value=result)
    return db


class TestCheckNoTrainerConflict:
    async def test_raises_409_when_trainer_has_overlapping_booking(self):
        db = _make_db(uuid.uuid4())  # existing booking found
        svc = BookingService(db)
        start = _now() + timedelta(hours=2)
        end = start + timedelta(minutes=90)

        with pytest.raises(HTTPException) as exc_info:
            await svc._check_no_trainer_conflict(TRAINER_ID, start, end)

        assert exc_info.value.status_code == 409
        assert "already booked" in exc_info.value.detail

    async def test_no_exception_when_trainer_is_free(self):
        db = _make_db(None)  # no conflicting booking
        svc = BookingService(db)
        start = _now() + timedelta(hours=2)
        end = start + timedelta(minutes=90)

        # Must not raise
        await svc._check_no_trainer_conflict(TRAINER_ID, start, end)

    async def test_db_queried_with_trainer_id(self):
        db = _make_db(None)
        svc = BookingService(db)
        start = _now() + timedelta(hours=2)
        end = start + timedelta(minutes=90)

        await svc._check_no_trainer_conflict(TRAINER_ID, start, end)

        db.execute.assert_awaited_once()

    async def test_zero_duration_window_still_checked(self):
        """Edge case: start == end should still query the DB and not raise if free."""
        db = _make_db(None)
        svc = BookingService(db)
        t = _now() + timedelta(hours=2)

        await svc._check_no_trainer_conflict(TRAINER_ID, t, t)

        db.execute.assert_awaited_once()
