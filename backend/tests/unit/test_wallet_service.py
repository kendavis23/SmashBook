"""
Unit tests for PaymentService wallet methods (get_wallet, top_up_wallet,
_handle_wallet_top_up_succeeded, deduct_wallet, settle_wallet_debts).

All DB interaction is mocked — no database required.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import stripe
from fastapi import HTTPException

from app.db.models.booking import BookingStatus, InviteStatus, PaymentStatus
from app.db.models.payment import PaymentState
from app.db.models.wallet import WalletTransactionSource
from app.services.payment_service import PaymentService

WALLET_ID = uuid.uuid4()
USER_ID = uuid.uuid4()
CLUB_ID = uuid.uuid4()
TENANT_ID = uuid.uuid4()
TXN_ID_1 = uuid.uuid4()
TXN_ID_2 = uuid.uuid4()

NOW = datetime.now(tz=timezone.utc)


def _wallet(*, balance="12.50", currency="GBP"):
    return SimpleNamespace(
        id=WALLET_ID,
        user_id=USER_ID,
        balance=Decimal(balance),
        currency=currency,
        auto_topup_enabled=False,
        auto_topup_threshold=None,
        auto_topup_amount=None,
        transactions=[],
    )


def _txn(txn_id, *, amount="20.00", balance_after="20.00", transaction_type="top_up", created_at=None):
    return SimpleNamespace(
        id=txn_id,
        wallet_id=WALLET_ID,
        transaction_type=transaction_type,
        amount=Decimal(amount),
        balance_after=Decimal(balance_after),
        reference=None,
        notes=None,
        created_at=created_at or NOW,
    )


def _db_wallet_found(wallet, transactions):
    db = AsyncMock()
    wallet_result = MagicMock()
    wallet_result.scalar_one_or_none.return_value = wallet
    txn_result = MagicMock()
    txn_result.scalars.return_value.all.return_value = transactions
    db.execute = AsyncMock(side_effect=[wallet_result, txn_result])
    return db


def _db_wallet_not_found():
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)
    return db


# ---------------------------------------------------------------------------
# get_wallet — wallet found
# ---------------------------------------------------------------------------

class TestGetWalletFound:

    @pytest.mark.asyncio
    async def test_returns_wallet_with_balance(self):
        wallet = _wallet(balance="12.50", currency="GBP")
        svc = PaymentService(_db_wallet_found(wallet, []))
        result = await svc.get_wallet(USER_ID)
        assert result["balance"] == Decimal("12.50")
        assert result["currency"] == "GBP"

    @pytest.mark.asyncio
    async def test_returns_auto_topup_fields(self):
        wallet = _wallet()
        wallet.auto_topup_enabled = True
        wallet.auto_topup_threshold = Decimal("5.00")
        wallet.auto_topup_amount = Decimal("20.00")
        svc = PaymentService(_db_wallet_found(wallet, []))
        result = await svc.get_wallet(USER_ID)
        assert result["auto_topup_enabled"] is True
        assert result["auto_topup_threshold"] == Decimal("5.00")
        assert result["auto_topup_amount"] == Decimal("20.00")

    @pytest.mark.asyncio
    async def test_transactions_are_attached(self):
        wallet = _wallet()
        txns = [_txn(TXN_ID_1, amount="20.00"), _txn(TXN_ID_2, amount="5.00")]
        svc = PaymentService(_db_wallet_found(wallet, txns))
        result = await svc.get_wallet(USER_ID)
        assert len(result["transactions"]) == 2

    @pytest.mark.asyncio
    async def test_empty_transaction_history(self):
        wallet = _wallet()
        svc = PaymentService(_db_wallet_found(wallet, []))
        result = await svc.get_wallet(USER_ID)
        assert result["transactions"] == []

    @pytest.mark.asyncio
    async def test_transaction_fields_preserved(self):
        wallet = _wallet()
        txn = _txn(TXN_ID_1, amount="20.00", balance_after="20.00", transaction_type="top_up")
        svc = PaymentService(_db_wallet_found(wallet, [txn]))
        result = await svc.get_wallet(USER_ID)
        t = result["transactions"][0]
        assert t["amount"] == Decimal("20.00")
        assert t["balance_after"] == Decimal("20.00")
        assert t["transaction_type"] == "top_up"


# ---------------------------------------------------------------------------
# get_wallet — wallet not found
# ---------------------------------------------------------------------------

class TestGetWalletNotFound:

    @pytest.mark.asyncio
    async def test_raises_404_when_no_wallet(self):
        svc = PaymentService(_db_wallet_not_found())
        with pytest.raises(HTTPException) as exc_info:
            await svc.get_wallet(USER_ID)
        assert exc_info.value.status_code == 404
        assert "Wallet not found" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_transaction_query_not_called_when_no_wallet(self):
        db = _db_wallet_not_found()
        svc = PaymentService(db)
        with pytest.raises(HTTPException):
            await svc.get_wallet(USER_ID)
        assert db.execute.call_count == 1


# ---------------------------------------------------------------------------
# Helpers for top_up_wallet / webhook tests
# ---------------------------------------------------------------------------

STRIPE_CUSTOMER_ID = "cus_testWALLETAAAA"
STRIPE_PM_ID = "pm_testWALLETAAAA"
STRIPE_PI_ID = "pi_testWALLETAAAA"
STRIPE_PI_SECRET = "pi_testWALLETAAAA_secret_ZZZ"


def _user(*, customer_id=None, default_pm_id=None):
    return SimpleNamespace(
        id=USER_ID,
        stripe_customer_id=customer_id,
        default_payment_method_id=default_pm_id,
    )


def _mock_pi(amount=2000):
    pi = MagicMock()
    pi.id = STRIPE_PI_ID
    pi.client_secret = STRIPE_PI_SECRET
    pi.amount = amount
    return pi


def _db_for_top_up(wallet=None):
    """DB mock that returns `wallet` from the first execute (wallet lookup)."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = wallet
    db.execute = AsyncMock(return_value=result)
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


