"""
Integration tests for wallet endpoints.

Coverage
--------
GET  /payments/wallet     — happy path with balance + transactions
                          — empty transaction history
                          — no wallet → 404
                          — unauthenticated → 403
                          — wrong tenant → 401
POST /payments/wallet/top-up
                          — success with explicit payment_method_id
                          — success with default payment method (no pm_id in body)
                          — auto-creates wallet when player has none
                          — amount_pence < 100 → 400
                          — no saved card and no pm_id → 400
                          — unauthenticated → 403
                          — wrong tenant → 401
POST /payments/wallet/pay-booking
                          — success: balance decremented, transaction_id returned
                          — BookingPlayer.payment_status set to paid in DB
                          — booking auto-confirms when single player fully paid
                          — insufficient balance → 402
                          — player not in booking → 404
                          — already paid → 409
                          — unauthenticated → 403
                          — wrong tenant → 401
POST /payments/wallet/settle-debts
                          — player → 403
                          — staff → 403
                          — admin, no unsettled debts → 200 with zero counts
                          — admin, unsettled debt with Connect account → 200, transfer created
                          — admin, club without Connect account → 200, skipped_count=1
                          — wrong tenant → 401
"""
import uuid
from decimal import Decimal
from unittest.mock import MagicMock, patch

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete as sql_delete, select as sa_select

from app.core.security import create_access_token
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
from app.db.models.payment import Payment, PlatformFee
from app.db.models.tenant import Tenant as TenantModel
from app.db.models.user import User
from app.db.models.wallet import Wallet, WalletClubDebt, WalletTransaction, WalletTransactionType, WalletTransactionSource

STRIPE_CUSTOMER_ID = "cus_testWALLETTOPUP"
STRIPE_PM_ID = "pm_testWALLETTOPUP"
STRIPE_PI_ID = "pi_testWALLETTOPUP"
STRIPE_PI_SECRET = "pi_testWALLETTOPUP_secret_ZZZ"


def _mock_customer():
    c = MagicMock()
    c.id = STRIPE_CUSTOMER_ID
    return c


def _mock_pi(amount=2000):
    pi = MagicMock()
    pi.id = STRIPE_PI_ID
    pi.client_secret = STRIPE_PI_SECRET
    pi.amount = amount
    return pi


async def _set_stripe_fields(session_factory, user_id, *, customer_id=STRIPE_CUSTOMER_ID, default_pm_id=None):
    async with session_factory() as session:
        u = await session.get(User, user_id)
        u.stripe_customer_id = customer_id
        if default_pm_id is not None:
            u.default_payment_method_id = default_pm_id
        await session.commit()


# ---------------------------------------------------------------------------
# Wallet seed helpers
# ---------------------------------------------------------------------------

async def _create_wallet(session_factory, user_id, *, balance="15.00", currency="GBP"):
    async with session_factory() as session:
        w = Wallet(
            user_id=user_id,
            balance=Decimal(balance),
            currency=currency,
            auto_topup_enabled=False,
        )
        session.add(w)
        await session.commit()
        await session.refresh(w)
    return w


async def _create_transaction(session_factory, wallet_id, *, amount, balance_after,
                               txn_type=WalletTransactionType.top_up, notes=None,
                               source_type=None, source_id=None):
    async with session_factory() as session:
        t = WalletTransaction(
            wallet_id=wallet_id,
            transaction_type=txn_type,
            amount=Decimal(amount),
            balance_after=Decimal(balance_after),
            notes=notes,
            source_type=source_type,
            source_id=source_id,
        )
        session.add(t)
        await session.commit()
        await session.refresh(t)
    return t


async def _create_wallet_club_debt(session_factory, club_id, tenant_id, wallet_transaction_id, *,
                                    amount="15.00", platform_fee="0.75"):
    async with session_factory() as session:
        debt = WalletClubDebt(
            club_id=club_id,
            tenant_id=tenant_id,
            wallet_transaction_id=wallet_transaction_id,
            amount=Decimal(amount),
            platform_fee_amount=Decimal(platform_fee),
        )
        session.add(debt)
        await session.commit()
        await session.refresh(debt)
    return debt


