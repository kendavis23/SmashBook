"""
Unit tests for PaymentService.get_wallet.

All DB interaction is mocked — no database required.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

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