def _wallet_obj(balance="10.00"):
    return SimpleNamespace(
        id=WALLET_ID,
        user_id=USER_ID,
        balance=Decimal(balance),
        currency="GBP",
        transactions=[],
    )


def _top_up_event(*, wallet_id, user_id, amount=2000):
    return {
        "data": {
            "object": {
                "id": STRIPE_PI_ID,
                "amount": amount,
                "metadata": {
                    "purpose": "wallet_top_up",
                    "user_id": str(user_id),
                    "wallet_id": str(wallet_id),
                },
            }
        }
    }


# ---------------------------------------------------------------------------
# top_up_wallet
# ---------------------------------------------------------------------------

class TestTopUpWallet:

    @pytest.mark.asyncio
    async def test_returns_client_secret_and_pi_id(self):
        user = _user(customer_id=STRIPE_CUSTOMER_ID, default_pm_id=STRIPE_PM_ID)
        db = _db_for_top_up(_wallet_obj())
        with patch("stripe.PaymentIntent.create", return_value=_mock_pi(2000)):
            result = await PaymentService(db).top_up_wallet(user, 2000, STRIPE_PM_ID)
        assert result["client_secret"] == STRIPE_PI_SECRET
        assert result["payment_intent_id"] == STRIPE_PI_ID
        assert result["amount"] == Decimal("20.00")  # £20.00
        assert result["currency"] == "gbp"

    @pytest.mark.asyncio
    async def test_falls_back_to_default_payment_method(self):
        user = _user(customer_id=STRIPE_CUSTOMER_ID, default_pm_id=STRIPE_PM_ID)
        db = _db_for_top_up(_wallet_obj())
        with patch("stripe.PaymentIntent.create", return_value=_mock_pi()) as mock_create:
            await PaymentService(db).top_up_wallet(user, 1000, None)
        call_kwargs = mock_create.call_args[1]
        assert call_kwargs["payment_method"] == STRIPE_PM_ID

    @pytest.mark.asyncio
    async def test_amount_below_minimum_raises_400(self):
        user = _user(customer_id=STRIPE_CUSTOMER_ID, default_pm_id=STRIPE_PM_ID)
        db = _db_for_top_up(_wallet_obj())
        with pytest.raises(HTTPException) as exc_info:
            await PaymentService(db).top_up_wallet(user, 99)
        assert exc_info.value.status_code == 400
        assert "100" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_no_payment_method_raises_400(self):
        user = _user(customer_id=STRIPE_CUSTOMER_ID, default_pm_id=None)
        db = _db_for_top_up(_wallet_obj())
        with pytest.raises(HTTPException) as exc_info:
            await PaymentService(db).top_up_wallet(user, 1000, None)
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_creates_wallet_when_none_exists(self):
        user = _user(customer_id=STRIPE_CUSTOMER_ID, default_pm_id=STRIPE_PM_ID)
        db = _db_for_top_up(None)
        with patch("stripe.PaymentIntent.create", return_value=_mock_pi()):
            await PaymentService(db).top_up_wallet(user, 1000, STRIPE_PM_ID)
        db.add.assert_called()
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_pi_metadata_contains_purpose_and_wallet_id(self):
        user = _user(customer_id=STRIPE_CUSTOMER_ID, default_pm_id=STRIPE_PM_ID)
        wallet = _wallet_obj()
        db = _db_for_top_up(wallet)
        with patch("stripe.PaymentIntent.create", return_value=_mock_pi()) as mock_create:
            await PaymentService(db).top_up_wallet(user, 1500, STRIPE_PM_ID)
        metadata = mock_create.call_args[1]["metadata"]
        assert metadata["purpose"] == "wallet_top_up"
        assert metadata["user_id"] == str(USER_ID)
        assert metadata["wallet_id"] == str(WALLET_ID)