async def _delete_wallet_club_debts(session_factory, wallet_transaction_id):
    async with session_factory() as session:
        await session.execute(
            sql_delete(WalletClubDebt).where(
                WalletClubDebt.wallet_transaction_id == wallet_transaction_id
            )
        )
        await session.commit()


async def _delete_wallet(session_factory, wallet_id):
    async with session_factory() as session:
        await session.execute(
            sql_delete(WalletTransaction).where(WalletTransaction.wallet_id == wallet_id)
        )
        await session.execute(
            sql_delete(Wallet).where(Wallet.id == wallet_id)
        )
        await session.commit()


# ---------------------------------------------------------------------------
# GET /payments/wallet — happy path
# ---------------------------------------------------------------------------

class TestGetWallet:

    async def test_returns_balance_and_currency(self, client, player, player_headers, test_session_factory):
        wallet = await _create_wallet(test_session_factory, player.id, balance="25.00", currency="GBP")
        try:
            resp = await client.get("/api/v1/payments/wallet", headers=player_headers)
            assert resp.status_code == 200
            body = resp.json()
            assert Decimal(body["balance"]) == Decimal("25.00")
            assert body["currency"] == "GBP"
        finally:
            await _delete_wallet(test_session_factory, wallet.id)

    async def test_returns_auto_topup_fields_false_by_default(self, client, player, player_headers, test_session_factory):
        wallet = await _create_wallet(test_session_factory, player.id)
        try:
            resp = await client.get("/api/v1/payments/wallet", headers=player_headers)
            assert resp.status_code == 200
            body = resp.json()
            assert body["auto_topup_enabled"] is False
            assert body["auto_topup_threshold"] is None
            assert body["auto_topup_amount"] is None
        finally:
            await _delete_wallet(test_session_factory, wallet.id)

    async def test_returns_transactions_list(self, client, player, player_headers, test_session_factory):
        wallet = await _create_wallet(test_session_factory, player.id, balance="15.00")
        await _create_transaction(test_session_factory, wallet.id, amount="20.00", balance_after="20.00",
                                   txn_type=WalletTransactionType.top_up)
        await _create_transaction(test_session_factory, wallet.id, amount="5.00", balance_after="15.00",
                                   txn_type=WalletTransactionType.debit)
        try:
            resp = await client.get("/api/v1/payments/wallet", headers=player_headers)
            assert resp.status_code == 200
            body = resp.json()
            assert len(body["transactions"]) == 2
        finally:
            await _delete_wallet(test_session_factory, wallet.id)

    async def test_transaction_fields_present(self, client, player, player_headers, test_session_factory):
        wallet = await _create_wallet(test_session_factory, player.id, balance="20.00")
        await _create_transaction(test_session_factory, wallet.id, amount="20.00", balance_after="20.00",
                                   txn_type=WalletTransactionType.top_up, notes="welcome credit")
        try:
            resp = await client.get("/api/v1/payments/wallet", headers=player_headers)
            txn = resp.json()["transactions"][0]
            assert txn["transaction_type"] == "top_up"
            assert Decimal(txn["amount"]) == Decimal("20.00")
            assert Decimal(txn["balance_after"]) == Decimal("20.00")
            assert txn["notes"] == "welcome credit"
            assert "id" in txn
            assert "created_at" in txn
        finally:
            await _delete_wallet(test_session_factory, wallet.id)

    async def test_transactions_ordered_newest_first(self, client, player, player_headers, test_session_factory):
        wallet = await _create_wallet(test_session_factory, player.id, balance="15.00")
        first = await _create_transaction(test_session_factory, wallet.id, amount="20.00", balance_after="20.00")
        second = await _create_transaction(test_session_factory, wallet.id, amount="5.00", balance_after="15.00",
                                            txn_type=WalletTransactionType.debit)
        try:
            resp = await client.get("/api/v1/payments/wallet", headers=player_headers)
            txns = resp.json()["transactions"]
            assert len(txns) == 2
            # Newest (second inserted) should appear first
            assert str(second.id) == txns[0]["id"]
            assert str(first.id) == txns[1]["id"]
        finally:
            await _delete_wallet(test_session_factory, wallet.id)

    async def test_empty_transaction_history(self, client, player, player_headers, test_session_factory):
        wallet = await _create_wallet(test_session_factory, player.id, balance="0.00")
        try:
            resp = await client.get("/api/v1/payments/wallet", headers=player_headers)
            assert resp.status_code == 200
            assert resp.json()["transactions"] == []
        finally:
            await _delete_wallet(test_session_factory, wallet.id)


