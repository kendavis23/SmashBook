"""
Unit tests for POST /api/v1/clubs, GET /api/v1/clubs,
PATCH /api/v1/clubs/{club_id}, and the PUT /pricing-rules bug fix.

The database session is mocked — no real Postgres needed.
"""

import uuid
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.clubs import (
    create_club,
    get_operating_hours,
    list_clubs,
    update_club,
    update_operating_hours,
    update_pricing_rules,
)
from app.db.models.club import Club
from app.schemas.club import ClubCreate, ClubUpdate, OperatingHoursEntry, PricingRuleEntry
from datetime import date, datetime, time, timezone


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

PLAN_ID = uuid.uuid4()
TENANT_ID = uuid.uuid4()

PLAN_SINGLE = SimpleNamespace(id=PLAN_ID, name="starter", max_clubs=1)
PLAN_MULTI = SimpleNamespace(id=PLAN_ID, name="pro", max_clubs=3)
PLAN_UNLIMITED = SimpleNamespace(id=PLAN_ID, name="enterprise", max_clubs=-1)

TENANT = SimpleNamespace(id=TENANT_ID, plan_id=PLAN_ID)
CURRENT_USER = SimpleNamespace(id=uuid.uuid4())


def _make_db(plan=PLAN_UNLIMITED, current_club_count: int = 0):
    """Return a minimal AsyncSession mock for the clubs endpoint."""
    db = AsyncMock()

    db.get = AsyncMock(return_value=plan)

    count_result = MagicMock()
    count_result.scalar_one.return_value = current_club_count
    db.execute = AsyncMock(return_value=count_result)

    db.flush = AsyncMock()
    db.refresh = AsyncMock()

    added = []

    def _add(obj):
        if not getattr(obj, "id", None):
            object.__setattr__(obj, "id", uuid.uuid4())
        added.append(obj)

    db.add = MagicMock(side_effect=_add)
    db._added = added
    return db


def _body(**kwargs) -> ClubCreate:
    defaults = dict(name="Padel Kings Club")
    defaults.update(kwargs)
    return ClubCreate(**defaults)


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_club_returns_club_with_correct_name():
    db = _make_db()
    result = await create_club(_body(name="My Club"), CURRENT_USER, TENANT, db)
    assert result.name == "My Club"


@pytest.mark.asyncio
async def test_create_club_scoped_to_tenant():
    db = _make_db()
    result = await create_club(_body(), CURRENT_USER, TENANT, db)
    assert result.tenant_id == TENANT_ID


@pytest.mark.asyncio
async def test_create_club_defaults_currency_to_gbp():
    db = _make_db()
    result = await create_club(_body(), CURRENT_USER, TENANT, db)
    assert result.currency == "GBP"


@pytest.mark.asyncio
async def test_create_club_accepts_custom_currency():
    db = _make_db()
    result = await create_club(_body(currency="EUR"), CURRENT_USER, TENANT, db)
    assert result.currency == "EUR"


@pytest.mark.asyncio
async def test_create_club_stores_address():
    db = _make_db()
    result = await create_club(_body(address="1 Padel Street"), CURRENT_USER, TENANT, db)
    assert result.address == "1 Padel Street"


@pytest.mark.asyncio
async def test_create_club_address_defaults_to_none():
    db = _make_db()
    result = await create_club(_body(), CURRENT_USER, TENANT, db)
    assert result.address is None


@pytest.mark.asyncio
async def test_create_club_adds_club_object():
    """Settings are columns on Club — only the Club object should be added."""
    db = _make_db()
    await create_club(_body(), CURRENT_USER, TENANT, db)
    assert len([o for o in db._added if isinstance(o, Club)]) == 1


# ---------------------------------------------------------------------------
# Plan limit enforcement
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_club_raises_403_when_at_single_club_limit():
    db = _make_db(plan=PLAN_SINGLE, current_club_count=1)
    with pytest.raises(HTTPException) as exc_info:
        await create_club(_body(), CURRENT_USER, TENANT, db)
    assert exc_info.value.status_code == 403
    assert "starter" in exc_info.value.detail
    assert "1" in exc_info.value.detail


