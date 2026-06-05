"""
Integration tests for PricingService session-type resolution against a real DB.

These exercise the SQL filter + ordering that a mocked unit test cannot:
  - an exact session_type match is preferred over the regular fallback
  - when no rule exists for the requested session_type, the regular rule for
    the same window is used
  - None is returned only when even the regular rule is absent
"""
from datetime import datetime, time, timezone
from decimal import Decimal

import pytest

from app.db.models.booking import BookingType
from app.db.models.club import PricingLabel, PricingRule
from app.services.pricing_service import PricingService

pytestmark = pytest.mark.asyncio

# A Monday at 18:00 UTC — inside the seeded 17:00–20:00 window.
SLOT = datetime(2026, 6, 1, 18, 0, tzinfo=timezone.utc)
assert SLOT.weekday() == 0  # guard: keep SLOT on the windows' day_of_week


def _rule(club_id, session_type, price):
    return PricingRule(
        club_id=club_id,
        session_type=session_type,
        label=PricingLabel.peak,
        day_of_week=SLOT.weekday(),
        start_time=time(17, 0),
        end_time=time(20, 0),
        price_per_slot=Decimal(price),
        is_active=True,
    )


async def _seed(test_session_factory, *rules):
    async with test_session_factory() as session:
        session.add_all(rules)
        await session.commit()


async def test_exact_session_type_match_is_preferred(test_session_factory, club):
    await _seed(
        test_session_factory,
        _rule(club.id, BookingType.regular, "25.00"),
        _rule(club.id, BookingType.lesson_individual, "60.00"),
    )
    async with test_session_factory() as session:
        svc = PricingService(session)
        bd = await svc.calculate(
            club.id, SLOT, max_players=1, booking_type=BookingType.lesson_individual
        )
    assert bd.unit_price == Decimal("60.00")


async def test_regular_resolves_to_its_own_rule(test_session_factory, club):
    await _seed(
        test_session_factory,
        _rule(club.id, BookingType.regular, "25.00"),
        _rule(club.id, BookingType.lesson_individual, "60.00"),
    )
    async with test_session_factory() as session:
        svc = PricingService(session)
        bd = await svc.calculate(
            club.id, SLOT, max_players=4, booking_type=BookingType.regular
        )
    assert bd.unit_price == Decimal("25.00")


async def test_falls_back_to_regular_when_session_type_unconfigured(
    test_session_factory, club
):
    # Only a regular rule exists; a group-lesson booking falls back to it.
    await _seed(test_session_factory, _rule(club.id, BookingType.regular, "25.00"))
    async with test_session_factory() as session:
        svc = PricingService(session)
        bd = await svc.calculate(
            club.id, SLOT, max_players=4, booking_type=BookingType.lesson_group
        )
    assert bd is not None
    assert bd.unit_price == Decimal("25.00")


async def test_returns_none_when_even_regular_absent(test_session_factory, club):
    # Only a train_and_play rule exists, no regular fallback → a regular booking
    # in this window finds nothing.
    await _seed(test_session_factory, _rule(club.id, BookingType.train_and_play, "35.00"))
    async with test_session_factory() as session:
        svc = PricingService(session)
        bd = await svc.calculate(
            club.id, SLOT, max_players=4, booking_type=BookingType.regular
        )
    assert bd is None