# ---------------------------------------------------------------------------
# GET /payments/wallet — error cases
# ---------------------------------------------------------------------------

class TestGetWalletErrors:

    async def test_no_wallet_returns_404(self, client, player_headers):
        resp = await client.get("/api/v1/payments/wallet", headers=player_headers)
        assert resp.status_code == 404

    async def test_unauthenticated_returns_403(self, client, tenant):
        resp = await client.get(
            "/api/v1/payments/wallet",
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 403

    async def test_wrong_tenant_returns_401(self, client, player, tenant, plan, test_session_factory):
        subdomain_b = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(
                name="Other Tenant",
                trading_name="Other Tenant",
                player_subdomain=subdomain_b,
                staff_subdomain=f"{subdomain_b}-staff",
                plan_id=plan.id,
                is_active=True,
            )
            session.add(t2)
            await session.commit()
            await session.refresh(t2)

        try:
            token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
            resp = await client.get(
                "/api/v1/payments/wallet",
                headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2.id)},
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()


# ---------------------------------------------------------------------------
# POST /payments/wallet/top-up
# ---------------------------------------------------------------------------

class TestWalletTopUp:

    async def test_success_with_explicit_payment_method(self, client, player, player_headers, test_session_factory):
        """Returns client_secret and payment_intent_id when an explicit pm is supplied."""
        await _set_stripe_fields(test_session_factory, player.id)
        wallet = await _create_wallet(test_session_factory, player.id, balance="10.00")
        try:
            with patch("stripe.PaymentIntent.create", return_value=_mock_pi(2000)):
                resp = await client.post(
                    "/api/v1/payments/wallet/top-up",
                    json={"amount_pence": 2000, "payment_method_id": STRIPE_PM_ID},
                    headers=player_headers,
                )
            assert resp.status_code == 200
            body = resp.json()
            assert body["client_secret"] == STRIPE_PI_SECRET
            assert body["payment_intent_id"] == STRIPE_PI_ID
            assert Decimal(body["amount"]) == Decimal("20.00")  # £20.00
            assert body["currency"] == "gbp"
        finally:
            await _delete_wallet(test_session_factory, wallet.id)

    async def test_success_with_default_payment_method(self, client, player, player_headers, test_session_factory):
        """Falls back to user.default_payment_method_id when no pm_id is in the request body."""
        await _set_stripe_fields(test_session_factory, player.id, default_pm_id=STRIPE_PM_ID)
        wallet = await _create_wallet(test_session_factory, player.id, balance="5.00")
        try:
            with patch("stripe.PaymentIntent.create", return_value=_mock_pi(1500)) as mock_create:
                resp = await client.post(
                    "/api/v1/payments/wallet/top-up",
                    json={"amount_pence": 1500},
                    headers=player_headers,
                )
            assert resp.status_code == 200
            call_kwargs = mock_create.call_args[1]
            assert call_kwargs["payment_method"] == STRIPE_PM_ID
        finally:
            await _delete_wallet(test_session_factory, wallet.id)

    async def test_auto_creates_wallet_when_none_exists(self, client, player, player_headers, test_session_factory):
        """If the player has no wallet, one is created during the top-up call."""
        await _set_stripe_fields(test_session_factory, player.id, default_pm_id=STRIPE_PM_ID)
        with patch("stripe.PaymentIntent.create", return_value=_mock_pi(1000)):
            resp = await client.post(
                "/api/v1/payments/wallet/top-up",
                json={"amount_pence": 1000},
                headers=player_headers,
            )
        assert resp.status_code == 200
        # Verify wallet row was created
        async with test_session_factory() as session:
            from sqlalchemy import select as sa_select
            result = await session.execute(sa_select(Wallet).where(Wallet.user_id == player.id))
            new_wallet = result.scalar_one_or_none()
            assert new_wallet is not None
        await _delete_wallet(test_session_factory, new_wallet.id)

    async def test_amount_below_minimum_returns_400(self, client, player_headers, test_session_factory, player):
        await _set_stripe_fields(test_session_factory, player.id, default_pm_id=STRIPE_PM_ID)
        resp = await client.post(
            "/api/v1/payments/wallet/top-up",
            json={"amount_pence": 99},
            headers=player_headers,
        )
        assert resp.status_code == 400

    async def test_no_payment_method_returns_400(self, client, player, player_headers, test_session_factory):
        """Player with no saved card and no pm_id in request gets 400."""
        await _set_stripe_fields(test_session_factory, player.id, customer_id=STRIPE_CUSTOMER_ID, default_pm_id=None)
        wallet = await _create_wallet(test_session_factory, player.id)
        try:
            resp = await client.post(
                "/api/v1/payments/wallet/top-up",
                json={"amount_pence": 1000},
                headers=player_headers,
            )
            assert resp.status_code == 400
        finally:
            await _delete_wallet(test_session_factory, wallet.id)

    async def test_unauthenticated_returns_403(self, client):
        resp = await client.post("/api/v1/payments/wallet/top-up", json={"amount_pence": 1000})
        assert resp.status_code == 403

    async def test_wrong_tenant_returns_401(self, client, player, tenant, plan, test_session_factory):
        subdomain_b = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(
                name="Other Tenant",
                trading_name="Other Tenant",
                player_subdomain=subdomain_b,
                staff_subdomain=f"{subdomain_b}-staff",
                plan_id=plan.id,
                is_active=True,
            )
            session.add(t2)
            await session.commit()
            await session.refresh(t2)
        try:
            token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
            resp = await client.post(
                "/api/v1/payments/wallet/top-up",
                json={"amount_pence": 1000, "payment_method_id": STRIPE_PM_ID},
                headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2.id)},
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()


