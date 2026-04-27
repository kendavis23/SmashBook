"""
Unit tests for PlayerService.

The DB session is mocked — no Postgres required.
Tests cover:
  - list_players: ORM → PlayerSearchResult mapping, query execution
  - get_booking_history: ORM → PlayerBookingItem mapping and query path selection
  - update_skill_level: skill assignment, audit log creation, response shape
  - get_skill_history: history query and SkillLevelHistoryItem mapping
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from app.db.models.booking import BookingStatus, BookingType, InviteStatus, PaymentStatus, PlayerRole
from app.db.models.skill import SkillLevelHistory
from app.schemas.user import PlayerBookingItem, PlayerSearchResult, SkillLevelHistoryItem, SkillLevelUpdateResponse
from app.services.player_service import PlayerService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

USER_ID = uuid.uuid4()
CLUB_ID = uuid.uuid4()
COURT_ID = uuid.uuid4()
STAFF_ID = uuid.uuid4()


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
# Helpers — list_players
# ---------------------------------------------------------------------------


TENANT_ID = uuid.uuid4()


def _make_user(full_name: str, skill_level=None) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        full_name=full_name,
        skill_level=skill_level,
    )


def _make_list_db(users: list) -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = users
    db.execute = AsyncMock(return_value=result)
    return db


# ---------------------------------------------------------------------------
# Tests — list_players
# ---------------------------------------------------------------------------


class TestListPlayers:
    async def test_empty_result_returns_empty_list(self):
        svc = PlayerService(_make_list_db([]))
        result = await svc.list_players(tenant_id=TENANT_ID)
        assert result == []

    async def test_maps_user_fields_to_player_search_result(self):
        user = _make_user("Alice Smith", skill_level=Decimal("3.5"))
        svc = PlayerService(_make_list_db([user]))
        result = await svc.list_players(tenant_id=TENANT_ID)
        assert len(result) == 1
        item = result[0]
        assert isinstance(item, PlayerSearchResult)
        assert item.id == user.id
        assert item.full_name == "Alice Smith"
        assert item.skill_level == Decimal("3.5")

    async def test_skill_level_none_is_preserved(self):
        user = _make_user("Bob Jones", skill_level=None)
        svc = PlayerService(_make_list_db([user]))
        result = await svc.list_players(tenant_id=TENANT_ID)
        assert result[0].skill_level is None

    async def test_multiple_users_all_returned(self):
        users = [_make_user("Alice"), _make_user("Bob"), _make_user("Carol")]
        svc = PlayerService(_make_list_db(users))
        result = await svc.list_players(tenant_id=TENANT_ID)
        assert len(result) == 3

    async def test_executes_exactly_one_query_no_filters(self):
        db = _make_list_db([])
        svc = PlayerService(db)
        await svc.list_players(tenant_id=TENANT_ID)
        db.execute.assert_called_once()

    async def test_executes_exactly_one_query_with_q(self):
        db = _make_list_db([])
        svc = PlayerService(db)
        await svc.list_players(tenant_id=TENANT_ID, q="alice")
        db.execute.assert_called_once()

    async def test_club_id_param_does_not_raise(self):
        db = _make_list_db([])
        svc = PlayerService(db)
        result = await svc.list_players(tenant_id=TENANT_ID, club_id=uuid.uuid4())
        assert result == []

    async def test_club_id_does_not_add_extra_query(self):
        db = _make_list_db([])
        svc = PlayerService(db)
        await svc.list_players(tenant_id=TENANT_ID, club_id=uuid.uuid4())
        db.execute.assert_called_once()


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


# ---------------------------------------------------------------------------
# Helpers — update_skill_level / get_skill_history
# ---------------------------------------------------------------------------


def _make_player(skill_level=None):
    return SimpleNamespace(
        id=uuid.uuid4(),
        skill_level=skill_level,
        skill_assigned_by=None,
        skill_assigned_at=None,
    )


def _make_skill_db(player=None):
    """Mock AsyncSession for update_skill_level."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = player
    db.execute = AsyncMock(return_value=result)

    added = []
    db.add = MagicMock(side_effect=lambda obj: added.append(obj))
    db._added = added

    async def _refresh(obj):
        if not getattr(obj, "id", None):
            obj.id = uuid.uuid4()
        if not getattr(obj, "created_at", None):
            obj.created_at = datetime.now(tz=timezone.utc)

    db.flush = AsyncMock()
    db.refresh = AsyncMock(side_effect=_refresh)
    return db


