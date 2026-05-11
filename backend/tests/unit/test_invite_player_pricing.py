"""
Unit tests for the invite_player pricing path in BookingService.

These tests focus on the two branches that can't be covered by integration
tests without complex DB setup:

  1. No pricing rule exists → falls back to total_price / max_players split.
  2. PricingService returns a breakdown → discount fields are written to the
     BookingPlayer and a credit is consumed when credit_consumed=True.

The BookingService is not instantiated directly here because invite_player
does a lot of DB work. Instead we test the pure decision logic by calling
the service method with a fully-mocked DB and pre-wired PricingService.
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.models.booking import DiscountSource
from app.services.pricing_service import PriceBreakdown

NOW = datetime.now(tz=timezone.utc)
CLUB_ID = uuid.uuid4()
TENANT_ID = uuid.uuid4()
BOOKING_ID = uuid.uuid4()
USER_ID = uuid.uuid4()
INVITED_ID = uuid.uuid4()
SUB_ID = uuid.uuid4()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _breakdown(
    amount_due="5.00",
    discount_amount="0.00",
    discount_source=None,
    credit_consumed=False,
    membership_subscription_id=None,
):
    return PriceBreakdown(
        base_price=Decimal("20.00"),
        unit_price=Decimal("20.00"),
        discount_amount=Decimal(discount_amount),
        discount_source=discount_source,
        membership_subscription_id=membership_subscription_id,
        credit_consumed=credit_consumed,
        total_price=Decimal("20.00"),
        amount_due=Decimal(amount_due),
    )


def _booking_stub(total_price="20.00", max_players=4):
    b = SimpleNamespace(
        id=BOOKING_ID,
        club_id=CLUB_ID,
        start_datetime=NOW + timedelta(hours=48),
        max_players=max_players,
        total_price=Decimal(total_price) if total_price else None,
        status=SimpleNamespace(value="pending"),
        players=[],
    )
    # booking.status comparisons use == against enum values
    from app.db.models.booking import BookingStatus
    b.status = BookingStatus.pending
    return b


def _invited_user():
    return SimpleNamespace(id=INVITED_ID, tenant_id=TENANT_ID)


def _requesting_user():
    return SimpleNamespace(id=USER_ID, tenant_id=TENANT_ID)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestInvitePlayerPricingFallback:
    """When PricingService returns None (no rule), amount_due = total_price / max_players."""

    @pytest.mark.asyncio
    async def test_no_pricing_rule_splits_total_price(self):
        from app.services.booking_service import BookingService

        booking = _booking_stub(total_price="20.00", max_players=4)
        invited_user = _invited_user()

        # Requesting user is the organiser
        requesting_user = _requesting_user()
        booking.players = [
            SimpleNamespace(
                user_id=requesting_user.id,
                role=MagicMock(__eq__=lambda s, o: str(o) == "organiser"),
                invite_status=MagicMock(__ne__=lambda s, o: True),
            )
        ]
        from app.db.models.booking import PlayerRole, InviteStatus
        booking.players = [
            SimpleNamespace(
                user_id=requesting_user.id,
                role=PlayerRole.organiser,
                invite_status=InviteStatus.accepted,
            )
        ]

        # Build a mock DB that returns the booking then the invited user
        booking_result = MagicMock()
        booking_result.scalar_one_or_none.return_value = booking
        user_result = MagicMock()
        user_result.scalar_one_or_none.return_value = invited_user

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=[booking_result, user_result])
        db.add = MagicMock()
        db.flush = AsyncMock()

        added_players = []
        original_add = db.add
        def capture_add(obj):
            added_players.append(obj)
            return original_add(obj)
        db.add = capture_add

        svc = BookingService(db)

        with patch("app.services.booking_service.PricingService") as MockPricingSvc:
            instance = MockPricingSvc.return_value
            instance.calculate = AsyncMock(return_value=None)  # no pricing rule

            with patch.object(svc, "_load_booking", AsyncMock(return_value=booking)):
                await svc.invite_player(
                    booking_id=BOOKING_ID,
                    club_id=CLUB_ID,
                    tenant_id=TENANT_ID,
                    requesting_user=requesting_user,
                    invited_user_id=INVITED_ID,
                )

        bp = next(o for o in added_players if hasattr(o, "amount_due"))
        assert bp.amount_due == Decimal("5.00")   # 20.00 / 4
        assert bp.discount_amount is None
        assert bp.discount_source is None
        instance.consume_credit.assert_not_called()

    @pytest.mark.asyncio
    async def test_no_pricing_rule_no_total_price_gives_zero(self):
        from app.services.booking_service import BookingService

        booking = _booking_stub(total_price=None, max_players=4)
        invited_user = _invited_user()
        requesting_user = _requesting_user()
        from app.db.models.booking import PlayerRole, InviteStatus
        booking.players = [
            SimpleNamespace(
                user_id=requesting_user.id,
                role=PlayerRole.organiser,
                invite_status=InviteStatus.accepted,
            )
        ]

        booking_result = MagicMock()
        booking_result.scalar_one_or_none.return_value = booking
        user_result = MagicMock()
        user_result.scalar_one_or_none.return_value = invited_user

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=[booking_result, user_result])
        db.add = MagicMock()
        db.flush = AsyncMock()

        added_players = []
        def capture_add(obj):
            added_players.append(obj)
        db.add = capture_add

        svc = BookingService(db)

        with patch("app.services.booking_service.PricingService") as MockPricingSvc:
            instance = MockPricingSvc.return_value
            instance.calculate = AsyncMock(return_value=None)

            with patch.object(svc, "_load_booking", AsyncMock(return_value=booking)):
                await svc.invite_player(
                    booking_id=BOOKING_ID,
                    club_id=CLUB_ID,
                    tenant_id=TENANT_ID,
                    requesting_user=requesting_user,
                    invited_user_id=INVITED_ID,
                )

        bp = next(o for o in added_players if hasattr(o, "amount_due"))
        assert bp.amount_due == Decimal("0.00")


class TestInvitePlayerPricingBreakdown:
    """When PricingService returns a breakdown, discount fields and credits are applied."""

    @pytest.mark.asyncio
    async def test_discount_pct_applied_to_invited_player(self):
        from app.services.booking_service import BookingService

        booking = _booking_stub()
        invited_user = _invited_user()
        requesting_user = _requesting_user()
        from app.db.models.booking import PlayerRole, InviteStatus
        booking.players = [
            SimpleNamespace(
                user_id=requesting_user.id,
                role=PlayerRole.organiser,
                invite_status=InviteStatus.accepted,
            )
        ]

        booking_result = MagicMock()
        booking_result.scalar_one_or_none.return_value = booking
        user_result = MagicMock()
        user_result.scalar_one_or_none.return_value = invited_user

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=[booking_result, user_result])
        db.flush = AsyncMock()

        added_players = []
        def capture_add(obj):
            added_players.append(obj)
        db.add = capture_add

        bd = _breakdown(
            amount_due="4.00",
            discount_amount="1.00",
            discount_source=DiscountSource.membership,
            credit_consumed=False,
        )

        svc = BookingService(db)

        with patch("app.services.booking_service.PricingService") as MockPricingSvc:
            instance = MockPricingSvc.return_value
            instance.calculate = AsyncMock(return_value=bd)

            with patch.object(svc, "_load_booking", AsyncMock(return_value=booking)):
                await svc.invite_player(
                    booking_id=BOOKING_ID,
                    club_id=CLUB_ID,
                    tenant_id=TENANT_ID,
                    requesting_user=requesting_user,
                    invited_user_id=INVITED_ID,
                )

        bp = next(o for o in added_players if hasattr(o, "amount_due"))
        assert bp.amount_due == Decimal("4.00")
        assert bp.discount_amount == Decimal("1.00")
        assert bp.discount_source == DiscountSource.membership
        instance.consume_credit.assert_not_called()

    @pytest.mark.asyncio
    async def test_credit_consumed_calls_consume_credit(self):
        from app.services.booking_service import BookingService

        booking = _booking_stub()
        invited_user = _invited_user()
        requesting_user = _requesting_user()
        from app.db.models.booking import PlayerRole, InviteStatus
        booking.players = [
            SimpleNamespace(
                user_id=requesting_user.id,
                role=PlayerRole.organiser,
                invite_status=InviteStatus.accepted,
            )
        ]

        booking_result = MagicMock()
        booking_result.scalar_one_or_none.return_value = booking
        user_result = MagicMock()
        user_result.scalar_one_or_none.return_value = invited_user

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=[booking_result, user_result])
        db.flush = AsyncMock()
        db.add = MagicMock()

        bd = _breakdown(
            amount_due="0.00",
            discount_amount="5.00",
            discount_source=DiscountSource.membership,
            credit_consumed=True,
            membership_subscription_id=SUB_ID,
        )

        svc = BookingService(db)

        with patch("app.services.booking_service.PricingService") as MockPricingSvc:
            instance = MockPricingSvc.return_value
            instance.calculate = AsyncMock(return_value=bd)
            instance.consume_credit = AsyncMock()

            with patch.object(svc, "_load_booking", AsyncMock(return_value=booking)):
                await svc.invite_player(
                    booking_id=BOOKING_ID,
                    club_id=CLUB_ID,
                    tenant_id=TENANT_ID,
                    requesting_user=requesting_user,
                    invited_user_id=INVITED_ID,
                )

        instance.consume_credit.assert_awaited_once()
        call_args = instance.consume_credit.call_args
        assert call_args.args[0] == SUB_ID