# ---------------------------------------------------------------------------
# _handle_wallet_top_up_succeeded (via confirm_payment)
# ---------------------------------------------------------------------------

class TestHandleWalletTopUpSucceeded:

    def _db_for_webhook(self, wallet):
        """DB mock that returns `wallet` from a wallet-by-id lookup."""
        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = wallet
        db.execute = AsyncMock(return_value=result)
        db.add = MagicMock()
        db.commit = AsyncMock()
        return db

    @pytest.mark.asyncio
    async def test_credits_wallet_balance(self):
        wallet = _wallet_obj(balance="10.00")
        db = self._db_for_webhook(wallet)
        event = _top_up_event(wallet_id=WALLET_ID, user_id=USER_ID, amount=2000)
        await PaymentService(db).confirm_payment(event)
        assert wallet.balance == Decimal("30.00")

    @pytest.mark.asyncio
    async def test_creates_wallet_transaction(self):
        wallet = _wallet_obj(balance="5.00")
        db = self._db_for_webhook(wallet)
        event = _top_up_event(wallet_id=WALLET_ID, user_id=USER_ID, amount=1000)
        await PaymentService(db).confirm_payment(event)
        db.add.assert_called()

    @pytest.mark.asyncio
    async def test_unknown_wallet_id_is_ignored(self):
        db = self._db_for_webhook(None)
        event = _top_up_event(wallet_id=uuid.uuid4(), user_id=USER_ID, amount=500)
        await PaymentService(db).confirm_payment(event)
        db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_missing_wallet_id_in_metadata_is_ignored(self):
        db = AsyncMock()
        event = {
            "data": {
                "object": {
                    "id": STRIPE_PI_ID,
                    "amount": 1000,
                    "metadata": {"purpose": "wallet_top_up", "user_id": str(USER_ID)},
                }
            }
        }
        await PaymentService(db).confirm_payment(event)
        db.execute.assert_not_called()


# ---------------------------------------------------------------------------
# Helpers for deduct_wallet tests
# ---------------------------------------------------------------------------

PLAN_ID = uuid.uuid4()
SOURCE_ID = uuid.uuid4()


def _plan_obj(*, fee_pct="5.00"):
    return SimpleNamespace(
        id=PLAN_ID,
        booking_fee_pct=Decimal(fee_pct) if fee_pct is not None else None,
    )


def _tenant_obj():
    return SimpleNamespace(id=TENANT_ID, plan_id=PLAN_ID)


def _club_obj(*, connect_account="acct_test123", currency="GBP"):
    return SimpleNamespace(
        id=CLUB_ID,
        tenant_id=TENANT_ID,
        stripe_connect_account_id=connect_account,
        currency=currency,
    )


def _booking_obj(*, max_players=1):
    return SimpleNamespace(
        id=SOURCE_ID,
        club_id=CLUB_ID,
        status=BookingStatus.pending,
        max_players=max_players,
    )


def _bp_obj(*, user_id=None, payment_status=None):
    return SimpleNamespace(
        id=uuid.uuid4(),
        booking_id=SOURCE_ID,
        user_id=user_id or USER_ID,
        invite_status=InviteStatus.accepted,
        payment_status=payment_status or PaymentStatus.pending,
    )