def _make_history_db(rows: list) -> AsyncMock:
    """Mock AsyncSession for get_skill_history."""
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = rows
    db.execute = AsyncMock(return_value=result)
    return db


def _make_history_entry(
    *,
    previous_level=None,
    new_level=Decimal("3.5"),
    reason=None,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        previous_level=previous_level,
        new_level=new_level,
        assigned_by=STAFF_ID,
        reason=reason,
        created_at=datetime.now(tz=timezone.utc),
    )


# ---------------------------------------------------------------------------
# Tests — update_skill_level
# ---------------------------------------------------------------------------


class TestUpdateSkillLevel:
    async def test_returns_none_when_player_not_found(self):
        svc = PlayerService(_make_skill_db(player=None))
        result = await svc.update_skill_level(
            user_id=USER_ID,
            new_level=Decimal("3.5"),
            assigned_by_staff_id=STAFF_ID,
        )
        assert result is None

    async def test_updates_player_skill_level(self):
        player = _make_player(skill_level=Decimal("2.5"))
        svc = PlayerService(_make_skill_db(player=player))
        await svc.update_skill_level(
            user_id=player.id,
            new_level=Decimal("4.0"),
            assigned_by_staff_id=STAFF_ID,
        )
        assert player.skill_level == Decimal("4.0")

    async def test_updates_assigned_by_and_at(self):
        player = _make_player()
        svc = PlayerService(_make_skill_db(player=player))
        await svc.update_skill_level(
            user_id=player.id,
            new_level=Decimal("3.5"),
            assigned_by_staff_id=STAFF_ID,
        )
        assert player.skill_assigned_by == STAFF_ID
        assert player.skill_assigned_at is not None

    async def test_creates_one_history_entry(self):
        player = _make_player(skill_level=Decimal("3.0"))
        db = _make_skill_db(player=player)
        svc = PlayerService(db)
        await svc.update_skill_level(
            user_id=player.id,
            new_level=Decimal("4.0"),
            assigned_by_staff_id=STAFF_ID,
            reason="Improved serve",
        )
        assert len(db._added) == 1
        entry = db._added[0]
        assert isinstance(entry, SkillLevelHistory)

    async def test_history_entry_captures_previous_level(self):
        player = _make_player(skill_level=Decimal("3.0"))
        db = _make_skill_db(player=player)
        svc = PlayerService(db)
        await svc.update_skill_level(
            user_id=player.id,
            new_level=Decimal("4.0"),
            assigned_by_staff_id=STAFF_ID,
        )
        entry = db._added[0]
        assert entry.previous_level == Decimal("3.0")
        assert entry.new_level == Decimal("4.0")
        assert entry.assigned_by == STAFF_ID

    async def test_first_assignment_previous_level_is_none(self):
        player = _make_player(skill_level=None)
        db = _make_skill_db(player=player)
        svc = PlayerService(db)
        await svc.update_skill_level(
            user_id=player.id,
            new_level=Decimal("3.5"),
            assigned_by_staff_id=STAFF_ID,
        )
        assert db._added[0].previous_level is None

    async def test_reason_stored_on_history_entry(self):
        player = _make_player()
        db = _make_skill_db(player=player)
        svc = PlayerService(db)
        await svc.update_skill_level(
            user_id=player.id,
            new_level=Decimal("3.5"),
            assigned_by_staff_id=STAFF_ID,
            reason="Tournament result",
        )
        assert db._added[0].reason == "Tournament result"

    async def test_reason_defaults_to_none(self):
        player = _make_player()
        db = _make_skill_db(player=player)
        svc = PlayerService(db)
        await svc.update_skill_level(
            user_id=player.id,
            new_level=Decimal("3.5"),
            assigned_by_staff_id=STAFF_ID,
        )
        assert db._added[0].reason is None

    async def test_returns_skill_level_update_response(self):
        player = _make_player(skill_level=Decimal("3.0"))
        svc = PlayerService(_make_skill_db(player=player))
        result = await svc.update_skill_level(
            user_id=player.id,
            new_level=Decimal("4.5"),
            assigned_by_staff_id=STAFF_ID,
        )
        assert isinstance(result, SkillLevelUpdateResponse)
        assert result.user_id == player.id
        assert result.skill_level == Decimal("4.5")
        assert result.skill_assigned_by == STAFF_ID
        assert result.skill_assigned_at is not None

    async def test_response_history_entry_fields(self):
        player = _make_player(skill_level=Decimal("3.0"))
        svc = PlayerService(_make_skill_db(player=player))
        result = await svc.update_skill_level(
            user_id=player.id,
            new_level=Decimal("4.5"),
            assigned_by_staff_id=STAFF_ID,
        )
        h = result.history_entry
        assert isinstance(h, SkillLevelHistoryItem)
        assert h.previous_level == Decimal("3.0")
        assert h.new_level == Decimal("4.5")
        assert h.assigned_by == STAFF_ID

    async def test_flushes_then_refreshes(self):
        player = _make_player()
        db = _make_skill_db(player=player)
        svc = PlayerService(db)
        await svc.update_skill_level(
            user_id=player.id,
            new_level=Decimal("3.5"),
            assigned_by_staff_id=STAFF_ID,
        )
        db.flush.assert_called_once()
        db.refresh.assert_called_once()