# ---------------------------------------------------------------------------
# POST /payments/wallet/settle-debts
# ---------------------------------------------------------------------------

STRIPE_TRANSFER_ID = "tr_testSETTLE001"


def _mock_transfer():
    t = MagicMock()
    t.id = STRIPE_TRANSFER_ID
    return t


class TestSettleWalletDebts:

    async def test_player_cannot_settle(self, client, player_headers):
        resp = await client.post("/api/v1/payments/wallet/settle-debts", headers=player_headers)
        assert resp.status_code == 403

    async def test_staff_cannot_settle(self, client, staff_headers):
        resp = await client.post("/api/v1/payments/wallet/settle-debts", headers=staff_headers)
        assert resp.status_code == 403

    async def test_unauthenticated_returns_403(self, client, tenant):
        resp = await client.post(
            "/api/v1/payments/wallet/settle-debts",
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 403

    async def test_wrong_tenant_returns_401(self, client, admin, tenant, plan, test_session_factory):
        subdomain_b = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Other Tenant", trading_name="Other Tenant", player_subdomain=subdomain_b, staff_subdomain=f"{subdomain_b}-staff", plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.commit()
            await session.refresh(t2)
        try:
            token = create_access_token({"sub": str(admin.id), "tid": str(tenant.id)})
            resp = await client.post(
                "/api/v1/payments/wallet/settle-debts",
                headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2.id)},
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()

    async def test_no_unsettled_debts_returns_zero_counts(self, client, admin_headers):
        with patch("stripe.Transfer.create") as mock_transfer:
            resp = await client.post("/api/v1/payments/wallet/settle-debts", headers=admin_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["settled_count"] == 0
        assert body["skipped_count"] == 0
        assert Decimal(body["total_transferred"]) == Decimal("0")
        mock_transfer.assert_not_called()

    async def test_club_without_connect_account_is_skipped(
        self, client, admin_headers, admin, club, tenant, test_session_factory
    ):
        wallet = await _create_wallet(test_session_factory, admin.id, balance="30.00")
        txn = await _create_transaction(
            test_session_factory, wallet.id, amount="15.00", balance_after="15.00",
            txn_type=WalletTransactionType.debit, source_type=WalletTransactionSource.booking,
            source_id=uuid.uuid4(),
        )
        await _create_wallet_club_debt(test_session_factory, club.id, tenant.id, txn.id)
        try:
            with patch("stripe.Transfer.create") as mock_transfer:
                resp = await client.post("/api/v1/payments/wallet/settle-debts", headers=admin_headers)
            assert resp.status_code == 200
            body = resp.json()
            assert body["skipped_count"] == 1
            assert body["settled_count"] == 0
            mock_transfer.assert_not_called()
        finally:
            await _delete_wallet_club_debts(test_session_factory, txn.id)
            await _delete_wallet(test_session_factory, wallet.id)

    async def test_admin_settles_debt_for_club_with_connect_account(
        self, client, admin_headers, admin, club, tenant, test_session_factory
    ):
        async with test_session_factory() as session:
            c = await session.get(Club, club.id)
            c.stripe_connect_account_id = "acct_testINTEG"
            await session.commit()

        wallet = await _create_wallet(test_session_factory, admin.id, balance="30.00")
        txn = await _create_transaction(
            test_session_factory, wallet.id, amount="15.00", balance_after="15.00",
            txn_type=WalletTransactionType.debit, source_type=WalletTransactionSource.booking,
            source_id=uuid.uuid4(),
        )
        await _create_wallet_club_debt(
            test_session_factory, club.id, tenant.id, txn.id,
            amount="15.00", platform_fee="0.75",
        )
        try:
            with patch("stripe.Transfer.create", return_value=_mock_transfer()):
                resp = await client.post("/api/v1/payments/wallet/settle-debts", headers=admin_headers)
            assert resp.status_code == 200
            body = resp.json()
            assert body["settled_count"] == 1
            assert body["skipped_count"] == 0
            assert Decimal(body["total_transferred"]) == Decimal("14.25")  # 15.00 - 0.75

            async with test_session_factory() as session:
                result = await session.execute(
                    sa_select(WalletClubDebt).where(WalletClubDebt.wallet_transaction_id == txn.id)
                )
                debt = result.scalar_one()
                assert debt.settled_at is not None
                assert debt.stripe_transfer_id == STRIPE_TRANSFER_ID
        finally:
            await _delete_wallet_club_debts(test_session_factory, txn.id)
            await _delete_wallet(test_session_factory, wallet.id)
            async with test_session_factory() as session:
                c = await session.get(Club, club.id)
                c.stripe_connect_account_id = None
                await session.commit()


# ---------------------------------------------------------------------------
# POST /payments/wallet/pay-booking — helpers
# ---------------------------------------------------------------------------

async def _create_court_for_wallet(session_factory, club_id):
    async with session_factory() as session:
        c = Court(club_id=club_id, name="Wallet Test Court", surface_type="indoor", is_active=True)
        session.add(c)
        await session.commit()
        await session.refresh(c)
    return c


async def _create_booking_for_wallet(session_factory, club_id, court_id, user_id, *,
                                      max_players=1, status=BookingStatus.pending):
    start = datetime.now(tz=timezone.utc) + timedelta(hours=48)
    end = start + timedelta(minutes=90)
    async with session_factory() as session:
        b = Booking(
            club_id=club_id,
            court_id=court_id,
            booking_type=BookingType.regular,
            status=status,
            start_datetime=start,
            end_datetime=end,
            created_by_user_id=user_id,
            is_open_game=False,
            max_players=max_players,
            total_price=Decimal("20.00"),
        )
        session.add(b)
        await session.commit()
        await session.refresh(b)
    return b


async def _create_booking_player_for_wallet(session_factory, booking_id, user_id, *,
                                             amount_due="20.00",
                                             payment_status=PaymentStatus.pending):
    async with session_factory() as session:
        bp = BookingPlayer(
            booking_id=booking_id,
            user_id=user_id,
            role=PlayerRole.organiser,
            invite_status=InviteStatus.accepted,
            payment_status=payment_status,
            amount_due=Decimal(amount_due),
        )
        session.add(bp)
        await session.commit()
        await session.refresh(bp)
    return bp


async def _delete_booking_for_wallet(session_factory, booking_id):
    async with session_factory() as session:
        payment_ids = (
            await session.execute(sa_select(Payment.id).where(Payment.booking_id == booking_id))
        ).scalars().all()
        if payment_ids:
            await session.execute(sql_delete(PlatformFee).where(PlatformFee.payment_id.in_(payment_ids)))
            await session.execute(sql_delete(Payment).where(Payment.id.in_(payment_ids)))
        await session.execute(sql_delete(BookingPlayer).where(BookingPlayer.booking_id == booking_id))
        await session.execute(sql_delete(Booking).where(Booking.id == booking_id))
        await session.commit()


async def _delete_wallet_with_debts(session_factory, wallet_id):
    """Delete wallet, transactions, and any club debts that reference those transactions."""
    async with session_factory() as session:
        txn_ids = (
            await session.execute(
                sa_select(WalletTransaction.id).where(WalletTransaction.wallet_id == wallet_id)
            )
        ).scalars().all()
        if txn_ids:
            await session.execute(
                sql_delete(WalletClubDebt).where(WalletClubDebt.wallet_transaction_id.in_(txn_ids))
            )
        await session.execute(sql_delete(WalletTransaction).where(WalletTransaction.wallet_id == wallet_id))
        await session.execute(sql_delete(Wallet).where(Wallet.id == wallet_id))
        await session.commit()


# ---------------------------------------------------------------------------
# POST /payments/wallet/pay-booking
# ---------------------------------------------------------------------------

class TestWalletPayBooking:

    async def test_success_returns_balance_after_and_transaction_id(
        self, client, player, player_headers, club, test_session_factory
    ):
        court = await _create_court_for_wallet(test_session_factory, club.id)
        booking = await _create_booking_for_wallet(test_session_factory, club.id, court.id, player.id)
        await _create_booking_player_for_wallet(test_session_factory, booking.id, player.id)
        wallet = await _create_wallet(test_session_factory, player.id, balance="50.00")
        try:
            resp = await client.post(
                "/api/v1/payments/wallet/pay-booking",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )
            assert resp.status_code == 200
            body = resp.json()
            assert Decimal(body["balance_after"]) == Decimal("30.00")  # 50 - 20
            assert "transaction_id" in body
        finally:
            await _delete_booking_for_wallet(test_session_factory, booking.id)
            await _delete_wallet_with_debts(test_session_factory, wallet.id)
            async with test_session_factory() as session:
                await session.execute(sql_delete(Court).where(Court.id == court.id))
                await session.commit()

    async def test_booking_player_payment_status_set_to_paid(
        self, client, player, player_headers, club, test_session_factory
    ):
        court = await _create_court_for_wallet(test_session_factory, club.id)
        booking = await _create_booking_for_wallet(test_session_factory, club.id, court.id, player.id)
        bp = await _create_booking_player_for_wallet(test_session_factory, booking.id, player.id)
        wallet = await _create_wallet(test_session_factory, player.id, balance="50.00")
        try:
            resp = await client.post(
                "/api/v1/payments/wallet/pay-booking",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )
            assert resp.status_code == 200
            async with test_session_factory() as session:
                updated_bp = await session.get(BookingPlayer, bp.id)
                assert updated_bp.payment_status == PaymentStatus.paid
        finally:
            await _delete_booking_for_wallet(test_session_factory, booking.id)
            await _delete_wallet_with_debts(test_session_factory, wallet.id)
            async with test_session_factory() as session:
                await session.execute(sql_delete(Court).where(Court.id == court.id))
                await session.commit()

    async def test_booking_confirms_when_all_players_paid(
        self, client, player, player_headers, club, test_session_factory
    ):
        court = await _create_court_for_wallet(test_session_factory, club.id)
        booking = await _create_booking_for_wallet(
            test_session_factory, club.id, court.id, player.id, max_players=1
        )
        await _create_booking_player_for_wallet(test_session_factory, booking.id, player.id)
        wallet = await _create_wallet(test_session_factory, player.id, balance="50.00")
        try:
            resp = await client.post(
                "/api/v1/payments/wallet/pay-booking",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )
            assert resp.status_code == 200
            async with test_session_factory() as session:
                updated_booking = await session.get(Booking, booking.id)
                assert updated_booking.status == BookingStatus.confirmed
        finally:
            await _delete_booking_for_wallet(test_session_factory, booking.id)
            await _delete_wallet_with_debts(test_session_factory, wallet.id)
            async with test_session_factory() as session:
                await session.execute(sql_delete(Court).where(Court.id == court.id))
                await session.commit()

    async def test_insufficient_balance_returns_402(
        self, client, player, player_headers, club, test_session_factory
    ):
        court = await _create_court_for_wallet(test_session_factory, club.id)
        booking = await _create_booking_for_wallet(test_session_factory, club.id, court.id, player.id)
        await _create_booking_player_for_wallet(test_session_factory, booking.id, player.id, amount_due="20.00")
        wallet = await _create_wallet(test_session_factory, player.id, balance="5.00")
        try:
            resp = await client.post(
                "/api/v1/payments/wallet/pay-booking",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )
            assert resp.status_code == 402
        finally:
            await _delete_booking_for_wallet(test_session_factory, booking.id)
            await _delete_wallet_with_debts(test_session_factory, wallet.id)
            async with test_session_factory() as session:
                await session.execute(sql_delete(Court).where(Court.id == court.id))
                await session.commit()

    async def test_player_not_in_booking_returns_404(
        self, client, player, player_headers, club, test_session_factory
    ):
        court = await _create_court_for_wallet(test_session_factory, club.id)
        booking = await _create_booking_for_wallet(test_session_factory, club.id, court.id, player.id)
        # No BookingPlayer row created for this player
        wallet = await _create_wallet(test_session_factory, player.id, balance="50.00")
        try:
            resp = await client.post(
                "/api/v1/payments/wallet/pay-booking",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )
            assert resp.status_code == 404
        finally:
            await _delete_booking_for_wallet(test_session_factory, booking.id)
            await _delete_wallet_with_debts(test_session_factory, wallet.id)
            async with test_session_factory() as session:
                await session.execute(sql_delete(Court).where(Court.id == court.id))
                await session.commit()

    async def test_already_paid_returns_409(
        self, client, player, player_headers, club, test_session_factory
    ):
        court = await _create_court_for_wallet(test_session_factory, club.id)
        booking = await _create_booking_for_wallet(test_session_factory, club.id, court.id, player.id)
        await _create_booking_player_for_wallet(
            test_session_factory, booking.id, player.id, payment_status=PaymentStatus.paid
        )
        wallet = await _create_wallet(test_session_factory, player.id, balance="50.00")
        try:
            resp = await client.post(
                "/api/v1/payments/wallet/pay-booking",
                json={"booking_id": str(booking.id)},
                headers=player_headers,
            )
            assert resp.status_code == 409
        finally:
            await _delete_booking_for_wallet(test_session_factory, booking.id)
            await _delete_wallet_with_debts(test_session_factory, wallet.id)
            async with test_session_factory() as session:
                await session.execute(sql_delete(Court).where(Court.id == court.id))
                await session.commit()

    async def test_unauthenticated_returns_403(self, client, tenant):
        resp = await client.post(
            "/api/v1/payments/wallet/pay-booking",
            json={"booking_id": str(uuid.uuid4())},
            headers={"X-Tenant-ID": str(tenant.id)},
        )
        assert resp.status_code == 403

    async def test_wrong_tenant_returns_401(self, client, player, tenant, plan, test_session_factory):
        subdomain_b = f"other-{uuid.uuid4().hex[:8]}"
        async with test_session_factory() as session:
            t2 = TenantModel(name="Other Tenant", trading_name="Other Tenant", player_subdomain=subdomain_b, staff_subdomain=f"{subdomain_b}-staff", plan_id=plan.id, is_active=True)
            session.add(t2)
            await session.commit()
            await session.refresh(t2)
        try:
            token = create_access_token({"sub": str(player.id), "tid": str(tenant.id)})
            resp = await client.post(
                "/api/v1/payments/wallet/pay-booking",
                json={"booking_id": str(uuid.uuid4())},
                headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": str(t2.id)},
            )
            assert resp.status_code == 401
        finally:
            async with test_session_factory() as session:
                obj = await session.get(TenantModel, t2.id)
                if obj:
                    await session.delete(obj)
                    await session.commit()
