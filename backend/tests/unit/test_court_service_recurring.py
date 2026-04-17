"""
Unit tests for CourtService.create_recurring_booking.

Mocks the database session — no real Postgres needed.
Verifies: RRULE expansion, conflict/blackout detection, skip_conflicts flag,
validation guards (invalid rule, no end condition, no occurrences), and that
created Booking objects carry the correct fields.
"""
import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

from app.db.models.booking import BookingStatus, BookingType, PlayerRole
from app.services.court_service import CourtService, _MAX_OCCURRENCES


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

TENANT_ID = uuid.uuid4()
CLUB_ID = uuid.uuid4()
COURT_ID = uuid.uuid4()
STAFF_ID = uuid.uuid4()

_CLUB = SimpleNamespace(
    id=CLUB_ID,
    tenant_id=TENANT_ID,
    booking_duration_minutes=90,
)
_COURT = SimpleNamespace(id=COURT_ID, club_id=CLUB_ID, is_active=True)
_STAFF_USER = SimpleNamespace(id=STAFF_ID, tenant_id=TENANT_ID)

# A Monday at 10:00 UTC well in the future
_FIRST_START = datetime(2027, 1, 4, 10, 0, 0, tzinfo=timezone.utc)  # Monday


def _make_db(conflict=False, blackout=False, price=None):
    """
    Build a minimal AsyncSession mock for create_recurring_booking.

    DB interactions expected (in order per occurrence):
     1. _get_club_and_court: two execute() calls (Club lookup, Court lookup)
     2. A third execute() for the Club row needed for booking_duration_minutes
     3. Per occurrence: _check_no_conflict, _check_no_blackout, _get_price
     4. flush() after each Booking + after BookingPlayers

    We use a side_effect list that cycles: first three are setup calls, then
    the per-occurrence triple repeats.  For simplicity we generate enough
    entries for 12 occurrences.
    """
    db = AsyncMock()

    def _scalar_returning(value):
        m = MagicMock()
        m.scalar_one_or_none.return_value = value
        m.scalar_one.return_value = value
        return m

    conflict_result = _scalar_returning(SimpleNamespace(id=uuid.uuid4()) if conflict else None)
    blackout_result = _scalar_returning(SimpleNamespace(id=uuid.uuid4()) if blackout else None)
    price_result = _scalar_returning(
        SimpleNamespace(
            price_per_slot=price or Decimal("20.00"),
            incentive_price=None,
            incentive_expires_at=None,
            is_active=True,
        )
        if price is not False
        else None
    )

    # Setup: Club lookup, Court lookup, Club re-fetch for duration
    setup_calls = [
        _scalar_returning(_CLUB),   # Club.where(id, tenant_id)
        _scalar_returning(_COURT),  # Court.where(id, club_id)
        _scalar_returning(_CLUB),   # Club re-fetch for booking_duration_minutes
    ]
    # Per-occurrence: conflict check, blackout check, price lookup
    per_occurrence = [conflict_result, blackout_result, price_result] * _MAX_OCCURRENCES

    db.execute = AsyncMock(side_effect=setup_calls + per_occurrence)
    db.flush = AsyncMock()
    db.commit = AsyncMock()

    added = []

    def _add(obj):
        if not getattr(obj, "id", None):
            import uuid as _uuid
            object.__setattr__(obj, "id", _uuid.uuid4())
        added.append(obj)

    db.add = MagicMock(side_effect=_add)
    db._added = added
    return db


def _make_svc(db):
    return CourtService(db)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _recurring_kwargs(**overrides):
    defaults = dict(
        tenant_id=TENANT_ID,
        club_id=CLUB_ID,
        court_id=COURT_ID,
        booking_type=BookingType.lesson_individual,
        first_start=_FIRST_START,
        recurrence_rule="FREQ=WEEKLY;COUNT=4",
        recurrence_end_date=None,
        created_by_user=_STAFF_USER,
        staff_profile_id=None,
        player_user_ids=[],
        notes=None,
        event_name=None,
        contact_name=None,
        contact_email=None,
        contact_phone=None,
        max_players=2,
        skip_conflicts=False,
    )
    defaults.update(overrides)
    return defaults


# ---------------------------------------------------------------------------
# Happy path — correct count and field values
# ---------------------------------------------------------------------------