# ---------------------------------------------------------------------------
# Tests — get_skill_history
# ---------------------------------------------------------------------------


class TestGetSkillHistory:
    async def test_empty_returns_empty_list(self):
        svc = PlayerService(_make_history_db([]))
        result = await svc.get_skill_history(USER_ID)
        assert result == []

    async def test_maps_entry_fields(self):
        entry = _make_history_entry(previous_level=Decimal("3.0"), new_level=Decimal("4.0"), reason="Good progress")
        svc = PlayerService(_make_history_db([entry]))
        result = await svc.get_skill_history(USER_ID)
        assert len(result) == 1
        item = result[0]
        assert isinstance(item, SkillLevelHistoryItem)
        assert item.previous_level == Decimal("3.0")
        assert item.new_level == Decimal("4.0")
        assert item.assigned_by == STAFF_ID
        assert item.reason == "Good progress"
        assert item.created_at == entry.created_at

    async def test_first_entry_previous_level_is_none(self):
        entry = _make_history_entry(previous_level=None, new_level=Decimal("3.5"))
        svc = PlayerService(_make_history_db([entry]))
        result = await svc.get_skill_history(USER_ID)
        assert result[0].previous_level is None

    async def test_multiple_entries_all_returned(self):
        entries = [
            _make_history_entry(previous_level=None, new_level=Decimal("3.0")),
            _make_history_entry(previous_level=Decimal("3.0"), new_level=Decimal("4.0")),
            _make_history_entry(previous_level=Decimal("4.0"), new_level=Decimal("4.5")),
        ]
        svc = PlayerService(_make_history_db(entries))
        result = await svc.get_skill_history(USER_ID)
        assert len(result) == 3

    async def test_executes_exactly_one_query(self):
        db = _make_history_db([])
        svc = PlayerService(db)
        await svc.get_skill_history(USER_ID)
        db.execute.assert_called_once()