@pytest.mark.asyncio
async def test_create_club_raises_403_when_at_multi_club_limit():
    db = _make_db(plan=PLAN_MULTI, current_club_count=3)
    with pytest.raises(HTTPException) as exc_info:
        await create_club(_body(), CURRENT_USER, TENANT, db)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_create_club_succeeds_one_below_limit():
    db = _make_db(plan=PLAN_MULTI, current_club_count=2)
    result = await create_club(_body(), CURRENT_USER, TENANT, db)
    assert result.name == "Padel Kings Club"


@pytest.mark.asyncio
async def test_create_club_unlimited_plan_skips_count_query():
    """max_clubs == -1 should not execute a COUNT query at all."""
    db = _make_db(plan=PLAN_UNLIMITED, current_club_count=99)
    await create_club(_body(), CURRENT_USER, TENANT, db)
    db.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_club_unlimited_plan_always_succeeds():
    db = _make_db(plan=PLAN_UNLIMITED, current_club_count=999)
    result = await create_club(_body(), CURRENT_USER, TENANT, db)
    assert result.tenant_id == TENANT_ID


# ---------------------------------------------------------------------------
# DB interactions
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_club_flushes_once():
    """Settings are merged into Club — only one flush needed."""
    db = _make_db()
    await create_club(_body(), CURRENT_USER, TENANT, db)
    assert db.flush.await_count == 1


@pytest.mark.asyncio
async def test_create_club_adds_exactly_one_object():
    """Settings columns live on Club — only one object should be added."""
    db = _make_db()
    await create_club(_body(), CURRENT_USER, TENANT, db)
    assert len(db._added) == 1
    assert isinstance(db._added[0], Club)


# ---------------------------------------------------------------------------
# GET /clubs — list_clubs
# ---------------------------------------------------------------------------


def _make_list_db(clubs: list):
    """Return a db mock whose execute() yields the given list of Club objects."""
    db = AsyncMock()
    scalars = MagicMock()
    scalars.all.return_value = clubs
    execute_result = MagicMock()
    execute_result.scalars.return_value = scalars
    db.execute = AsyncMock(return_value=execute_result)
    return db


@pytest.mark.asyncio
async def test_list_clubs_returns_all_tenant_clubs():
    clubs = [
        SimpleNamespace(id=uuid.uuid4(), tenant_id=TENANT_ID, name="Club A", address=None, currency="GBP", settings=None),
        SimpleNamespace(id=uuid.uuid4(), tenant_id=TENANT_ID, name="Club B", address=None, currency="GBP", settings=None),
    ]
    db = _make_list_db(clubs)
    result = await list_clubs(CURRENT_USER, TENANT, db)
    assert result == clubs


@pytest.mark.asyncio
async def test_list_clubs_returns_empty_list_when_no_clubs():
    db = _make_list_db([])
    result = await list_clubs(CURRENT_USER, TENANT, db)
    assert result == []


@pytest.mark.asyncio
async def test_list_clubs_executes_query():
    db = _make_list_db([])
    await list_clubs(CURRENT_USER, TENANT, db)
    db.execute.assert_awaited_once()


# ---------------------------------------------------------------------------
# PATCH /clubs/{club_id} — update_club
# ---------------------------------------------------------------------------


def _make_update_db(club=None):
    """Return a db mock for update_club; execute() returns the given club or None."""
    db = AsyncMock()
    scalar = MagicMock()
    scalar.scalar_one_or_none.return_value = club
    db.execute = AsyncMock(return_value=scalar)
    db.flush = AsyncMock()
    return db


def _make_club(**kwargs):
    defaults = dict(id=uuid.uuid4(), tenant_id=TENANT_ID, name="Original", address=None, currency="GBP", settings=None)
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


@pytest.mark.asyncio
async def test_update_club_renames_club():
    club = _make_club(name="Old Name")
    db = _make_update_db(club)
    result = await update_club(club.id, ClubUpdate(name="New Name"), CURRENT_USER, TENANT, db)
    assert result.name == "New Name"


@pytest.mark.asyncio
async def test_update_club_updates_address():
    club = _make_club()
    db = _make_update_db(club)
    result = await update_club(club.id, ClubUpdate(address="10 Court Lane"), CURRENT_USER, TENANT, db)
    assert result.address == "10 Court Lane"


@pytest.mark.asyncio
async def test_update_club_updates_currency():
    club = _make_club()
    db = _make_update_db(club)
    result = await update_club(club.id, ClubUpdate(currency="EUR"), CURRENT_USER, TENANT, db)
    assert result.currency == "EUR"


