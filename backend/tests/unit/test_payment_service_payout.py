"""
Unit tests for PaymentService payout handling.

Covers the destination-charge Connect flow: payouts fire on the connected
account; balance transactions are type="payment" with `source` pointing at the
destination payment id (py_xxx). The handler matches those against
Payment.stripe_destination_payment_id (NOT stripe_charge_id, which is the
platform-side ch_xxx and never appears in connect-side balance transactions),
records a `payouts` row (gross/fee/net + reconciliation result), and clears the
stamp again on payout.failed / payout.canceled.
"""

import uuid
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from stripe._stripe_object import StripeObject

from app.db.models.payment import Payout, PayoutReconStatus, PayoutStatus
from app.services.payment_service import PaymentService


def _make_payment(destination_payment_id: str, amount="10.00", refund=None, payout_id=None):
    return SimpleNamespace(
        id=uuid.uuid4(),
        stripe_destination_payment_id=destination_payment_id,
        stripe_payout_id=payout_id,
        amount=Decimal(amount),
        refund_amount=Decimal(refund) if refund is not None else None,
    )


_UNSET = object()


class _Result:
    """Stands in for a SQLAlchemy Result for either access style."""

    def __init__(self, *, scalar=_UNSET, rows=_UNSET):
        self._scalar = scalar
        self._rows = rows

    def scalar_one_or_none(self):
        return self._scalar

    def scalars(self):
        m = MagicMock()
        m.all.return_value = self._rows
        return m


class _FakeDB:
    """Pops a queued result per `execute` call, in call order."""

    def __init__(self, results):
        self._results = list(results)
        self.added = []
        self.commits = 0

    async def execute(self, *a, **k):
        return self._results.pop(0)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.commits += 1


def _txn(**fields):
    # Real Stripe BalanceTransactions are StripeObject (not dict) — attribute
    # access goes through __getattr__ and there is no `.get` method. Mocking
    # with plain dicts hides the AttributeError that hit prod in revision 105.
    return StripeObject.construct_from(fields, "fake_key")


def _make_balance_txns(txns):
    listing = MagicMock()
    listing.auto_paging_iter = MagicMock(return_value=txns)
    return listing


def _payout_event(event_type="payout.paid", payout_id="po_test", connect_account="acct_test", **obj):
    return {
        "type": event_type,
        "account": connect_account,
        "data": {"object": {"id": payout_id, **obj}},
    }


@pytest.mark.asyncio
async def test_stamps_payout_id_and_records_matched_payout():
    """Matched payments get stamped; the payout row reconciles as `matched`."""
    payment_a = _make_payment("py_111", amount="10.00")
    payment_b = _make_payment("py_222", amount="15.00")
    # execute order: resolve club, fetch payments, fetch existing payout
    club_id = uuid.uuid4()
    db = _FakeDB([
        _Result(scalar=club_id),                       # _resolve_club_id_for_account
        _Result(rows=[payment_a, payment_b]),          # payments match
        _Result(scalar=None),                          # no existing payout row
    ])
    svc = PaymentService(db)

    txns = [
        _txn(source="py_111", amount=1000, fee=29),
        _txn(source="py_222", amount=1500, fee=44),
    ]
    with patch(
        "app.services.payment_service.stripe.BalanceTransaction.list",
        return_value=_make_balance_txns(txns),
    ) as mock_list:
        await svc.handle_payout_paid(
            _payout_event(payout_id="po_abc", connect_account="acct_xyz",
                          amount=2427, currency="gbp")
        )

    # Regressing the filter back to "charge" leaves every payout unmatched.
    mock_list.assert_called_once_with(
        payout="po_abc", type="payment", stripe_account="acct_xyz"
    )
    assert payment_a.stripe_payout_id == "po_abc"
    assert payment_b.stripe_payout_id == "po_abc"

    payout_row = db.added[0]
    assert isinstance(payout_row, Payout)
    assert payout_row.stripe_payout_id == "po_abc"
    assert payout_row.club_id == str(club_id)
    assert payout_row.gross_amount == Decimal("25.00")
    assert payout_row.fee_amount == Decimal("0.73")
    assert payout_row.amount == Decimal("24.27")
    assert payout_row.matched_amount == Decimal("25.00")
    assert payout_row.status == PayoutStatus.paid
    assert payout_row.reconciliation_status == PayoutReconStatus.matched
    assert db.commits == 1