class TestHappyPath:

    @pytest.mark.asyncio
    async def test_creates_correct_number_of_bookings(self):
        db = _make_db()

        # Reload each booking with relationships — mock that too
        loaded_booking = SimpleNamespace(
            id=uuid.uuid4(),
            players=[],
            court=_COURT,
            club_id=CLUB_ID,
            court_id=COURT_ID,
            booking_type=BookingType.lesson_individual,
            status=BookingStatus.confirmed,
            is_recurring=True,
            is_open_game=False,
        )
        reload_result = MagicMock()
        reload_result.scalar_one.return_value = loaded_booking

        # After the initial setup + per-occurrence execute calls, the reload
        # calls follow.  Patch the select reload path via a second side_effect.
        original_side_effect = list(db.execute.side_effect)
        reload_calls = [reload_result] * 4
        db.execute.side_effect = original_side_effect + reload_calls

        svc = _make_svc(db)
        result = await svc.create_recurring_booking(**_recurring_kwargs())

        assert len(result["created"]) == 4
        assert len(result["skipped"]) == 0

    @pytest.mark.asyncio
    async def test_bookings_are_confirmed_and_recurring(self):
        """Each created booking must have status=confirmed and is_recurring=True."""
        db = _make_db()
        loaded = SimpleNamespace(
            id=uuid.uuid4(), players=[], court=_COURT,
            status=BookingStatus.confirmed, is_recurring=True,
        )
        reload_result = MagicMock()
        reload_result.scalar_one.return_value = loaded
        db.execute.side_effect = list(db.execute.side_effect) + [reload_result] * 4

        svc = _make_svc(db)
        result = await svc.create_recurring_booking(**_recurring_kwargs())

        # Inspect the Booking objects added to the session
        bookings = [o for o in db._added if hasattr(o, "is_recurring")]
        assert all(b.status == BookingStatus.confirmed for b in bookings)
        assert all(b.is_recurring is True for b in bookings)

    @pytest.mark.asyncio
    async def test_first_booking_has_no_parent(self):
        """The first booking in a series must have parent_booking_id=None."""
        db = _make_db()
        loaded = SimpleNamespace(id=uuid.uuid4(), players=[], court=_COURT)
        reload_result = MagicMock()
        reload_result.scalar_one.return_value = loaded
        db.execute.side_effect = list(db.execute.side_effect) + [reload_result] * 4

        svc = _make_svc(db)
        await svc.create_recurring_booking(**_recurring_kwargs())

        bookings = [o for o in db._added if hasattr(o, "parent_booking_id")]
        assert bookings[0].parent_booking_id is None

    @pytest.mark.asyncio
    async def test_subsequent_bookings_share_parent_id(self):
        """Bookings after the first must share the same parent_booking_id."""
        db = _make_db()
        loaded = SimpleNamespace(id=uuid.uuid4(), players=[], court=_COURT)
        reload_result = MagicMock()
        reload_result.scalar_one.return_value = loaded
        db.execute.side_effect = list(db.execute.side_effect) + [reload_result] * 4

        svc = _make_svc(db)
        await svc.create_recurring_booking(**_recurring_kwargs())

        bookings = [o for o in db._added if hasattr(o, "parent_booking_id")]
        parent_id = bookings[0].id
        for b in bookings[1:]:
            assert b.parent_booking_id == parent_id

    @pytest.mark.asyncio
    async def test_organiser_booking_player_added(self):
        """The creating staff user must be added as an organiser BookingPlayer."""
        from app.db.models.booking import BookingPlayer, PlayerRole
        db = _make_db()
        loaded = SimpleNamespace(id=uuid.uuid4(), players=[], court=_COURT)
        reload_result = MagicMock()
        reload_result.scalar_one.return_value = loaded
        db.execute.side_effect = list(db.execute.side_effect) + [reload_result] * 4

        svc = _make_svc(db)
        await svc.create_recurring_booking(**_recurring_kwargs())

        organiser_bps = [
            o for o in db._added
            if hasattr(o, "role") and o.role == PlayerRole.organiser
        ]
        assert len(organiser_bps) == 4  # one per occurrence

    @pytest.mark.asyncio
    async def test_recurrence_end_date_stops_expansion(self):
        """recurrence_end_date=first_start + 13 days with FREQ=WEEKLY → 2 occurrences."""
        db = _make_db()
        loaded = SimpleNamespace(id=uuid.uuid4(), players=[], court=_COURT)
        reload_result = MagicMock()
        reload_result.scalar_one.return_value = loaded
        db.execute.side_effect = list(db.execute.side_effect) + [reload_result] * 4

        end_date = (_FIRST_START + timedelta(days=13)).date()
        svc = _make_svc(db)
        result = await svc.create_recurring_booking(
            **_recurring_kwargs(
                recurrence_rule="FREQ=WEEKLY",
                recurrence_end_date=end_date,
            )
        )
        assert len(result["created"]) == 2

    @pytest.mark.asyncio
    async def test_commit_called_once(self):
        db = _make_db()
        loaded = SimpleNamespace(id=uuid.uuid4(), players=[], court=_COURT)
        reload_result = MagicMock()
        reload_result.scalar_one.return_value = loaded
        db.execute.side_effect = list(db.execute.side_effect) + [reload_result] * 4

        svc = _make_svc(db)
        await svc.create_recurring_booking(**_recurring_kwargs())

        db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# Conflict / blackout behaviour
