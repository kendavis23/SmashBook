"""
Unit tests for PricingService.calculate() and PricingService.consume_credit().

All DB interaction is mocked — no database required.

Priority order under test:
  1. incentive_price overrides price_per_slot
  2. Membership booking credit → amount_due = 0
  3. Membership discount_pct → percentage off unit_price
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.models.booking import DiscountSource
from app.services.pricing_service import PricingService

NOW = datetime.now(tz=timezone.utc)
CLUB_ID = uuid.uuid4()
USER_ID = uuid.uuid4()
BOOKING_ID = uuid.uuid4()
SUB_ID = uuid.uuid4()

# Monday 10:00
START = NOW.replace(hour=10, minute=0, second=0, microsecond=0)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rule(price_per_slot="20.00", incentive_price=None, incentive_expires_at=None):
    return SimpleNamespace(
        price_per_slot=Decimal(price_per_slot),
        incentive_price=Decimal(incentive_price) if incentive_price else None,
        incentive_expires_at=incentive_expires_at,
    )


def _plan(booking_credits_per_period=None, discount_pct=None):
    return SimpleNamespace(
        booking_credits_per_period=booking_credits_per_period,
        discount_pct=Decimal(discount_pct) if discount_pct else None,
    )


def _sub(plan, credits_remaining=None):
    return SimpleNamespace(
        id=SUB_ID,
        plan=plan,
        credits_remaining=credits_remaining,
        status="active",
        current_period_end=NOW + timedelta(days=30),
    )


def _db_no_rule():
    """DB that returns no matching pricing rule."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)
    return db


