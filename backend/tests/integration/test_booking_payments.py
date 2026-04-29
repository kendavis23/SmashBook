"""
Integration tests for booking payment endpoints and service methods.

Coverage
--------
POST /payments/payment-intent    — success, no booking player, no payment method, unauthenticated
Service: confirm_payment         — sets payment succeeded, marks player paid, confirms booking
Service: handle_payment_failed   — sets payment failed, records reason, increments retry_count
POST /payments/stripe/webhook    — invalid signature → 400, unknown event type → 200, succeeded dispatch
Platform fees                    — application_fee_amount passed to Stripe PI; PlatformFee record written on confirm

All Stripe API calls are mocked — no network traffic.
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest_asyncio
import stripe
from sqlalchemy import delete as sql_delete, select

from app.db.models.booking import (
    Booking,
    BookingPlayer,
    BookingStatus,
    BookingType,
    InviteStatus,
    PaymentStatus,
    PlayerRole,
)
from app.db.models.club import Club
from app.db.models.court import Court
from app.db.models.payment import Payment, PaymentMethod as PMEnum, PaymentState, PlatformFee
from app.db.models.tenant import SubscriptionPlan
from app.db.models.user import User
from app.services.payment_service import PaymentService

STRIPE_CUSTOMER_ID = "cus_paytest111111"
STRIPE_PM_ID = "pm_paytest111111"
STRIPE_PI_ID = "pi_paytest111111"
STRIPE_PI_SECRET = "pi_paytest111111_secret_ZZZ"
STRIPE_CHARGE_ID = "ch_paytest111111"


# ---------------------------------------------------------------------------
# Local fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def court(club, test_session_factory):
    async with test_session_factory() as session:
        c = Court(club_id=club.id, name="Payment Court", surface_type="indoor", is_active=True)
        session.add(c)
        await session.commit()
        await session.refresh(c)

    yield c

    async with test_session_factory() as session:
        await session.execute(sql_delete(Court).where(Court.id == c.id))
        await session.commit()


@pytest_asyncio.fixture
async def booking(club, court, player, test_session_factory):
    from datetime import datetime, timedelta, timezone

    start = datetime.now(tz=timezone.utc) + timedelta(hours=48)
    end = start + timedelta(minutes=90)

    async with test_session_factory() as session:
        b = Booking(
            club_id=club.id,
            court_id=court.id,
            booking_type=BookingType.regular,
            status=BookingStatus.pending,
            start_datetime=start,
            end_datetime=end,
            created_by_user_id=player.id,
            is_open_game=False,
            max_players=4,
            total_price=Decimal("20.00"),
        )
        session.add(b)
        await session.commit()
        await session.refresh(b)

    yield b

    async with test_session_factory() as session:
        payment_ids = (
            await session.execute(select(Payment.id).where(Payment.booking_id == b.id))
        ).scalars().all()
        if payment_ids:
            await session.execute(sql_delete(PlatformFee).where(PlatformFee.payment_id.in_(payment_ids)))
        await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id == b.id))
        await session.execute(sql_delete(Payment).where(Payment.booking_id == b.id))
        await session.execute(sql_delete(Booking).where(Booking.id == b.id))
        await session.commit()


@pytest_asyncio.fixture
async def booking_player(booking, player, test_session_factory):
    async with test_session_factory() as session:
        bp = BookingPlayer(
            booking_id=booking.id,
            user_id=player.id,
            role=PlayerRole.organiser,
            invite_status=InviteStatus.accepted,
            payment_status=PaymentStatus.pending,
            amount_due=Decimal("20.00"),
        )
        session.add(bp)
        await session.commit()
        await session.refresh(bp)

    yield bp

    async with test_session_factory() as session:
        obj = await session.get(BookingPlayer, bp.id)
        if obj:
            await session.delete(obj)
            await session.commit()


async def _set_stripe_customer(session_factory, user_id, customer_id=STRIPE_CUSTOMER_ID):
    async with session_factory() as session:
        u = await session.get(User, user_id)
        u.stripe_customer_id = customer_id
        u.default_payment_method_id = STRIPE_PM_ID
        await session.commit()


def _mock_pi(pi_id=STRIPE_PI_ID):
    pi = MagicMock()
    pi.id = pi_id
    pi.client_secret = STRIPE_PI_SECRET
    pi.__getitem__ = lambda self, key: {
        "id": pi_id,
        "latest_charge": STRIPE_CHARGE_ID,
        "last_payment_error": None,
    }[key]
    pi.get = lambda key, default=None: {
        "id": pi_id,
        "latest_charge": STRIPE_CHARGE_ID,
        "last_payment_error": None,
    }.get(key, default)
    return pi


def _stripe_event(event_type: str, pi_id: str = STRIPE_PI_ID, extra: dict = None) -> dict:
    obj = {
        "id": pi_id,
        "latest_charge": STRIPE_CHARGE_ID,
        "last_payment_error": None,
    }
    if extra:
        obj.update(extra)
    return {
        "type": event_type,
        "data": {"object": obj},
    }


# ---------------------------------------------------------------------------
# POST /payments/payment-intent
# ---------------------------------------------------------------------------


class TestCreatePaymentIntent:
    async def test_success(self, client, player, player_headers, booking, booking_player, test_session_factory):
        await _set_stripe_customer(test_session_factory, player.id)

        mock_pi = _mock_pi()
        with patch("stripe.PaymentIntent.create", return_value=mock_pi):
            resp = await client.post(
                "/api/v1/payments/payment-intent",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["client_secret"] == STRIPE_PI_SECRET
        assert body["payment_intent_id"] == STRIPE_PI_ID
        assert body["amount"] == 2000   # £20.00 → 2000p
        assert body["currency"] == "gbp"

    async def test_payment_record_created(self, client, player, player_headers, booking, booking_player, test_session_factory):
        await _set_stripe_customer(test_session_factory, player.id)

        mock_pi = _mock_pi()
        with patch("stripe.PaymentIntent.create", return_value=mock_pi):
            await client.post(
                "/api/v1/payments/payment-intent",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )

        async with test_session_factory() as session:
            result = await session.execute(
                select(Payment).where(
                    Payment.booking_id == booking.id,
                    Payment.user_id == player.id,
                )
            )
            payment = result.scalar_one_or_none()

        assert payment is not None
        assert payment.stripe_payment_intent_id == STRIPE_PI_ID
        assert payment.state == PaymentState.pending
        assert payment.amount == Decimal("20.00")

    async def test_idempotent_reuses_pending_payment(self, client, player, player_headers, booking, booking_player, test_session_factory):
        """Calling twice must not create a second Payment row."""
        await _set_stripe_customer(test_session_factory, player.id)

        mock_pi = _mock_pi()
        with patch("stripe.PaymentIntent.create", return_value=mock_pi):
            await client.post(
                "/api/v1/payments/payment-intent",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )
            await client.post(
                "/api/v1/payments/payment-intent",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )

        async with test_session_factory() as session:
            result = await session.execute(
                select(Payment).where(Payment.booking_id == booking.id)
            )
            assert len(result.scalars().all()) == 1

    async def test_no_booking_player_returns_404(self, client, player_headers, booking):
        resp = await client.post(
            "/api/v1/payments/payment-intent",
            json={"booking_id": str(booking.id)},
            headers=player_headers,
        )
        assert resp.status_code == 404

    async def test_no_payment_method_returns_400(self, client, player, player_headers, booking, booking_player, test_session_factory):
        # Player has no stripe customer / default PM
        async with test_session_factory() as session:
            u = await session.get(User, player.id)
            u.stripe_customer_id = None
            u.default_payment_method_id = None
            await session.commit()

        with patch("stripe.Customer.create", return_value=MagicMock(id=STRIPE_CUSTOMER_ID)):
            resp = await client.post(
                "/api/v1/payments/payment-intent",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )

        assert resp.status_code == 400

    async def test_unauthenticated_returns_403(self, client, booking):
        resp = await client.post(
            "/api/v1/payments/payment-intent",
            json={"booking_id": str(booking.id)},
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Service: confirm_payment
# ---------------------------------------------------------------------------


class TestConfirmPayment:
    async def _seed_payment(self, session_factory, booking, player, pi_id=STRIPE_PI_ID) -> Payment:
        async with session_factory() as session:
            p = Payment(
                booking_id=booking.id,
                club_id=booking.club_id,
                user_id=player.id,
                amount=Decimal("20.00"),
                currency="GBP",
                payment_method=PMEnum.stripe_card,
                state=PaymentState.pending,
                stripe_payment_intent_id=pi_id,
            )
            session.add(p)
            await session.commit()
            await session.refresh(p)
        return p

    async def test_sets_payment_succeeded(self, test_session_factory, booking, player, booking_player):
        payment = await self._seed_payment(test_session_factory, booking, player)
        event = _stripe_event("payment_intent.succeeded")

        mock_charge = MagicMock()
        mock_charge.receipt_url = "https://pay.stripe.com/receipts/test"

        async with test_session_factory() as session:
            svc = PaymentService(session)
            with patch("stripe.Charge.retrieve", return_value=mock_charge):
                await svc.confirm_payment(event)

        async with test_session_factory() as session:
            p = await session.get(Payment, payment.id)
            assert p.state == PaymentState.succeeded
            assert p.stripe_charge_id == STRIPE_CHARGE_ID
            assert p.stripe_receipt_url == "https://pay.stripe.com/receipts/test"

    async def test_marks_booking_player_paid(self, test_session_factory, booking, player, booking_player):
        await self._seed_payment(test_session_factory, booking, player)
        event = _stripe_event("payment_intent.succeeded")

        async with test_session_factory() as session:
            svc = PaymentService(session)
            with patch("stripe.Charge.retrieve", return_value=MagicMock(receipt_url=None)):
                await svc.confirm_payment(event)

        async with test_session_factory() as session:
            result = await session.execute(
                select(BookingPlayer).where(
                    BookingPlayer.booking_id == booking.id,
                    BookingPlayer.user_id == player.id,
                )
            )
            bp = result.scalar_one()
            assert bp.payment_status == PaymentStatus.paid

    async def test_confirms_booking_when_all_slots_filled_and_all_paid(self, test_session_factory, booking, player, booking_player):
        # Set max_players=1 so the single booking_player fills the court
        async with test_session_factory() as session:
            b = await session.get(Booking, booking.id)
            b.max_players = 1
            await session.commit()

        await self._seed_payment(test_session_factory, booking, player)
        event = _stripe_event("payment_intent.succeeded")

        async with test_session_factory() as session:
            svc = PaymentService(session)
            with patch("stripe.Charge.retrieve", return_value=MagicMock(receipt_url=None)):
                await svc.confirm_payment(event)

        async with test_session_factory() as session:
            b = await session.get(Booking, booking.id)
            assert b.status == BookingStatus.confirmed

    async def test_does_not_confirm_when_court_not_full(self, test_session_factory, booking, player, booking_player):
        # max_players=4 but only 1 player has paid — court not full, must stay pending
        await self._seed_payment(test_session_factory, booking, player)
        event = _stripe_event("payment_intent.succeeded")

        async with test_session_factory() as session:
            svc = PaymentService(session)
            with patch("stripe.Charge.retrieve", return_value=MagicMock(receipt_url=None)):
                await svc.confirm_payment(event)

        async with test_session_factory() as session:
            b = await session.get(Booking, booking.id)
            assert b.status == BookingStatus.pending

    async def test_idempotent_on_duplicate_event(self, test_session_factory, booking, player, booking_player):
        await self._seed_payment(test_session_factory, booking, player)
        event = _stripe_event("payment_intent.succeeded")

        async with test_session_factory() as session:
            svc = PaymentService(session)
            with patch("stripe.Charge.retrieve", return_value=MagicMock(receipt_url=None)):
                await svc.confirm_payment(event)
                await svc.confirm_payment(event)  # second call must be a no-op

        async with test_session_factory() as session:
            result = await session.execute(
                select(Payment).where(Payment.booking_id == booking.id)
            )
            assert len(result.scalars().all()) == 1

    async def test_unknown_pi_is_ignored(self, test_session_factory):
        event = _stripe_event("payment_intent.succeeded", pi_id="pi_UNKNOWN")
        async with test_session_factory() as session:
            svc = PaymentService(session)
            await svc.confirm_payment(event)  # must not raise


# ---------------------------------------------------------------------------
# Service: handle_payment_failed
# ---------------------------------------------------------------------------


class TestHandlePaymentFailed:
    async def _seed_payment(self, session_factory, booking, player) -> Payment:
        async with session_factory() as session:
            p = Payment(
                booking_id=booking.id,
                club_id=booking.club_id,
                user_id=player.id,
                amount=Decimal("20.00"),
                currency="GBP",
                payment_method=PMEnum.stripe_card,
                state=PaymentState.pending,
                stripe_payment_intent_id=STRIPE_PI_ID,
                retry_count=0,
            )
            session.add(p)
            await session.commit()
            await session.refresh(p)
        return p

    async def test_sets_payment_failed(self, test_session_factory, booking, player, booking_player):
        payment = await self._seed_payment(test_session_factory, booking, player)
        event = _stripe_event(
            "payment_intent.payment_failed",
            extra={"last_payment_error": {"message": "Your card was declined."}},
        )

        async with test_session_factory() as session:
            svc = PaymentService(session)
            await svc.handle_payment_failed(event)

        async with test_session_factory() as session:
            p = await session.get(Payment, payment.id)
            assert p.state == PaymentState.failed
            assert p.failure_reason == "Your card was declined."
            assert p.retry_count == 1

    async def test_increments_retry_count(self, test_session_factory, booking, player, booking_player):
        payment = await self._seed_payment(test_session_factory, booking, player)
        event = _stripe_event("payment_intent.payment_failed")

        async with test_session_factory() as session:
            svc = PaymentService(session)
            await svc.handle_payment_failed(event)

        # Reset to pending so we can fail again
        async with test_session_factory() as session:
            p = await session.get(Payment, payment.id)
            p.state = PaymentState.pending
            await session.commit()

        async with test_session_factory() as session:
            svc = PaymentService(session)
            await svc.handle_payment_failed(event)

        async with test_session_factory() as session:
            p = await session.get(Payment, payment.id)
            assert p.retry_count == 2

    async def test_unknown_pi_is_ignored(self, test_session_factory):
        event = _stripe_event("payment_intent.payment_failed", pi_id="pi_UNKNOWN")
        async with test_session_factory() as session:
            svc = PaymentService(session)
            await svc.handle_payment_failed(event)  # must not raise


# ---------------------------------------------------------------------------
# POST /payments/stripe/webhook
# ---------------------------------------------------------------------------


class TestStripeWebhook:
    async def test_invalid_signature_returns_400(self, client):
        with patch("stripe.Webhook.construct_event", side_effect=stripe.StripeError("bad sig")):
            resp = await client.post(
                "/api/v1/payments/stripe/webhook",
                content=b'{"type":"payment_intent.succeeded"}',
                headers={"stripe-signature": "bad"},
            )
        assert resp.status_code == 400

    async def test_unknown_event_type_returns_200(self, client):
        mock_event = {"type": "customer.created", "data": {"object": {}}}
        with patch("stripe.Webhook.construct_event", return_value=mock_event):
            resp = await client.post(
                "/api/v1/payments/stripe/webhook",
                content=b"{}",
                headers={"stripe-signature": "t=1,v1=abc"},
            )
        assert resp.status_code == 200
        assert resp.json() == {"received": True}

    async def test_succeeded_event_dispatched(self, client, booking, player, booking_player, test_session_factory):
        """Webhook with payment_intent.succeeded must update Payment state."""
        # Seed a pending Payment
        async with test_session_factory() as session:
            p = Payment(
                booking_id=booking.id,
                club_id=booking.club_id,
                user_id=player.id,
                amount=Decimal("20.00"),
                currency="GBP",
                payment_method=PMEnum.stripe_card,
                state=PaymentState.pending,
                stripe_payment_intent_id=STRIPE_PI_ID,
            )
            session.add(p)
            await session.commit()
            await session.refresh(p)
            payment_id = p.id

        mock_event = _stripe_event("payment_intent.succeeded")
        with patch("stripe.Webhook.construct_event", return_value=mock_event), \
             patch("stripe.Charge.retrieve", return_value=MagicMock(receipt_url=None)):
            resp = await client.post(
                "/api/v1/payments/stripe/webhook",
                content=b"{}",
                headers={"stripe-signature": "t=1,v1=abc"},
            )

        assert resp.status_code == 200
        async with test_session_factory() as session:
            p = await session.get(Payment, payment_id)
            assert p.state == PaymentState.succeeded


# ---------------------------------------------------------------------------
# Platform fees
# ---------------------------------------------------------------------------


class TestPlatformFees:
    """
    Verify that SmashBook's booking_fee_pct is passed to Stripe as
    application_fee_amount and recorded as a PlatformFee row on confirm.
    """

    async def _activate_fees(self, test_session_factory, plan, club, fee_pct: str = "5.00"):
        """Set booking_fee_pct on the plan and a Connect account on the club."""
        async with test_session_factory() as session:
            p = await session.get(SubscriptionPlan, plan.id)
            p.booking_fee_pct = Decimal(fee_pct)
            await session.commit()
        async with test_session_factory() as session:
            c = await session.get(Club, club.id)
            c.stripe_connect_account_id = "acct_testCONNECT"
            await session.commit()

    async def _seed_payment(self, session_factory, booking, player) -> Payment:
        async with session_factory() as session:
            p = Payment(
                booking_id=booking.id,
                club_id=booking.club_id,
                user_id=player.id,
                amount=Decimal("20.00"),
                currency="GBP",
                payment_method=PMEnum.stripe_card,
                state=PaymentState.pending,
                stripe_payment_intent_id=STRIPE_PI_ID,
            )
            session.add(p)
            await session.commit()
            await session.refresh(p)
        return p

    async def test_application_fee_passed_to_stripe(
        self, client, player, player_headers, plan, club, booking, booking_player, test_session_factory
    ):
        """5 % of 2000p = 100p must be sent as application_fee_amount."""
        await self._activate_fees(test_session_factory, plan, club, "5.00")
        await _set_stripe_customer(test_session_factory, player.id)

        captured_kwargs = {}

        def capture_create(**kwargs):
            captured_kwargs.update(kwargs)
            return _mock_pi()

        with patch("stripe.PaymentIntent.create", side_effect=capture_create):
            resp = await client.post(
                "/api/v1/payments/payment-intent",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )

        assert resp.status_code == 200
        assert captured_kwargs.get("application_fee_amount") == 100
        assert captured_kwargs.get("transfer_data") == {"destination": "acct_testCONNECT"}

    async def test_no_fee_without_connect_account(
        self, client, player, player_headers, plan, booking, booking_player, test_session_factory
    ):
        """When the club has no Connect account, application_fee_amount must not be set."""
        # Set fee on plan but leave club without a Connect account
        async with test_session_factory() as session:
            p = await session.get(SubscriptionPlan, plan.id)
            p.booking_fee_pct = Decimal("5.00")
            await session.commit()

        await _set_stripe_customer(test_session_factory, player.id)

        captured_kwargs = {}

        def capture_create(**kwargs):
            captured_kwargs.update(kwargs)
            return _mock_pi()

        with patch("stripe.PaymentIntent.create", side_effect=capture_create):
            await client.post(
                "/api/v1/payments/payment-intent",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )

        assert "application_fee_amount" not in captured_kwargs

    async def test_no_fee_when_plan_pct_is_null(
        self, client, player, player_headers, club, booking, booking_player, test_session_factory
    ):
        """Plan with no booking_fee_pct → no application_fee_amount."""
        # Activate Connect account but leave booking_fee_pct as NULL
        async with test_session_factory() as session:
            c = await session.get(Club, club.id)
            c.stripe_connect_account_id = "acct_testCONNECT"
            await session.commit()

        await _set_stripe_customer(test_session_factory, player.id)

        captured_kwargs = {}

        def capture_create(**kwargs):
            captured_kwargs.update(kwargs)
            return _mock_pi()

        with patch("stripe.PaymentIntent.create", side_effect=capture_create):
            await client.post(
                "/api/v1/payments/payment-intent",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )

        assert "application_fee_amount" not in captured_kwargs

    async def test_platform_fee_record_created_on_confirm(
        self, plan, club, booking, player, booking_player, test_session_factory
    ):
        """confirm_payment must write a PlatformFee row with correct amount and pct."""
        await self._activate_fees(test_session_factory, plan, club, "5.00")
        payment = await self._seed_payment(test_session_factory, booking, player)
        event = _stripe_event("payment_intent.succeeded")

        async with test_session_factory() as session:
            svc = PaymentService(session)
            with patch("stripe.Charge.retrieve", return_value=MagicMock(receipt_url=None)):
                await svc.confirm_payment(event)

        async with test_session_factory() as session:
            result = await session.execute(
                select(PlatformFee).where(PlatformFee.payment_id == payment.id)
            )
            fee = result.scalar_one_or_none()

        assert fee is not None
        assert fee.pct_applied == Decimal("5.00")
        assert fee.amount == Decimal("1.00")  # 5% of £20.00
        assert fee.fee_type.value == "booking_fee"

    async def test_no_platform_fee_record_when_pct_null(
        self, booking, player, booking_player, test_session_factory
    ):
        """No PlatformFee row when the plan has no booking_fee_pct."""
        payment = await self._seed_payment(test_session_factory, booking, player)
        event = _stripe_event("payment_intent.succeeded")

        async with test_session_factory() as session:
            svc = PaymentService(session)
            with patch("stripe.Charge.retrieve", return_value=MagicMock(receipt_url=None)):
                await svc.confirm_payment(event)

        async with test_session_factory() as session:
            result = await session.execute(
                select(PlatformFee).where(PlatformFee.payment_id == payment.id)
            )
            assert result.scalar_one_or_none() is None