@pytest.mark.asyncio
async def test_update_club_ignores_none_fields():
    """Fields not supplied should not overwrite existing values."""
    club = _make_club(name="Keep Me", address="Stay")
    db = _make_update_db(club)
    result = await update_club(club.id, ClubUpdate(currency="USD"), CURRENT_USER, TENANT, db)
    assert result.name == "Keep Me"
    assert result.address == "Stay"


@pytest.mark.asyncio
async def test_update_club_raises_404_when_not_found():
    db = _make_update_db(club=None)
    with pytest.raises(HTTPException) as exc_info:
        await update_club(uuid.uuid4(), ClubUpdate(name="X"), CURRENT_USER, TENANT, db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_update_club_flushes_on_success():
    club = _make_club()
    db = _make_update_db(club)
    await update_club(club.id, ClubUpdate(name="X"), CURRENT_USER, TENANT, db)
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_club_no_flush_on_404():
    db = _make_update_db(club=None)
    with pytest.raises(HTTPException):
        await update_club(uuid.uuid4(), ClubUpdate(name="X"), CURRENT_USER, TENANT, db)
    db.flush.assert_not_awaited()


# ---------------------------------------------------------------------------
# PUT /clubs/{club_id}/pricing-rules — dynamic pricing fields persisted
# ---------------------------------------------------------------------------


def _make_pricing_db():
    db = AsyncMock()
    # _get_club uses db.get
    club = _make_club()
    db.get = AsyncMock(return_value=club)
    db.execute = AsyncMock()
    db.flush = AsyncMock()
    added = []
    db.add_all = MagicMock(side_effect=lambda objs: added.extend(objs))
    db._added = added
    return db


def _pricing_rule(**kwargs) -> PricingRuleEntry:
    defaults = dict(
        label="Peak",
        day_of_week=0,
        start_time=time(18, 0),
        end_time=time(21, 0),
        price_per_slot=Decimal("20.00"),
    )
    defaults.update(kwargs)
    return PricingRuleEntry(**defaults)


@pytest.mark.asyncio
async def test_pricing_rule_persists_base_fields():
    db = _make_pricing_db()
    rule = _pricing_rule(label="Peak", day_of_week=1, price_per_slot=Decimal("25.00"))
    await update_pricing_rules(uuid.uuid4(), [rule], CURRENT_USER, db)
    added = db._added[0]
    assert added.label == "Peak"
    assert added.day_of_week == 1
    assert added.price_per_slot == Decimal("25.00")
    assert added.start_time == time(18, 0)
    assert added.end_time == time(21, 0)


@pytest.mark.asyncio
async def test_pricing_rule_persists_incentive_price():
    db = _make_pricing_db()
    rule = _pricing_rule(incentive_price=Decimal("15.00"), incentive_label="Happy Hour")
    await update_pricing_rules(uuid.uuid4(), [rule], CURRENT_USER, db)
    assert db._added[0].incentive_price == Decimal("15.00")
    assert db._added[0].incentive_label == "Happy Hour"


@pytest.mark.asyncio
async def test_pricing_rule_persists_incentive_expires_at():
    expires = datetime(2026, 12, 31, 23, 59, tzinfo=timezone.utc)
    db = _make_pricing_db()
    rule = _pricing_rule(incentive_price=Decimal("10.00"), incentive_expires_at=expires)
    await update_pricing_rules(uuid.uuid4(), [rule], CURRENT_USER, db)
    assert db._added[0].incentive_expires_at == expires


@pytest.mark.asyncio
async def test_pricing_rule_persists_surge_fields():
    db = _make_pricing_db()
    rule = _pricing_rule(surge_trigger_pct=Decimal("80.00"), surge_max_pct=Decimal("25.00"))
    await update_pricing_rules(uuid.uuid4(), [rule], CURRENT_USER, db)
    assert db._added[0].surge_trigger_pct == Decimal("80.00")
    assert db._added[0].surge_max_pct == Decimal("25.00")


@pytest.mark.asyncio
async def test_pricing_rule_persists_low_demand_fields():
    db = _make_pricing_db()
    rule = _pricing_rule(low_demand_trigger_pct=Decimal("20.00"), low_demand_min_pct=Decimal("10.00"))
    await update_pricing_rules(uuid.uuid4(), [rule], CURRENT_USER, db)
    assert db._added[0].low_demand_trigger_pct == Decimal("20.00")
    assert db._added[0].low_demand_min_pct == Decimal("10.00")


@pytest.mark.asyncio
async def test_pricing_rule_persists_seasonal_dates():
    db = _make_pricing_db()
    rule = _pricing_rule(valid_from=date(2026, 6, 1), valid_until=date(2026, 8, 31))
    await update_pricing_rules(uuid.uuid4(), [rule], CURRENT_USER, db)
    assert db._added[0].valid_from == date(2026, 6, 1)
    assert db._added[0].valid_until == date(2026, 8, 31)


@pytest.mark.asyncio
async def test_pricing_rule_is_active_defaults_to_true():
    db = _make_pricing_db()
    rule = _pricing_rule()
    await update_pricing_rules(uuid.uuid4(), [rule], CURRENT_USER, db)
    assert db._added[0].is_active is True


@pytest.mark.asyncio
async def test_pricing_rule_can_be_set_inactive():
    db = _make_pricing_db()
    rule = _pricing_rule(is_active=False)
    await update_pricing_rules(uuid.uuid4(), [rule], CURRENT_USER, db)
    assert db._added[0].is_active is False


@pytest.mark.asyncio
async def test_pricing_rule_all_optional_fields_none_by_default():
    """A minimal rule with only required fields should store None for all optional fields."""
    db = _make_pricing_db()
    rule = _pricing_rule()
    await update_pricing_rules(uuid.uuid4(), [rule], CURRENT_USER, db)
    added = db._added[0]
    assert added.valid_from is None
    assert added.valid_until is None
    assert added.surge_trigger_pct is None
    assert added.surge_max_pct is None
    assert added.low_demand_trigger_pct is None
    assert added.low_demand_min_pct is None
    assert added.incentive_price is None
    assert added.incentive_label is None
    assert added.incentive_expires_at is None


@pytest.mark.asyncio
async def test_pricing_rule_persists_multiple_rules():
    db = _make_pricing_db()
    rules = [
        _pricing_rule(label="Peak", day_of_week=0, price_per_slot=Decimal("25.00")),
        _pricing_rule(label="Off-Peak", day_of_week=0, start_time=time(8, 0), end_time=time(17, 0), price_per_slot=Decimal("15.00")),
    ]
    await update_pricing_rules(uuid.uuid4(), rules, CURRENT_USER, db)
    assert len(db._added) == 2
    assert db._added[0].label == "Peak"
    assert db._added[1].label == "Off-Peak"


@pytest.mark.asyncio
async def test_pricing_rule_deletes_existing_before_insert():
    db = _make_pricing_db()
    rule = _pricing_rule()
    await update_pricing_rules(uuid.uuid4(), [rule], CURRENT_USER, db)
    db.execute.assert_awaited()


@pytest.mark.asyncio
async def test_pricing_rule_raises_404_when_club_not_found():
    db = _make_pricing_db()
    db.get = AsyncMock(return_value=None)
    with pytest.raises(HTTPException) as exc_info:
        await update_pricing_rules(uuid.uuid4(), [_pricing_rule()], CURRENT_USER, db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_pricing_rule_accepts_empty_list():
    """Clearing all pricing rules should succeed."""
    db = _make_pricing_db()
    result = await update_pricing_rules(uuid.uuid4(), [], CURRENT_USER, db)
    assert result == []


# ---------------------------------------------------------------------------
# OperatingHoursEntry schema validation
# ---------------------------------------------------------------------------


def test_operating_hours_entry_valid():
    entry = OperatingHoursEntry(day_of_week=0, open_time=time(8, 0), close_time=time(22, 0))
    assert entry.open_time < entry.close_time


def test_operating_hours_entry_rejects_close_before_open():
    with pytest.raises(Exception):
        OperatingHoursEntry(day_of_week=1, open_time=time(22, 0), close_time=time(8, 0))


def test_operating_hours_entry_rejects_equal_times():
    with pytest.raises(Exception):
        OperatingHoursEntry(day_of_week=2, open_time=time(9, 0), close_time=time(9, 0))


def test_operating_hours_entry_rejects_invalid_day():
    with pytest.raises(Exception):
        OperatingHoursEntry(day_of_week=7, open_time=time(8, 0), close_time=time(22, 0))


def test_operating_hours_entry_rejects_negative_day():
    with pytest.raises(Exception):
        OperatingHoursEntry(day_of_week=-1, open_time=time(8, 0), close_time=time(22, 0))


# ---------------------------------------------------------------------------
# GET /clubs/{club_id}/operating-hours — get_operating_hours
# ---------------------------------------------------------------------------


def _make_oh_read_db(hours: list):
    db = AsyncMock()
    scalars = MagicMock()
    scalars.all.return_value = hours
    execute_result = MagicMock()
    execute_result.scalars.return_value = scalars
    db.execute = AsyncMock(return_value=execute_result)
    return db


def _make_oh(day: int, open_h: int = 8, close_h: int = 22):
    return SimpleNamespace(
        id=uuid.uuid4(),
        club_id=uuid.uuid4(),
        day_of_week=day,
        open_time=time(open_h, 0),
        close_time=time(close_h, 0),
    )


@pytest.mark.asyncio
async def test_get_operating_hours_returns_all_days():
    hours = [_make_oh(d) for d in range(7)]
    db = _make_oh_read_db(hours)
    result = await get_operating_hours(uuid.uuid4(), db)
    assert result == hours


@pytest.mark.asyncio
async def test_get_operating_hours_returns_empty_when_none_set():
    db = _make_oh_read_db([])
    result = await get_operating_hours(uuid.uuid4(), db)
    assert result == []


@pytest.mark.asyncio
async def test_get_operating_hours_executes_query():
    db = _make_oh_read_db([])
    await get_operating_hours(uuid.uuid4(), db)
    db.execute.assert_awaited_once()


# ---------------------------------------------------------------------------
# PUT /clubs/{club_id}/operating-hours — update_operating_hours
# ---------------------------------------------------------------------------


def _make_oh_write_db():
    db = AsyncMock()
    club = _make_club()
    db.get = AsyncMock(return_value=club)
    db.execute = AsyncMock()
    db.flush = AsyncMock()
    added = []
    db.add_all = MagicMock(side_effect=lambda objs: added.extend(objs))
    db._added = added
    return db


def _oh_entry(day: int, open_h: int = 8, close_h: int = 22) -> OperatingHoursEntry:
    return OperatingHoursEntry(day_of_week=day, open_time=time(open_h, 0), close_time=time(close_h, 0))


@pytest.mark.asyncio
async def test_update_operating_hours_persists_all_entries():
    db = _make_oh_write_db()
    entries = [_oh_entry(d) for d in range(7)]
    result = await update_operating_hours(uuid.uuid4(), entries, CURRENT_USER, db)
    assert len(result) == 7


@pytest.mark.asyncio
async def test_update_operating_hours_stores_correct_times():
    db = _make_oh_write_db()
    entry = _oh_entry(0, open_h=9, close_h=21)
    await update_operating_hours(uuid.uuid4(), [entry], CURRENT_USER, db)
    assert db._added[0].open_time == time(9, 0)
    assert db._added[0].close_time == time(21, 0)


@pytest.mark.asyncio
async def test_update_operating_hours_deletes_existing_before_insert():
    db = _make_oh_write_db()
    await update_operating_hours(uuid.uuid4(), [_oh_entry(0)], CURRENT_USER, db)
    # delete (execute) then insert (add_all) — execute must be called
    db.execute.assert_awaited()


@pytest.mark.asyncio
async def test_update_operating_hours_flushes():
    db = _make_oh_write_db()
    await update_operating_hours(uuid.uuid4(), [_oh_entry(1)], CURRENT_USER, db)
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_operating_hours_raises_422_on_duplicate_day():
    db = _make_oh_write_db()
    entries = [_oh_entry(0), _oh_entry(0)]  # Monday duplicated
    with pytest.raises(HTTPException) as exc_info:
        await update_operating_hours(uuid.uuid4(), entries, CURRENT_USER, db)
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_update_operating_hours_raises_404_when_club_not_found():
    db = _make_oh_write_db()
    db.get = AsyncMock(return_value=None)
    with pytest.raises(HTTPException) as exc_info:
        await update_operating_hours(uuid.uuid4(), [_oh_entry(0)], CURRENT_USER, db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_update_operating_hours_accepts_empty_list():
    """Clearing all hours should succeed."""
    db = _make_oh_write_db()
    result = await update_operating_hours(uuid.uuid4(), [], CURRENT_USER, db)
    assert result == []