def _db_rule_only(rule):
    """DB that returns a pricing rule but is never asked about memberships (user_id=None)."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = rule
    db.execute = AsyncMock(return_value=result)
    return db


def _db_rule_and_sub(rule, sub):
    """DB that returns a pricing rule then a membership subscription."""
    db = AsyncMock()
    rule_result = MagicMock()
    rule_result.scalar_one_or_none.return_value = rule
    sub_result = MagicMock()
    sub_result.scalar_one_or_none.return_value = sub
    db.execute = AsyncMock(side_effect=[rule_result, sub_result])
    return db


def _db_rule_no_sub(rule):
    """DB that returns a pricing rule then no subscription."""
    db = AsyncMock()
    rule_result = MagicMock()
    rule_result.scalar_one_or_none.return_value = rule
    sub_result = MagicMock()
    sub_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(side_effect=[rule_result, sub_result])
    return db


# ---------------------------------------------------------------------------
# No pricing rule
# ---------------------------------------------------------------------------

class TestNoPricingRule:

    @pytest.mark.asyncio
    async def test_returns_none_when_no_rule(self):
        svc = PricingService(_db_no_rule())
        result = await svc.calculate(CLUB_ID, START, max_players=4)
        assert result is None


# ---------------------------------------------------------------------------
# Base price (user_id=None — no membership lookup)
# ---------------------------------------------------------------------------

class TestBasePriceNoUser:

    @pytest.mark.asyncio
    async def test_returns_price_per_slot(self):
        rule = _rule(price_per_slot="20.00")
        svc = PricingService(_db_rule_only(rule))
        bd = await svc.calculate(CLUB_ID, START, max_players=4)
        assert bd.base_price == Decimal("20.00")
        assert bd.unit_price == Decimal("20.00")
        assert bd.discount_amount == Decimal("0.00")
        assert bd.discount_source is None
        assert bd.total_price == Decimal("20.00")
        assert bd.amount_due == Decimal("5.00")   # 20 / 4
        assert bd.credit_consumed is False

    @pytest.mark.asyncio
    async def test_active_incentive_overrides_base_price(self):
        rule = _rule(price_per_slot="20.00", incentive_price="12.00", incentive_expires_at=NOW + timedelta(hours=1))
        svc = PricingService(_db_rule_only(rule))
        bd = await svc.calculate(CLUB_ID, START, max_players=4)
        assert bd.base_price == Decimal("20.00")
        assert bd.unit_price == Decimal("12.00")
        assert bd.total_price == Decimal("12.00")
        assert bd.amount_due == Decimal("3.00")   # 12 / 4

    @pytest.mark.asyncio
    async def test_expired_incentive_falls_back_to_base_price(self):
        rule = _rule(price_per_slot="20.00", incentive_price="12.00", incentive_expires_at=NOW - timedelta(hours=1))
        svc = PricingService(_db_rule_only(rule))
        bd = await svc.calculate(CLUB_ID, START, max_players=4)
        assert bd.unit_price == Decimal("20.00")

    @pytest.mark.asyncio
    async def test_incentive_with_no_expiry_is_active(self):
        rule = _rule(price_per_slot="20.00", incentive_price="15.00", incentive_expires_at=None)
        svc = PricingService(_db_rule_only(rule))
        bd = await svc.calculate(CLUB_ID, START, max_players=4)
        assert bd.unit_price == Decimal("15.00")

    @pytest.mark.asyncio
    async def test_amount_due_splits_correctly_for_different_max_players(self):
        rule = _rule(price_per_slot="30.00")
        svc = PricingService(_db_rule_only(rule))
        bd = await svc.calculate(CLUB_ID, START, max_players=2)
        assert bd.amount_due == Decimal("15.00")


# ---------------------------------------------------------------------------
# No active subscription for the user
# ---------------------------------------------------------------------------

class TestNoActiveSubscription:

    @pytest.mark.asyncio
    async def test_no_subscription_returns_base_price(self):
        rule = _rule(price_per_slot="20.00")
        svc = PricingService(_db_rule_no_sub(rule))
        bd = await svc.calculate(CLUB_ID, START, max_players=4, user_id=USER_ID)
        assert bd.unit_price == Decimal("20.00")
        assert bd.discount_amount == Decimal("0.00")
        assert bd.discount_source is None
        assert bd.membership_subscription_id is None


# ---------------------------------------------------------------------------
# Membership booking credit (priority 2)
# ---------------------------------------------------------------------------

class TestMembershipCredit:

    @pytest.mark.asyncio
    async def test_credit_available_makes_amount_due_zero(self):
        rule = _rule(price_per_slot="20.00")
        sub = _sub(_plan(booking_credits_per_period=5), credits_remaining=3)
        svc = PricingService(_db_rule_and_sub(rule, sub))
        bd = await svc.calculate(CLUB_ID, START, max_players=4, user_id=USER_ID)
        assert bd.credit_consumed is True
        assert bd.amount_due == Decimal("0.00")
        assert bd.total_price == Decimal("0.00")
        assert bd.discount_source == DiscountSource.membership
        assert bd.membership_subscription_id == SUB_ID

    @pytest.mark.asyncio
    async def test_unlimited_credits_makes_amount_due_zero(self):
        rule = _rule(price_per_slot="20.00")
        # booking_credits_per_period=None means unlimited
        sub = _sub(_plan(booking_credits_per_period=None), credits_remaining=None)
        svc = PricingService(_db_rule_and_sub(rule, sub))
        bd = await svc.calculate(CLUB_ID, START, max_players=4, user_id=USER_ID)
        assert bd.credit_consumed is True
        assert bd.amount_due == Decimal("0.00")

    @pytest.mark.asyncio
    async def test_zero_credits_falls_through_to_discount_pct(self):
        rule = _rule(price_per_slot="20.00")
        sub = _sub(_plan(booking_credits_per_period=5, discount_pct="10.00"), credits_remaining=0)
        svc = PricingService(_db_rule_and_sub(rule, sub))
        bd = await svc.calculate(CLUB_ID, START, max_players=4, user_id=USER_ID)
        assert bd.credit_consumed is False
        assert bd.discount_source == DiscountSource.membership
        assert bd.discount_amount == Decimal("2.00")   # 10% of 20
        assert bd.total_price == Decimal("18.00")

    @pytest.mark.asyncio
    async def test_credit_takes_priority_over_discount_pct(self):
        rule = _rule(price_per_slot="20.00")
        sub = _sub(_plan(booking_credits_per_period=5, discount_pct="10.00"), credits_remaining=2)
        svc = PricingService(_db_rule_and_sub(rule, sub))
        bd = await svc.calculate(CLUB_ID, START, max_players=4, user_id=USER_ID)
        assert bd.credit_consumed is True
        assert bd.amount_due == Decimal("0.00")


# ---------------------------------------------------------------------------
# Membership discount_pct (priority 3)
# ---------------------------------------------------------------------------

class TestMembershipDiscountPct:

    @pytest.mark.asyncio
    async def test_discount_pct_applied_to_unit_price(self):
        rule = _rule(price_per_slot="20.00")
        sub = _sub(_plan(booking_credits_per_period=5, discount_pct="25.00"), credits_remaining=0)
        svc = PricingService(_db_rule_and_sub(rule, sub))
        bd = await svc.calculate(CLUB_ID, START, max_players=4, user_id=USER_ID)
        assert bd.discount_amount == Decimal("5.00")   # 25% of 20
        assert bd.total_price == Decimal("15.00")
        assert bd.amount_due == Decimal("3.75")         # 15 / 4

    @pytest.mark.asyncio
    async def test_discount_pct_applied_to_incentive_price(self):
        # Discount applies to unit_price (incentive), not base price
        rule = _rule(price_per_slot="20.00", incentive_price="12.00")
        sub = _sub(_plan(booking_credits_per_period=5, discount_pct="50.00"), credits_remaining=0)
        svc = PricingService(_db_rule_and_sub(rule, sub))
        bd = await svc.calculate(CLUB_ID, START, max_players=4, user_id=USER_ID)
        assert bd.unit_price == Decimal("12.00")
        assert bd.discount_amount == Decimal("6.00")   # 50% of 12
        assert bd.total_price == Decimal("6.00")

    @pytest.mark.asyncio
    async def test_no_discount_pct_and_no_credits_gives_base_price(self):
        rule = _rule(price_per_slot="20.00")
        sub = _sub(_plan(booking_credits_per_period=5, discount_pct=None), credits_remaining=0)
        svc = PricingService(_db_rule_and_sub(rule, sub))
        bd = await svc.calculate(CLUB_ID, START, max_players=4, user_id=USER_ID)
        assert bd.discount_amount == Decimal("0.00")
        assert bd.discount_source is None
        assert bd.membership_subscription_id is None


# ---------------------------------------------------------------------------
# consume_credit
# ---------------------------------------------------------------------------

class TestConsumeCredit:

    @pytest.mark.asyncio
    async def test_decrements_credits_remaining(self):
        sub = SimpleNamespace(id=SUB_ID, credits_remaining=3)
        db = AsyncMock()
        db.get = AsyncMock(return_value=sub)
        db.add = MagicMock()

        svc = PricingService(db)
        await svc.consume_credit(SUB_ID, BOOKING_ID)

        assert sub.credits_remaining == 2
        db.add.assert_called()

    @pytest.mark.asyncio
    async def test_unlimited_credits_not_decremented(self):
        sub = SimpleNamespace(id=SUB_ID, credits_remaining=None)
        db = AsyncMock()
        db.get = AsyncMock(return_value=sub)
        db.add = MagicMock()

        svc = PricingService(db)
        await svc.consume_credit(SUB_ID, BOOKING_ID)

        assert sub.credits_remaining is None

    @pytest.mark.asyncio
    async def test_missing_subscription_is_silent_noop(self):
        db = AsyncMock()
        db.get = AsyncMock(return_value=None)
        db.add = MagicMock()

        svc = PricingService(db)
        await svc.consume_credit(SUB_ID, BOOKING_ID)

        db.add.assert_not_called()