# ---------------------------------------------------------------------------

class TestConflictBehaviour:

    @pytest.mark.asyncio
    async def test_conflict_raises_409_when_skip_false(self):
        from fastapi import HTTPException
        db = _make_db(conflict=True)
        svc = _make_svc(db)
        with pytest.raises(HTTPException) as exc_info:
            await svc.create_recurring_booking(**_recurring_kwargs(skip_conflicts=False))
        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_blackout_raises_409_when_skip_false(self):
        from fastapi import HTTPException
        db = _make_db(blackout=True)
        svc = _make_svc(db)
        with pytest.raises(HTTPException) as exc_info:
            await svc.create_recurring_booking(**_recurring_kwargs(skip_conflicts=False))
        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_all_conflicted_skip_true_raises_409(self):
        """If every occurrence is conflicted and skip_conflicts=True, nothing created → 409."""
        from fastapi import HTTPException
        db = _make_db(conflict=True)
        svc = _make_svc(db)
        with pytest.raises(HTTPException) as exc_info:
            await svc.create_recurring_booking(**_recurring_kwargs(skip_conflicts=True))
        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_skip_conflicts_true_skips_and_continues(self):
        """When skip_conflicts=True and only the first occurrence conflicts, the rest are created."""
        db = AsyncMock()

        def _scalar_returning(value):
            m = MagicMock()
            m.scalar_one_or_none.return_value = value
            m.scalar_one.return_value = value
            return m

        conflict_hit = MagicMock()
        conflict_hit.scalar_one_or_none.return_value = SimpleNamespace(id=uuid.uuid4())

        no_conflict = MagicMock()
        no_conflict.scalar_one_or_none.return_value = None

        no_blackout = MagicMock()
        no_blackout.scalar_one_or_none.return_value = None

        price_rule = SimpleNamespace(
            price_per_slot=Decimal("20.00"),
            incentive_price=None,
            incentive_expires_at=None,
        )
        price_result = _scalar_returning(price_rule)

        loaded = SimpleNamespace(id=uuid.uuid4(), players=[], court=_COURT)
        reload_result = MagicMock()
        reload_result.scalar_one.return_value = loaded

        # Setup: Club, Court, Club for duration
        # occurrence 1: only conflict check runs (skip_conflicts skips after conflict)
        # occurrences 2-4: conflict, blackout, price all run
        db.execute = AsyncMock(side_effect=[
            _scalar_returning(_CLUB),    # Club lookup
            _scalar_returning(_COURT),   # Court lookup
            _scalar_returning(_CLUB),    # Club for duration
            # occurrence 1 — conflict check only; continue skips blackout + price
            conflict_hit,
            # occurrence 2
            no_conflict, no_blackout, price_result,
            # occurrence 3
            no_conflict, no_blackout, price_result,
            # occurrence 4
            no_conflict, no_blackout, price_result,
            # reloads (one per created booking = 3)
            reload_result, reload_result, reload_result,
        ])
        db.flush = AsyncMock()
        db.commit = AsyncMock()
        added = []

        def _add(obj):
            if not getattr(obj, "id", None):
                object.__setattr__(obj, "id", uuid.uuid4())
            added.append(obj)

        db.add = MagicMock(side_effect=_add)

        svc = _make_svc(db)
        result = await svc.create_recurring_booking(**_recurring_kwargs(skip_conflicts=True))

        assert len(result["created"]) == 3
        assert len(result["skipped"]) == 1
        assert result["skipped"][0]["reason"] == "court conflict"


# ---------------------------------------------------------------------------
# Validation guards
# ---------------------------------------------------------------------------