def _db_for_deduct(wallet, club_row, *, plan=None, booking=None, bp=None, all_bps=None):
    """
    plan: fee source; defaults to _plan_obj(fee_pct="0") when None.
    booking, bp, all_bps: supply to exercise the booking-payment branch.
    """
    db = AsyncMock()

    wallet_result = MagicMock()
    wallet_result.scalar_one_or_none.return_value = wallet
    club_result = MagicMock()
    club_result.one_or_none.return_value = club_row

    execute_side_effects = [wallet_result, club_result]
    if bp is not None:
        bp_result = MagicMock()
        bp_result.scalar_one_or_none.return_value = bp
        all_bp_result = MagicMock()
        all_bp_result.scalars.return_value.all.return_value = all_bps or [bp]
        execute_side_effects += [bp_result, all_bp_result]

    db.execute = AsyncMock(side_effect=execute_side_effects)

    _plan = plan if plan is not None else _plan_obj(fee_pct="0")

    async def _get(model_class, pk):
        if model_class.__name__ == "SubscriptionPlan":
            return _plan
        if model_class.__name__ == "Booking":
            return booking
        return None

    db.get = AsyncMock(side_effect=_get)
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    return db


# ---------------------------------------------------------------------------
# deduct_wallet
# ---------------------------------------------------------------------------

