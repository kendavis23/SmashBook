"""
Pub/Sub subscriber: wallet-settlement-events topic (Stage 2.6).

Runs the platform-wide wallet-debt settlement on a schedule. Cloud Scheduler
publishes ``{"event_type": "wallet.settle"}`` to ``wallet-settlement-events``
daily at 02:00 UTC; the push subscription delivers it here. This is the
automated equivalent of the admin-triggered ``POST /payments/wallet/settle-debts``
endpoint — without it, each club's wallet receivables (``wallet_club_debts`` rows)
accumulate indefinitely as a quiet liability on the platform balance.

Deployed as a separate Cloud Run service from the same image
(``Dockerfile.worker``), with the ``app.workers.settlement_worker:app`` arg
override at deploy time.

Settlement is **platform-wide** and resolved server-side: ``settle_wallet_debts``
queries every unsettled ``WalletClubDebt`` across all clubs, so no ``X-Tenant-ID``
header / tenant scope is supplied by the scheduler (and ``TenantMiddleware`` does
not run on the worker). It writes to the **primary** (it stamps ``settled_at`` and
records platform-fee transactions) and issues one Stripe Connect transfer per
club.

Pub/Sub redelivery is safe: each transfer uses a deterministic Stripe idempotency
key, and once a debt is stamped ``settled_at`` it drops out of the query, so a
redelivered ``wallet.settle`` simply settles nothing.
"""
from __future__ import annotations

import base64
import json
import logging

from fastapi import FastAPI, Request

from app.db.session import AsyncSessionLocal
from app.services.payment_service import PaymentService

logger = logging.getLogger(__name__)

app = FastAPI()


@app.get("/healthz")
async def health():
    return {"status": "ok"}


@app.post("/pubsub")
async def process_settlement_event(request: Request):
    """Receive a Pub/Sub push delivery for wallet-settlement events."""
    envelope = await request.json()
    message = envelope.get("message", {})
    data = json.loads(base64.b64decode(message.get("data", "")).decode())

    event_type = data.get("event_type")

    if event_type != "wallet.settle":
        # Unknown event on this subscription — ack so Pub/Sub does not redeliver.
        logger.warning("settlement_worker: ignoring unexpected event_type=%s", event_type)
        return {"status": "ignored", "event_type": event_type}

    result = await settle()
    logger.info(
        "settlement_worker: settled %s club(s), transferred %s, skipped %s",
        result.get("settled_count"),
        result.get("total_transferred"),
        result.get("skipped_count"),
    )
    return {"status": "ok", **result}


async def settle() -> dict:
    """Run the platform-wide wallet-debt settlement on the primary DB."""
    async with AsyncSessionLocal() as session:
        try:
            svc = PaymentService(session)
            result = await svc.settle_wallet_debts()
            await session.commit()
            return result
        except Exception:
            await session.rollback()
            raise
