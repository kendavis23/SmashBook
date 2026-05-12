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

SOURCE_ID = uuid.uuid4()


def _club_obj(*, connect_account="acct_test123", currency="GBP"):
    return SimpleNamespace(
        id=CLUB_ID,
        tenant_id=TENANT_ID,
        stripe_connect_account_id=connect_account,
        currency=currency,
    )


def _tenant_obj(*, fee_pct="5.00"):
    return SimpleNamespace(
        id=TENANT_ID,
        booking_fee_pct=Decimal(fee_pct) if fee_pct is not None else None,
    )


def _db_for_deduct(wallet, club_row):
    """Mock DB with two sequential execute calls: wallet lookup then club+tenant join."""
    db = AsyncMock()
    wallet_result = MagicMock()
    wallet_result.scalar_one_or_none.return_value = wallet
    club_result = MagicMock()
    club_result.one_or_none.return_value = club_row
    db.execute = AsyncMock(side_effect=[wallet_result, club_result])
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
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj(fee_pct="0")))
        result = await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("15.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        assert result["balance_after"] == Decimal("35.00")
        assert "transaction_id" in result

    @pytest.mark.asyncio
    async def test_balance_is_decremented(self):
        wallet = _wallet_obj(balance="30.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj(fee_pct="0")))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("10.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        assert wallet.balance == Decimal("20.00")

    @pytest.mark.asyncio
    async def test_platform_fee_computed_from_booking_fee_pct(self):
        wallet = _wallet_obj(balance="100.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj(fee_pct="5.00")))
        # Capture the WalletClubDebt that was added
        added = []
        db.add = MagicMock(side_effect=lambda obj: added.append(obj))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        # The debt is the last object added (wallet, txn, debt)
        from app.db.models.wallet import WalletClubDebt
        debts = [o for o in added if isinstance(o, WalletClubDebt)]
        assert len(debts) == 1
        assert debts[0].platform_fee_amount == Decimal("1.00")  # 5% of £20

    @pytest.mark.asyncio
    async def test_zero_fee_when_booking_fee_pct_is_none(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj(fee_pct=None)))
        added = []
        db.add = MagicMock(side_effect=lambda obj: added.append(obj))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("20.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        from app.db.models.wallet import WalletClubDebt
        debts = [o for o in added if isinstance(o, WalletClubDebt)]
        assert debts[0].platform_fee_amount == Decimal("0")

    @pytest.mark.asyncio
    async def test_source_type_and_source_id_written_to_transaction(self):
        wallet = _wallet_obj(balance="50.00")
        wallet.id = WALLET_ID
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj(fee_pct="0")))
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
        db = _db_for_deduct(wallet, (_club_obj(), _tenant_obj(fee_pct="0")))
        await PaymentService(db).deduct_wallet(
            USER_ID, CLUB_ID, Decimal("10.00"), WalletTransactionSource.booking, SOURCE_ID
        )
        db.flush.assert_called_once()
        db.commit.assert_called_once()


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