class TestDeductWallet:

    @pytest.mark.asyncio
    async def test_happy_path_returns_balance_after_and_transaction_id(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()))
        result = await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("15.00"), WalletTransactionSource.membership, SOURCE_ID
        )
        assert result["balance_after"] == Decimal("35.00")
        assert "transaction_id" in result

    @pytest.mark.asyncio
    async def test_balance_is_decremented(self):
        wallet = _wallet_obj(balance="30.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("10.00"), WalletTransactionSource.membership, SOURCE_ID
        )
        assert wallet.balance == Decimal("20.00")

    @pytest.mark.asyncio
    async def test_platform_fee_computed_from_plan_booking_fee_pct(self):
        wallet = _wallet_obj(balance="100.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()), plan=_plan_obj(fee_pct="5.00"))
        added = []
        db.add = MagicMock(side_effect=lambda obj: added.append(obj))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.membership, SOURCE_ID
        )
        from app.db.models.wallet import WalletClubDebt
        debts = [o for o in added if isinstance(o, WalletClubDebt)]
        assert len(debts) == 1
        assert debts[0].platform_fee_amount == Decimal("1.00")  # 5% of £20

    @pytest.mark.asyncio
    async def test_zero_fee_when_booking_fee_pct_is_none(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()), plan=_plan_obj(fee_pct=None))
        added = []
        db.add = MagicMock(side_effect=lambda obj: added.append(obj))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.membership, SOURCE_ID
        )
        from app.db.models.wallet import WalletClubDebt
        debts = [o for o in added if isinstance(o, WalletClubDebt)]
        assert debts[0].platform_fee_amount == Decimal("0")

    @pytest.mark.asyncio
    async def test_source_type_and_source_id_written_to_transaction(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()))
        added = []
        db.add = MagicMock(side_effect=lambda obj: added.append(obj))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("10.00"), WalletTransactionSource.membership, SOURCE_ID
        )
        from app.db.models.wallet import WalletTransaction
        txns = [o for o in added if isinstance(o, WalletTransaction)]
        assert txns[0].source_type == WalletTransactionSource.membership
        assert txns[0].source_id == SOURCE_ID

    @pytest.mark.asyncio
    async def test_insufficient_balance_raises_402(self):
        wallet = _wallet_obj(balance="5.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()))
        with pytest.raises(HTTPException) as exc_info:
            await PaymentService(db).deduct_wallet(
                USER_ID, CLUB_ID, Decimal("10.00"), WalletTransactionSource.booking, SOURCE_ID
            )
        assert exc_info.value.status_code == 402

    @pytest.mark.asyncio
    async def test_wallet_not_found_raises_404(self):
        wallet_result = MagicMock()
        wallet_result.scalar_one_or_none.return_value = None
        db = AsyncMock()
        db.execute = AsyncMock(return_value=wallet_result)
        with pytest.raises(HTTPException) as exc_info:
            await PaymentService(db).deduct_wallet(
                USER_ID, CLUB_ID, Decimal("10.00"), WalletTransactionSource.booking, SOURCE_ID
            )
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_club_not_found_raises_404(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, None)
        with pytest.raises(HTTPException) as exc_info:
            await PaymentService(db).deduct_wallet(
                USER_ID, CLUB_ID, Decimal("10.00"), WalletTransactionSource.booking, SOURCE_ID
            )
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_all_db_writes_committed_atomically(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        bp = _bp_obj()
        booking = _booking_obj()
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()), booking=booking, bp=bp)
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("10.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        assert db.flush.call_count == 3  # txn, debt, payment
        db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# deduct_wallet — booking payment branch
# ---------------------------------------------------------------------------

class TestDeductWalletBookingPath:

    @pytest.mark.asyncio
    async def test_creates_payment_record_with_wallet_method(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        bp = _bp_obj()
        booking = _booking_obj()
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()), booking=booking, bp=bp)
        added = []
        db.add = MagicMock(side_effect=lambda obj: added.append(obj))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        from app.db.models.payment import Payment, PaymentMethod, PaymentState
        payments = [o for o in added if isinstance(o, Payment)]
        assert len(payments) == 1
        assert payments[0].payment_method == PaymentMethod.wallet
        assert payments[0].state == PaymentState.succeeded
        assert payments[0].booking_id == SOURCE_ID
        assert payments[0].user_id == USER_ID
        assert payments[0].amount == Decimal("20.00")

    @pytest.mark.asyncio
    async def test_creates_platform_fee_when_fee_nonzero(self):
        wallet = _wallet_obj(balance="100.00")
        wallet.id = WALLET_ID
        bp = _bp_obj()
        booking = _booking_obj()
        db = _db_for_deduct(
            wallet, (_club_obj(), _tenant_obj()),
            plan=_plan_obj(fee_pct="5.00"), booking=booking, bp=bp,
        )
        added = []
        db.add = MagicMock(side_effect=lambda obj: added.append(obj))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        from app.db.models.payment import PlatformFee
        fees = [o for o in added if isinstance(o, PlatformFee)]
        assert len(fees) == 1
        assert fees[0].amount == Decimal("1.00")  # 5% of £20
        assert fees[0].pct_applied == Decimal("5.00")

    @pytest.mark.asyncio
    async def test_no_platform_fee_when_fee_is_zero(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        bp = _bp_obj()
        booking = _booking_obj()
        db = _db_for_deduct(
            wallet, (_club_obj(), _tenant_obj()),
            plan=_plan_obj(fee_pct="0"), booking=booking, bp=bp,
        )
        added = []
        db.add = MagicMock(side_effect=lambda obj: added.append(obj))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        from app.db.models.payment import PlatformFee
        fees = [o for o in added if isinstance(o, PlatformFee)]
        assert len(fees) == 0

    @pytest.mark.asyncio
    async def test_marks_booking_player_paid(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        bp = _bp_obj()
        booking = _booking_obj()
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()), booking=booking, bp=bp)
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        assert bp.payment_status == PaymentStatus.paid

    @pytest.mark.asyncio
    async def test_confirms_booking_when_all_players_paid(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        bp = _bp_obj()
        booking = _booking_obj(max_players=1)
        # all_bps shares the same object so mutation is visible to the confirm check
        db = _db_for_deduct(
            wallet, (_club_obj(), _tenant_obj()),
            booking=booking, bp=bp, all_bps=[bp],
        )
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        assert booking.status == BookingStatus.confirmed

    @pytest.mark.asyncio
    async def test_does_not_confirm_when_other_player_still_unpaid(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        bp1 = _bp_obj()
        bp2 = _bp_obj(user_id=uuid.uuid4(), payment_status=PaymentStatus.pending)
        booking = _booking_obj(max_players=2)
        db = _db_for_deduct(
            wallet, (_club_obj(), _tenant_obj()),
            booking=booking, bp=bp1, all_bps=[bp1, bp2],
        )
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        assert booking.status == BookingStatus.pending

    @pytest.mark.asyncio
    async def test_non_booking_source_does_not_create_payment_record(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()))
        added = []
        db.add = MagicMock(side_effect=lambda obj: added.append(obj))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.membership, SOURCE_ID
        )
        from app.db.models.payment import Payment
        payments = [o for o in added if isinstance(o, Payment)]
        assert len(payments) == 0

    @pytest.mark.asyncio
    async def test_publishes_send_payment_receipt_after_commit(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        bp = _bp_obj()
        booking = _booking_obj()
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()), booking=booking, bp=bp)
        with patch("app.services.payment_service.publish_notification_event") as mock_publish:
            await PaymentService(db).deduct_wallet(
                USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.booking, SOURCE_ID
            )
        mock_publish.assert_called_once()
        args, _kwargs = mock_publish.call_args
        assert args[0] == "send_payment_receipt"
        payload = args[1]
        assert payload["user_id"] == str(USER_ID)
        assert payload["booking_id"] == str(SOURCE_ID)
        assert payload["amount"] == "20.00"
        assert payload["payment_method"] == "wallet"

    @pytest.mark.asyncio
    async def test_non_booking_source_does_not_publish_receipt(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()))
        with patch("app.services.payment_service.publish_notification_event") as mock_publish:
            await PaymentService(db).deduct_wallet(
                USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.membership, SOURCE_ID
            )
        mock_publish.assert_not_called()

    @pytest.mark.asyncio
    async def test_notification_failure_does_not_break_payment(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        bp = _bp_obj()
        booking = _booking_obj()
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj()), booking=booking, bp=bp)
        with patch(
            "app.services.payment_service.publish_notification_event",
            side_effect=RuntimeError("pubsub down"),
        ):
            # Must not raise; wallet has already been debited and committed.
            result = await PaymentService(db).deduct_wallet(
                USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.booking, SOURCE_ID
            )
        assert result["balance_after"] == Decimal("30.00")
        db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# supersede_pending_stripe_payment