@pytest.mark.asyncio
async def test_unknown_connect_account_skips():
    """A payout for an unmapped Connect account is logged and skipped."""
    db = _FakeDB([_Result(scalar=None)])  # club not found
    svc = PaymentService(db)

    with patch("app.services.payment_service.stripe.BalanceTransaction.list") as mock_list:
        await svc.handle_payout_paid(_payout_event())

    mock_list.assert_not_called()
    assert db.commits == 0
    assert db.added == []


@pytest.mark.asyncio
async def test_partial_when_some_payments_unmatched():
    """Two payment txns but only one Payment row → reconciliation `partial`."""
    payment = _make_payment("py_111", amount="10.00")
    club_id = uuid.uuid4()
    db = _FakeDB([
        _Result(scalar=club_id),
        _Result(rows=[payment]),     # only one matches
        _Result(scalar=None),
    ])
    svc = PaymentService(db)

    txns = [
        _txn(source="py_111", amount=1000, fee=29),
        _txn(source="py_missing", amount=2000, fee=58),
    ]
    with patch(
        "app.services.payment_service.stripe.BalanceTransaction.list",
        return_value=_make_balance_txns(txns),
    ):
        await svc.handle_payout_paid(_payout_event(amount=2913))

    assert db.added[0].reconciliation_status == PayoutReconStatus.partial


@pytest.mark.asyncio
async def test_discrepancy_when_amounts_disagree():
    """All txns matched but matched_amount != gross → `discrepancy`."""
    payment = _make_payment("py_111", amount="5.00")  # under-records the 10.00 gross
    club_id = uuid.uuid4()
    db = _FakeDB([
        _Result(scalar=club_id),
        _Result(rows=[payment]),
        _Result(scalar=None),
    ])
    svc = PaymentService(db)

    txns = [_txn(source="py_111", amount=1000, fee=29)]
    with patch(
        "app.services.payment_service.stripe.BalanceTransaction.list",
        return_value=_make_balance_txns(txns),
    ):
        await svc.handle_payout_paid(_payout_event(amount=971))

    row = db.added[0]
    assert row.reconciliation_status == PayoutReconStatus.discrepancy
    assert row.discrepancy_amount == Decimal("5.00")


@pytest.mark.asyncio
async def test_matched_amount_is_net_of_refunds():
    """A partially-refunded payment contributes amount − refund_amount."""
    payment = _make_payment("py_111", amount="10.00", refund="4.00")
    club_id = uuid.uuid4()
    db = _FakeDB([
        _Result(scalar=club_id),
        _Result(rows=[payment]),
        _Result(scalar=None),
    ])
    svc = PaymentService(db)

    # gross 6.00 so it reconciles cleanly against the net-of-refund matched sum
    txns = [_txn(source="py_111", amount=600, fee=20)]
    with patch(
        "app.services.payment_service.stripe.BalanceTransaction.list",
        return_value=_make_balance_txns(txns),
    ):
        await svc.handle_payout_paid(_payout_event(amount=580))

    row = db.added[0]
    assert row.matched_amount == Decimal("6.00")
    assert row.reconciliation_status == PayoutReconStatus.matched


@pytest.mark.asyncio
async def test_payout_failed_clears_stamp():
    """payout.failed records the failure and unstamps affected payments."""
    stamped = _make_payment("py_111", payout_id="po_dead")
    club_id = uuid.uuid4()
    db = _FakeDB([
        _Result(scalar=club_id),       # resolve club
        _Result(scalar=None),          # no existing payout row
        _Result(rows=[stamped]),       # payments currently stamped to po_dead
    ])
    svc = PaymentService(db)

    await svc.handle_payout_failed(
        _payout_event(event_type="payout.failed", payout_id="po_dead",
                      amount=2427, currency="gbp",
                      failure_code="account_closed", failure_message="bank closed")
    )

    assert stamped.stripe_payout_id is None
    row = db.added[0]
    assert row.status == PayoutStatus.failed
    assert row.failure_code == "account_closed"
    assert row.reconciliation_status == PayoutReconStatus.unmatched
    assert db.commits == 1
