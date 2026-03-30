"""
Unit tests for PlayerService.get_booking_history().

The DB session is mocked — no Postgres required.
Tests focus on the transformation from BookingPlayer ORM rows to PlayerBookingItem
and on the correct query path selected for each filter combination.
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

from app.db.models.booking import BookingStatus, BookingType, InviteStatus, PaymentStatus, PlayerRole
from app.schemas.user import PlayerBookingItem
from app.services.player_service import PlayerService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

USER_ID = uuid.uuid4()
CLUB_ID = uuid.uuid4()
COURT_ID = uuid.uuid4()


def _make_booking_player(
    *,
    status: BookingStatus = BookingStatus.confirmed,
    start_offset_hours: int = 48,
    role: PlayerRole = PlayerRole.player,
    invite_status: InviteStatus = InviteStatus.accepted,
    payment_status: PaymentStatus = PaymentStatus.paid,
    amount_due: Decimal = Decimal("20.00"),
) -> MagicMock:
    """Build a mock BookingPlayer with the nested booking → court structure."""
    now = datetime.now(tz=timezone.utc)
    start = now + timedelta(hours=start_offset_hours)

    court = MagicMock()
    court.id = COURT_ID
    court.name = "Court 1"

    booking = MagicMock()
    booking.id = uuid.uuid4()
    booking.club_id = CLUB_ID
    booking.court_id = COURT_ID
    booking.court = court
    booking.booking_type = BookingType.regular
    booking.status = status
    booking.start_datetime = start
    booking.end_datetime = start + timedelta(minutes=90)

    bp = MagicMock()
    bp.booking = booking
    bp.role = role
    bp.invite_status = invite_status
    bp.payment_status = payment_status
    bp.amount_due = amount_due

    return bp


def _make_db(rows: list) -> AsyncMock:
    """Return a minimal AsyncSession mock that yields the given rows."""
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = rows
    db.execute = AsyncMock(return_value=result)
    return db


# ---------------------------------------------------------------------------
# Tests — field mapping
# ---------------------------------------------------------------------------


class TestGetBookingHistoryMapping:
    async def test_maps_all_fields_correctly(self):
        bp = _make_booking_player(
            status=BookingStatus.confirmed,
            start_offset_hours=24,
            role=PlayerRole.organiser,
            invite_status=InviteStatus.accepted,
            payment_status=PaymentStatus.paid,
            amount_due=Decimal("35.50"),
        )
        svc = PlayerService(_make_db([bp]))

        items = await svc.get_booking_history(USER_ID)

        assert len(items) == 1
        item = items[0]
        assert isinstance(item, PlayerBookingItem)
        assert item.booking_id == bp.booking.id
        assert item.club_id == CLUB_ID
        assert item.court_id == COURT_ID
        assert item.court_name == "Court 1"
        assert item.booking_type == BookingType.regular
        assert item.status == BookingStatus.confirmed
        assert item.start_datetime == bp.booking.start_datetime
        assert item.end_datetime == bp.booking.end_datetime
        assert item.role == PlayerRole.organiser
        assert item.invite_status == InviteStatus.accepted
        assert item.payment_status == PaymentStatus.paid
        assert item.amount_due == Decimal("35.50")

    async def test_empty_result_returns_empty_list(self):
        svc = PlayerService(_make_db([]))
        items = await svc.get_booking_history(USER_ID)
        assert items == []

    async def test_multiple_rows_all_returned(self):
        rows = [
            _make_booking_player(status=BookingStatus.confirmed, start_offset_hours=48),
            _make_booking_player(status=BookingStatus.completed, start_offset_hours=-72),
            _make_booking_player(status=BookingStatus.cancelled, start_offset_hours=-24),
        ]
        svc = PlayerService(_make_db(rows))
        items = await svc.get_booking_history(USER_ID)
        assert len(items) == 3

    async def test_player_role_preserved(self):
        bp = _make_booking_player(role=PlayerRole.player)
        svc = PlayerService(_make_db([bp]))
        items = await svc.get_booking_history(USER_ID)
        assert items[0].role == PlayerRole.player

    async def test_organiser_role_preserved(self):
        bp = _make_booking_player(role=PlayerRole.organiser)
        svc = PlayerService(_make_db([bp]))
        items = await svc.get_booking_history(USER_ID)
        assert items[0].role == PlayerRole.organiser

    async def test_pending_payment_status_preserved(self):
        bp = _make_booking_player(payment_status=PaymentStatus.pending)
        svc = PlayerService(_make_db([bp]))
        items = await svc.get_booking_history(USER_ID)
        assert items[0].payment_status == PaymentStatus.pending

    async def test_refunded_payment_status_preserved(self):
        bp = _make_booking_player(payment_status=PaymentStatus.refunded, amount_due=Decimal("0.00"))
        svc = PlayerService(_make_db([bp]))
        items = await svc.get_booking_history(USER_ID)
        assert items[0].payment_status == PaymentStatus.refunded
        assert items[0].amount_due == Decimal("0.00")


# ---------------------------------------------------------------------------
# Tests — DB is called once per invocation
# ---------------------------------------------------------------------------


class TestGetBookingHistoryDbCalls:
    async def test_executes_exactly_one_query_default(self):
        db = _make_db([])
        svc = PlayerService(db)
        await svc.get_booking_history(USER_ID)
        db.execute.assert_called_once()

    async def test_executes_exactly_one_query_upcoming_only(self):
        db = _make_db([])
        svc = PlayerService(db)
        await svc.get_booking_history(USER_ID, upcoming_only=True)
        db.execute.assert_called_once()

    async def test_executes_exactly_one_query_completed_only(self):
        db = _make_db([])
        svc = PlayerService(db)
        await svc.get_booking_history(USER_ID, completed_only=True)
        db.execute.assert_called_once()
