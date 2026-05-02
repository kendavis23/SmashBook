"""
Unit tests for PaymentService wallet methods (get_wallet, top_up_wallet, _handle_wallet_top_up_succeeded).

All DB interaction is mocked — no database required.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.services.payment_service import PaymentService

WALLET_ID = uuid.uuid4()
USER_ID = uuid.uuid4()
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
        assert result["amount"] == 2000
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