class TestValidation:

    @pytest.mark.asyncio
    async def test_invalid_rrule_raises_422(self):
        from fastapi import HTTPException
        db = _make_db()
        svc = _make_svc(db)
        with pytest.raises(HTTPException) as exc_info:
            await svc.create_recurring_booking(
                **_recurring_kwargs(recurrence_rule="NOT_A_VALID_RULE")
            )
        assert exc_info.value.status_code == 422

    @pytest.mark.asyncio
    async def test_no_occurrences_in_range_raises_422(self):
        """An end date in the past yields zero occurrences → 422."""
        from fastapi import HTTPException
        db = _make_db()
        # conflict=False so we reach the expansion logic
        svc = _make_svc(db)
        past_end = date(2020, 1, 1)
        with pytest.raises(HTTPException) as exc_info:
            await svc.create_recurring_booking(
                **_recurring_kwargs(
                    recurrence_rule="FREQ=WEEKLY",
                    recurrence_end_date=past_end,
                )
            )
        assert exc_info.value.status_code == 422

    @pytest.mark.asyncio
    async def test_inactive_court_raises_422(self):
        from fastapi import HTTPException
        db = AsyncMock()
        club_result = MagicMock()
        club_result.scalar_one_or_none.return_value = _CLUB
        court_result = MagicMock()
        court_result.scalar_one_or_none.return_value = SimpleNamespace(
            id=COURT_ID, club_id=CLUB_ID, is_active=False
        )
        db.execute = AsyncMock(side_effect=[club_result, court_result])
        svc = _make_svc(db)
        with pytest.raises(HTTPException) as exc_info:
            await svc.create_recurring_booking(**_recurring_kwargs())
        assert exc_info.value.status_code == 422

    @pytest.mark.asyncio
    async def test_unknown_club_raises_404(self):
        from fastapi import HTTPException
        db = AsyncMock()
        not_found = MagicMock()
        not_found.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=not_found)
        svc = _make_svc(db)
        with pytest.raises(HTTPException) as exc_info:
            await svc.create_recurring_booking(**_recurring_kwargs())
        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Schema validation (RecurringBookingCreate)
# ---------------------------------------------------------------------------

class TestSchemaValidation:

    def test_missing_end_condition_raises(self):
        from pydantic import ValidationError
        from app.schemas.booking import RecurringBookingCreate
        with pytest.raises(ValidationError):
            RecurringBookingCreate(
                club_id=CLUB_ID,
                court_id=COURT_ID,
                first_start=_FIRST_START,
                recurrence_rule="FREQ=WEEKLY",  # no COUNT, no UNTIL, no recurrence_end_date
            )

    def test_count_in_rule_satisfies_end_condition(self):
        from app.schemas.booking import RecurringBookingCreate
        obj = RecurringBookingCreate(
            club_id=CLUB_ID,
            court_id=COURT_ID,
            first_start=_FIRST_START,
            recurrence_rule="FREQ=WEEKLY;COUNT=8",
        )
        assert obj.recurrence_end_date is None

    def test_until_in_rule_satisfies_end_condition(self):
        from app.schemas.booking import RecurringBookingCreate
        obj = RecurringBookingCreate(
            club_id=CLUB_ID,
            court_id=COURT_ID,
            first_start=_FIRST_START,
            recurrence_rule="FREQ=WEEKLY;UNTIL=20271231T000000Z",
        )
        assert obj.recurrence_end_date is None

    def test_recurrence_end_date_satisfies_end_condition(self):
        from app.schemas.booking import RecurringBookingCreate
        obj = RecurringBookingCreate(
            club_id=CLUB_ID,
            court_id=COURT_ID,
            first_start=_FIRST_START,
            recurrence_rule="FREQ=WEEKLY",
            recurrence_end_date=date(2027, 6, 30),
        )
        assert obj.recurrence_end_date == date(2027, 6, 30)

    def test_max_players_zero_rejected(self):
        from pydantic import ValidationError
        from app.schemas.booking import RecurringBookingCreate
        with pytest.raises(ValidationError):
            RecurringBookingCreate(
                club_id=CLUB_ID,
                court_id=COURT_ID,
                first_start=_FIRST_START,
                recurrence_rule="FREQ=WEEKLY;COUNT=4",
                max_players=0,
            )

    def test_default_booking_type_is_lesson_individual(self):
        from app.schemas.booking import RecurringBookingCreate
        from app.db.models.booking import BookingType
        obj = RecurringBookingCreate(
            club_id=CLUB_ID,
            court_id=COURT_ID,
            first_start=_FIRST_START,
            recurrence_rule="FREQ=WEEKLY;COUNT=4",
        )
        assert obj.booking_type == BookingType.lesson_individual
