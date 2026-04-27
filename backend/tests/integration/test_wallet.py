"""
Integration tests for GET /payments/wallet.

Coverage
--------
GET /payments/wallet  — happy path with balance + transactions
                      — empty transaction history
                      — no wallet → 404
                      — unauthenticated → 403
                      — wrong tenant → 401
"""
import uuid
from decimal import Decimal

from sqlalchemy import delete as sql_delete

from app.core.security import create_access_token
from app.db.models.tenant import Tenant as TenantModel
from app.db.models.wallet import Wallet, WalletTransaction, WalletTransactionType


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
                               txn_type=WalletTransactionType.top_up, notes=None):
    async with session_factory() as session:
        t = WalletTransaction(
            wallet_id=wallet_id,
            transaction_type=txn_type,
            amount=Decimal(amount),
            balance_after=Decimal(balance_after),
            notes=notes,
        )
        session.add(t)
        await session.commit()
        await session.refresh(t)
    return t


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
                subdomain=subdomain_b,
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
