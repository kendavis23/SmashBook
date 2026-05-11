"""
Unit tests for the invite_player and respond_to_invite pricing paths in BookingService.

Strategy: patch BookingPlayer at the module level so the ORM constructor never
fires (which would require real SQLAlchemy-instrumented objects). We verify what
kwargs were passed to the constructor instead of inspecting the resulting ORM row.

Key invariant: credits are consumed only at accept time (respond_to_invite), never
at invite time (invite_player), so a declined invite never burns a membership credit.
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.models.booking import BookingStatus, DiscountSource, InviteStatus, PaymentStatus, PlayerRole
from app.db.models.user import TenantUserRole
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

def _breakdown(amount_due="5.00", discount_amount="0.00", discount_source=None,
               credit_consumed=False, membership_subscription_id=None):
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


def _make_booking(total_price="20.00", max_players=4):
    b = MagicMock()
    b.id = BOOKING_ID
    b.club_id = CLUB_ID
    b.start_datetime = NOW + timedelta(hours=48)
    b.max_players = max_players
    b.total_price = Decimal(total_price) if total_price else None
    b.status = BookingStatus.pending
    b.players = [SimpleNamespace(
        user_id=USER_ID,
        role=PlayerRole.organiser,
        invite_status=InviteStatus.accepted,
    )]
    return b


def _make_db(booking):
    invited_user = MagicMock()
    invited_user.id = INVITED_ID
    invited_user.tenant_id = TENANT_ID

    booking_result = MagicMock()
    booking_result.scalar_one_or_none.return_value = booking
    user_result = MagicMock()
    user_result.scalar_one_or_none.return_value = invited_user

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=[booking_result, user_result])
    db.add = MagicMock()
    db.flush = AsyncMock()
    return db


def _make_requesting_user():
    u = MagicMock()
    u.id = USER_ID
    u.tenant_id = TENANT_ID
    u.role = TenantUserRole.player
    return u


async def _call_invite(svc, booking):
    with patch.object(svc, "_load_booking", AsyncMock(return_value=booking)):
        await svc.invite_player(
            booking_id=BOOKING_ID,
            club_id=CLUB_ID,
            tenant_id=TENANT_ID,
            requesting_user=_make_requesting_user(),
            invited_user_id=INVITED_ID,
        )


# ---------------------------------------------------------------------------
# Fallback path (no pricing rule)
# ---------------------------------------------------------------------------

class TestInvitePlayerPricingFallback:
    """When PricingService returns None (no rule), amount_due = total_price / max_players."""

    @pytest.mark.asyncio
    async def test_no_pricing_rule_splits_total_price(self):
        from app.services.booking_service import BookingService

        booking = _make_booking(total_price="20.00", max_players=4)
        db = _make_db(booking)
        svc = BookingService(db)

        with patch("app.services.booking_service.BookingPlayer") as MockBP, \
             patch("app.services.booking_service.PricingService") as MockPS:
            MockBP.return_value = MagicMock()
            MockPS.return_value.calculate = AsyncMock(return_value=None)

            await _call_invite(svc, booking)

        kw = MockBP.call_args.kwargs
        assert kw["amount_due"] == Decimal("5.00")   # 20.00 / 4
        assert kw["discount_amount"] is None
        assert kw["discount_source"] is None
        MockPS.return_value.consume_credit.assert_not_called()

    @pytest.mark.asyncio
    async def test_no_pricing_rule_no_total_price_gives_zero(self):
        from app.services.booking_service import BookingService

        booking = _make_booking(total_price=None, max_players=4)
        db = _make_db(booking)
        svc = BookingService(db)

        with patch("app.services.booking_service.BookingPlayer") as MockBP, \
             patch("app.services.booking_service.PricingService") as MockPS:
            MockBP.return_value = MagicMock()
            MockPS.return_value.calculate = AsyncMock(return_value=None)

            await _call_invite(svc, booking)

        assert MockBP.call_args.kwargs["amount_due"] == Decimal("0.00")


# ---------------------------------------------------------------------------
# Breakdown path (pricing rule exists)
# ---------------------------------------------------------------------------

class TestInvitePlayerPricingBreakdown:
    """When PricingService returns a breakdown, discount fields and credits are applied."""

    @pytest.mark.asyncio
    async def test_membership_discount_pct_applied(self):
        from app.services.booking_service import BookingService

        booking = _make_booking()
        db = _make_db(booking)
        svc = BookingService(db)

        bd = _breakdown(amount_due="4.00", discount_amount="1.00",
                        discount_source=DiscountSource.membership)

        with patch("app.services.booking_service.BookingPlayer") as MockBP, \
             patch("app.services.booking_service.PricingService") as MockPS:
            MockBP.return_value = MagicMock()
            MockPS.return_value.calculate = AsyncMock(return_value=bd)

            await _call_invite(svc, booking)

        kw = MockBP.call_args.kwargs
        assert kw["amount_due"] == Decimal("4.00")
        assert kw["discount_amount"] == Decimal("1.00")
        assert kw["discount_source"] == DiscountSource.membership
        MockPS.return_value.consume_credit.assert_not_called()

    @pytest.mark.asyncio
    async def test_credit_flag_does_not_consume_credit_at_invite_time(self):
        """invite_player never consumes credits — consumption is deferred to accept time."""
        from app.services.booking_service import BookingService

        booking = _make_booking()
        db = _make_db(booking)
        svc = BookingService(db)

        bd = _breakdown(amount_due="0.00", discount_amount="5.00",
                        discount_source=DiscountSource.membership,
                        credit_consumed=True, membership_subscription_id=SUB_ID)

        with patch("app.services.booking_service.BookingPlayer") as MockBP, \
             patch("app.services.booking_service.PricingService") as MockPS:
            MockBP.return_value = MagicMock()
            MockPS.return_value.calculate = AsyncMock(return_value=bd)
            MockPS.return_value.consume_credit = AsyncMock()

            await _call_invite(svc, booking)

        kw = MockBP.call_args.kwargs
        assert kw["amount_due"] == Decimal("0.00")
        MockPS.return_value.consume_credit.assert_not_called()

    @pytest.mark.asyncio
    async def test_no_credit_consumed_skips_consume_credit(self):
        from app.services.booking_service import BookingService

        booking = _make_booking()
        db = _make_db(booking)
        svc = BookingService(db)

        bd = _breakdown(credit_consumed=False)

        with patch("app.services.booking_service.BookingPlayer") as MockBP, \
             patch("app.services.booking_service.PricingService") as MockPS:
            MockBP.return_value = MagicMock()
            MockPS.return_value.calculate = AsyncMock(return_value=bd)
            MockPS.return_value.consume_credit = AsyncMock()

            await _call_invite(svc, booking)

        MockPS.return_value.consume_credit.assert_not_called()


# ---------------------------------------------------------------------------
# respond_to_invite — pricing recalculation on accept
# ---------------------------------------------------------------------------

def _make_invited_bp(user_id, amount_due="5.00"):
    bp = MagicMock()
    bp.user_id = user_id
    bp.role = PlayerRole.player
    bp.invite_status = InviteStatus.pending
    bp.payment_status = PaymentStatus.pending
    bp.amount_due = Decimal(amount_due)
    bp.discount_amount = None
    bp.discount_source = None
    bp.membership_subscription_id = None
    return bp


def _make_booking_for_respond(invited_id, max_players=4, total_price="20.00"):
    organiser = SimpleNamespace(
        user_id=USER_ID,
        role=PlayerRole.organiser,
        invite_status=InviteStatus.accepted,
    )
    bp = _make_invited_bp(invited_id)
    b = MagicMock()
    b.id = BOOKING_ID
    b.club_id = CLUB_ID
    b.start_datetime = NOW + timedelta(hours=48)
    b.max_players = max_players
    b.total_price = Decimal(total_price) if total_price else None
    b.status = BookingStatus.pending
    b.players = [organiser, bp]
    return b, bp


def _make_respond_db(booking):
    result = MagicMock()
    result.scalar_one_or_none.return_value = booking
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)
    db.flush = AsyncMock()
    return db


async def _call_respond(svc, booking, action):
    requesting_user = MagicMock()
    requesting_user.id = INVITED_ID
    with patch.object(svc, "_load_booking", AsyncMock(return_value=booking)):
        await svc.respond_to_invite(
            booking_id=BOOKING_ID,
            club_id=CLUB_ID,
            tenant_id=TENANT_ID,
            requesting_user=requesting_user,
            action=action,
        )


class TestRespondToInvitePricing:
    """Pricing is recalculated at accept time; credits are consumed then, not at invite time."""

    @pytest.mark.asyncio
    async def test_accept_applies_membership_discount(self):
        """Accepting recalculates pricing and writes the membership discount onto bp."""
        from app.services.booking_service import BookingService

        booking, bp = _make_booking_for_respond(INVITED_ID)
        db = _make_respond_db(booking)
        svc = BookingService(db)

        bd = _breakdown(amount_due="4.00", discount_amount="1.00",
                        discount_source=DiscountSource.membership,
                        membership_subscription_id=SUB_ID)

        with patch("app.services.booking_service.PricingService") as MockPS:
            MockPS.return_value.calculate = AsyncMock(return_value=bd)
            MockPS.return_value.consume_credit = AsyncMock()

            await _call_respond(svc, booking, InviteStatus.accepted)

        assert bp.amount_due == Decimal("4.00")
        assert bp.discount_amount == Decimal("1.00")
        assert bp.discount_source == DiscountSource.membership
        assert bp.membership_subscription_id == SUB_ID
        MockPS.return_value.consume_credit.assert_not_called()

    @pytest.mark.asyncio
    async def test_accept_with_credit_updates_amount_due_and_consumes_credit(self):
        """Accepting with a booking credit zeroes amount_due and calls consume_credit after flush."""
        from app.services.booking_service import BookingService

        booking, bp = _make_booking_for_respond(INVITED_ID)
        db = _make_respond_db(booking)
        svc = BookingService(db)

        bd = _breakdown(amount_due="0.00", discount_amount="5.00",
                        discount_source=DiscountSource.membership,
                        credit_consumed=True, membership_subscription_id=SUB_ID)

        with patch("app.services.booking_service.PricingService") as MockPS:
            MockPS.return_value.calculate = AsyncMock(return_value=bd)
            MockPS.return_value.consume_credit = AsyncMock()

            await _call_respond(svc, booking, InviteStatus.accepted)

        assert bp.amount_due == Decimal("0.00")
        MockPS.return_value.consume_credit.assert_awaited_once()
        call_args = MockPS.return_value.consume_credit.call_args.args
        assert call_args[0] == SUB_ID       # subscription_id
        assert call_args[1] == BOOKING_ID   # booking.id, not bp.id

    @pytest.mark.asyncio
    async def test_accept_fallback_when_no_pricing_rule(self):
        """If no pricing rule matches, amount_due falls back to total_price / max_players."""
        from app.services.booking_service import BookingService

        booking, bp = _make_booking_for_respond(INVITED_ID, max_players=4, total_price="20.00")
        db = _make_respond_db(booking)
        svc = BookingService(db)

        with patch("app.services.booking_service.PricingService") as MockPS:
            MockPS.return_value.calculate = AsyncMock(return_value=None)
            MockPS.return_value.consume_credit = AsyncMock()

            await _call_respond(svc, booking, InviteStatus.accepted)

        assert bp.amount_due == Decimal("5.00")   # 20.00 / 4
        assert bp.discount_amount is None
        assert bp.discount_source is None
        MockPS.return_value.consume_credit.assert_not_called()

    @pytest.mark.asyncio
    async def test_decline_skips_pricing_calculation(self):
        """Declining does not trigger a pricing recalculation or credit consumption."""
        from app.services.booking_service import BookingService

        booking, bp = _make_booking_for_respond(INVITED_ID)
        db = _make_respond_db(booking)
        svc = BookingService(db)

        with patch("app.services.booking_service.PricingService") as MockPS:
            MockPS.return_value.calculate = AsyncMock()
            MockPS.return_value.consume_credit = AsyncMock()

            await _call_respond(svc, booking, InviteStatus.declined)

        MockPS.return_value.calculate.assert_not_called()
        MockPS.return_value.consume_credit.assert_not_called()