# ---------------------------------------------------------------------------

BOOKING_ID = uuid.uuid4()
EXISTING_PI_ID = "pi_supersede123"


def _pending_payment(*, pi_id=EXISTING_PI_ID):
    return SimpleNamespace(
        id=uuid.uuid4(),
        booking_id=BOOKING_ID,
        user_id=USER_ID,
        state=PaymentState.pending,
        stripe_payment_intent_id=pi_id,
        failure_reason=None,
    )


def _db_with_pending_payment(payment):
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = payment
    db.execute = AsyncMock(return_value=result)
    db.add = MagicMock()
    db.flush = AsyncMock()
    return db


class TestSupersedePendingStripePayment:

    @pytest.mark.asyncio
    async def test_no_pending_payment_is_noop(self):
        db = _db_with_pending_payment(None)
        with patch("stripe.PaymentIntent.cancel") as mock_cancel:
            await PaymentService(db).supersede_pending_stripe_payment(BOOKING_ID, USER_ID)
        mock_cancel.assert_not_called()
        db.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_cancels_pi_and_marks_payment_failed(self):
        payment = _pending_payment()
        db = _db_with_pending_payment(payment)
        with patch("stripe.PaymentIntent.cancel") as mock_cancel:
            await PaymentService(db).supersede_pending_stripe_payment(BOOKING_ID, USER_ID)
        mock_cancel.assert_called_once_with(EXISTING_PI_ID)
        assert payment.state == PaymentState.failed
        assert payment.failure_reason == "Superseded by wallet payment"

    @pytest.mark.asyncio
    async def test_pending_payment_without_pi_just_marks_failed(self):
        payment = _pending_payment(pi_id=None)
        db = _db_with_pending_payment(payment)
        with patch("stripe.PaymentIntent.cancel") as mock_cancel:
            await PaymentService(db).supersede_pending_stripe_payment(BOOKING_ID, USER_ID)
        mock_cancel.assert_not_called()
        assert payment.state == PaymentState.failed

    @pytest.mark.asyncio
    async def test_raises_409_if_pi_already_succeeded(self):
        payment = _pending_payment()
        db = _db_with_pending_payment(payment)
        succeeded_pi = MagicMock()
        succeeded_pi.status = "succeeded"
        with patch("stripe.PaymentIntent.cancel", side_effect=stripe.InvalidRequestError("bad state", "param")):
            with patch("stripe.PaymentIntent.retrieve", return_value=succeeded_pi):
                with pytest.raises(HTTPException) as exc_info:
                    await PaymentService(db).supersede_pending_stripe_payment(BOOKING_ID, USER_ID)
        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_swallows_cancel_error_when_pi_not_succeeded(self):
        """E.g. PI already cancelled or in a state we don't care about — proceed."""
        payment = _pending_payment()
        db = _db_with_pending_payment(payment)
        cancelled_pi = MagicMock()
        cancelled_pi.status = "canceled"
        with patch("stripe.PaymentIntent.cancel", side_effect=stripe.InvalidRequestError("bad state", "param")):
            with patch("stripe.PaymentIntent.retrieve", return_value=cancelled_pi):
                # Must not raise
                await PaymentService(db).supersede_pending_stripe_payment(BOOKING_ID, USER_ID)
        assert payment.state == PaymentState.failed

    @pytest.mark.asyncio
    async def test_swallows_network_error_on_cancel(self):
        payment = _pending_payment()
        db = _db_with_pending_payment(payment)
        with patch("stripe.PaymentIntent.cancel", side_effect=stripe.APIConnectionError("network")):
            # Must not raise; we still mark the payment failed locally
            await PaymentService(db).supersede_pending_stripe_payment(BOOKING_ID, USER_ID)
        assert payment.state == PaymentState.failed


