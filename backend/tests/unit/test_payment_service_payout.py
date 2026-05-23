"""
Unit tests for PaymentService.handle_payout_paid.

Covers the destination-charge Connect flow: payout.paid fires on the
connected account, balance transactions are type="payment" with `source`
pointing at the destination payment id (py_xxx). The handler must match
those against Payment.stripe_destination_payment_id (NOT stripe_charge_id,
which is the platform-side ch_xxx and never appears in connect-side
balance transactions).
"""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from stripe._stripe_object import StripeObject

from app.services.payment_service import PaymentService


def _make_payment(destination_payment_id: str, payout_id=None):
    return SimpleNamespace(
        id=uuid.uuid4(),
        stripe_destination_payment_id=destination_payment_id,
        stripe_payout_id=payout_id,
    )


def _make_db(payments_returned):
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = payments_returned
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()
    return db


def _txn(**fields):
    # Real Stripe BalanceTransactions are StripeObject (not dict) — attribute
    # access goes through __getattr__ and there is no `.get` method. Mocking
    # with plain dicts hides the AttributeError that hit prod in revision 105.
    return StripeObject.construct_from(fields, "fake_key")


def _make_balance_txns(sources):
    """Stand-in for stripe.BalanceTransaction.list(...) return value."""
    listing = MagicMock()
    listing.auto_paging_iter = MagicMock(
        return_value=[_txn(source=s) for s in sources]
    )
    return listing


def _payout_event(payout_id="po_test", connect_account="acct_test"):
    return {
        "type": "payout.paid",
        "account": connect_account,
        "data": {"object": {"id": payout_id}},
    }


@pytest.mark.asyncio
async def test_stamps_payout_id_on_matching_destination_payments():
    """Each Payment matched by py_xxx gets stripe_payout_id stamped."""
    payment_a = _make_payment("py_111")
    payment_b = _make_payment("py_222")
    db = _make_db([payment_a, payment_b])
    svc = PaymentService(db)

    with patch(
        "app.services.payment_service.stripe.BalanceTransaction.list",
        return_value=_make_balance_txns(["py_111", "py_222"]),
    ) as mock_list:
        await svc.handle_payout_paid(_payout_event("po_abc", "acct_xyz"))

    # The filter type must be "payment" — not "charge". Regressing this back
    # to "charge" is the original bug that left every payout unmatched.
    mock_list.assert_called_once_with(
        payout="po_abc", type="payment", stripe_account="acct_xyz"
    )
    assert payment_a.stripe_payout_id == "po_abc"
    assert payment_b.stripe_payout_id == "po_abc"
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_no_balance_transactions_is_noop():
    """Empty listing on the connected account → early return, no DB writes."""
    db = _make_db([])
    svc = PaymentService(db)

    with patch(
        "app.services.payment_service.stripe.BalanceTransaction.list",
        return_value=_make_balance_txns([]),
    ):
        await svc.handle_payout_paid(_payout_event())

    db.execute.assert_not_called()
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_skips_balance_txns_without_source():
    """Defensive: a balance txn missing `source` is ignored, not crashed on."""
    db = _make_db([_make_payment("py_999")])
    svc = PaymentService(db)

    listing = MagicMock()
    listing.auto_paging_iter = MagicMock(
        return_value=[_txn(source=None), _txn(source="py_999"), _txn()]
    )

    with patch(
        "app.services.payment_service.stripe.BalanceTransaction.list",
        return_value=listing,
    ):
        await svc.handle_payout_paid(_payout_event("po_filter"))

    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_payments_not_found_in_db_still_commits_cleanly():
    """
    Balance transactions present but no Payment rows match (e.g. the payout
    settles a charge created outside SmashBook). Handler should not raise.
    """
    db = _make_db([])  # query returns no matches
    svc = PaymentService(db)

    with patch(
        "app.services.payment_service.stripe.BalanceTransaction.list",
        return_value=_make_balance_txns(["py_orphan"]),
    ):
        await svc.handle_payout_paid(_payout_event())

    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()