# ---------------------------------------------------------------------------
# Helpers for settle_wallet_debts tests
# ---------------------------------------------------------------------------

STRIPE_TRANSFER_ID = "tr_testSETTLE001"


def _debt_obj(*, amount="15.00", fee="0.75", club_id=None):
    return SimpleNamespace(
        id=uuid.uuid4(),
        club_id=club_id or CLUB_ID,
        tenant_id=TENANT_ID,
        wallet_transaction_id=uuid.uuid4(),
        amount=Decimal(amount),
        platform_fee_amount=Decimal(fee),
        stripe_transfer_id=None,
        settled_at=None,
    )


def _db_for_settle(rows):
    db = AsyncMock()
    result = MagicMock()
    result.all.return_value = rows
    db.execute = AsyncMock(return_value=result)
    db.add = MagicMock()
    db.commit = AsyncMock()
    return db


def _mock_transfer():
    t = MagicMock()
    t.id = STRIPE_TRANSFER_ID
    return t


# ---------------------------------------------------------------------------
# settle_wallet_debts
# ---------------------------------------------------------------------------

class TestSettleWalletDebts:

    @pytest.mark.asyncio
    async def test_returns_zero_counts_when_no_unsettled_debts(self):
        db = _db_for_settle([])
        result = await PaymentService(db).settle_wallet_debts()
        assert result == {"settled_count": 0, "total_transferred": Decimal("0"), "skipped_count": 0}

    @pytest.mark.asyncio
    async def test_happy_path_stamps_settled_at_and_transfer_id(self):
        club = _club_obj()
        debt = _debt_obj(amount="15.00", fee="0.75")
        db = _db_for_settle([(debt, club)])
        with patch("stripe.Transfer.create", return_value=_mock_transfer()):
            await PaymentService(db).settle_wallet_debts()
        assert debt.stripe_transfer_id == STRIPE_TRANSFER_ID
        assert debt.settled_at is not None

    @pytest.mark.asyncio
    async def test_net_amount_excludes_platform_fee(self):
        club = _club_obj()
        debt = _debt_obj(amount="20.00", fee="1.00")  # net = £19.00 = 1900p
        db = _db_for_settle([(debt, club)])
        with patch("stripe.Transfer.create", return_value=_mock_transfer()) as mock_transfer:
            await PaymentService(db).settle_wallet_debts()
        call_kwargs = mock_transfer.call_args[1]
        assert call_kwargs["amount"] == 1900
        assert call_kwargs["destination"] == "acct_test123"

    @pytest.mark.asyncio
    async def test_multiple_debts_for_same_club_in_one_transfer(self):
        club = _club_obj()
        debt1 = _debt_obj(amount="10.00", fee="0.50")
        debt2 = _debt_obj(amount="15.00", fee="0.75")
        db = _db_for_settle([(debt1, club), (debt2, club)])
        with patch("stripe.Transfer.create", return_value=_mock_transfer()) as mock_transfer:
            result = await PaymentService(db).settle_wallet_debts()
        assert mock_transfer.call_count == 1  # one transfer for both debts
        assert result["settled_count"] == 2
        call_kwargs = mock_transfer.call_args[1]
        assert call_kwargs["amount"] == 2375  # (£10-£0.50) + (£15-£0.75) = £23.75

    @pytest.mark.asyncio
    async def test_skips_club_without_connect_account(self):
        club = _club_obj(connect_account=None)
        debt = _debt_obj()
        db = _db_for_settle([(debt, club)])
        with patch("stripe.Transfer.create") as mock_transfer:
            result = await PaymentService(db).settle_wallet_debts()
        mock_transfer.assert_not_called()
        assert result["skipped_count"] == 1
        assert result["settled_count"] == 0

    @pytest.mark.asyncio
    async def test_returns_correct_counts_with_mixed_clubs(self):
        club_with_account = _club_obj(connect_account="acct_test")
        club_without_account = _club_obj(connect_account=None)
        club_without_account.id = uuid.uuid4()
        debt1 = _debt_obj(amount="10.00", fee="0", club_id=club_with_account.id)
        debt2 = _debt_obj(amount="5.00", fee="0", club_id=club_without_account.id)
        db = _db_for_settle([(debt1, club_with_account), (debt2, club_without_account)])
        with patch("stripe.Transfer.create", return_value=_mock_transfer()):
            result = await PaymentService(db).settle_wallet_debts()
        assert result["settled_count"] == 1
        assert result["skipped_count"] == 1

    @pytest.mark.asyncio
    async def test_stripe_error_raises_502(self):
        club = _club_obj()
        debt = _debt_obj()
        db = _db_for_settle([(debt, club)])
        with patch("stripe.Transfer.create", side_effect=stripe.StripeError("network error")):
            with pytest.raises(HTTPException) as exc_info:
                await PaymentService(db).settle_wallet_debts()
        assert exc_info.value.status_code == 502

    @pytest.mark.asyncio
    async def test_commit_called_after_settlement(self):
        club = _club_obj()
        debt = _debt_obj()
        db = _db_for_settle([(debt, club)])
        with patch("stripe.Transfer.create", return_value=_mock_transfer()):
            await PaymentService(db).settle_wallet_debts()
        db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_passes_deterministic_idempotency_key_to_stripe(self):
        """Same set of debts → same idempotency key → Stripe deduplicates if retried."""
        club = _club_obj()
        debt1 = _debt_obj(amount="10.00", fee="0")
        debt2 = _debt_obj(amount="15.00", fee="0")
        db = _db_for_settle([(debt1, club), (debt2, club)])
        with patch("stripe.Transfer.create", return_value=_mock_transfer()) as mock_transfer:
            await PaymentService(db).settle_wallet_debts()
        call_kwargs = mock_transfer.call_args[1]
        assert "idempotency_key" in call_kwargs
        key = call_kwargs["idempotency_key"]
        assert key.startswith("settle-")

        # Same inputs → same key (verifies determinism)
        debt1_again = _debt_obj(amount="10.00", fee="0")
        debt1_again.id = debt1.id
        debt2_again = _debt_obj(amount="15.00", fee="0")
        debt2_again.id = debt2.id
        db2 = _db_for_settle([(debt1_again, club), (debt2_again, club)])
        with patch("stripe.Transfer.create", return_value=_mock_transfer()) as mock_transfer2:
            await PaymentService(db2).settle_wallet_debts()
        assert mock_transfer2.call_args[1]["idempotency_key"] == key

    @pytest.mark.asyncio
    async def test_idempotency_key_differs_for_different_debt_sets(self):
        club = _club_obj()
        debt_a = _debt_obj(amount="10.00", fee="0")
        db_a = _db_for_settle([(debt_a, club)])
        with patch("stripe.Transfer.create", return_value=_mock_transfer()) as mock_a:
            await PaymentService(db_a).settle_wallet_debts()
        key_a = mock_a.call_args[1]["idempotency_key"]

        debt_b = _debt_obj(amount="10.00", fee="0")
        db_b = _db_for_settle([(debt_b, club)])
        with patch("stripe.Transfer.create", return_value=_mock_transfer()) as mock_b:
            await PaymentService(db_b).settle_wallet_debts()
        key_b = mock_b.call_args[1]["idempotency_key"]

        assert key_a != key_b  # different debt IDs → different keys
