"""
Pub/Sub subscriber: payout-reconciliation-events topic (G8-Pay).

Runs the platform-wide Stripe payout reconciliation sweep on a schedule. Cloud
Scheduler publishes ``{"event_type": "payout.reconcile"}`` to
``payout-reconciliation-events``; the push subscription delivers it here.

This is the safety net behind the real-time ``payout.paid`` webhook
(``PaymentService.handle_payout_paid``). The webhook can leave a payout
under-reconciled two ways: the best-effort ``stripe_destination_payment_id``
capture at confirm time failed (leaving a ``partial`` row), or the webhook never
arrived. ``reconcile_all_payouts`` lists paid payouts from Stripe per club and
re-matches anything not already ``matched``, so those rows reach a settled
``reconciliation_status`` without manual intervention.

Deployed as a separate Cloud Run service from the same image
(``Dockerfile.worker``), with the ``app.workers.payout_reconciliation_worker:app``
arg override at deploy time.

The sweep is **platform-wide** and resolved server-side: ``reconcile_all_payouts``
queries every club with a Stripe Connect account, so no ``X-Tenant-ID`` header /
tenant scope is supplied by the scheduler (and ``TenantMiddleware`` does not run
on the worker). It reads/writes the **primary** and calls the Stripe platform
account (``STRIPE_SECRET_KEY``) with each club's connected account.

Pub/Sub redelivery is safe: reconciliation is idempotent — ``payouts`` is keyed
``UNIQUE(stripe_payout_id)`` and rows already ``matched`` are skipped, so a
redelivered ``payout.reconcile`` simply re-checks and changes nothing.
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
async def process_reconcile_event(request: Request):
    """Receive a Pub/Sub push delivery for payout-reconciliation events."""
    envelope = await request.json()
    message = envelope.get("message", {})
    data = json.loads(base64.b64decode(message.get("data", "")).decode())

    event_type = data.get("event_type")

    if event_type != "payout.reconcile":
        # Unknown event on this subscription — ack so Pub/Sub does not redeliver.
        logger.warning(
            "payout_reconciliation_worker: ignoring unexpected event_type=%s", event_type
        )
        return {"status": "ignored", "event_type": event_type}

    result = await reconcile()
    logger.info(
        "payout_reconciliation_worker: processed %s club(s), reconciled %s payout(s), %s failed",
        result.get("clubs_processed"),
        result.get("payouts_reconciled"),
        result.get("clubs_failed"),
    )
    return {"status": "ok", **result}


async def reconcile() -> dict:
    """Run the platform-wide payout reconciliation sweep on the primary DB."""
    async with AsyncSessionLocal() as session:
        # reconcile_all_payouts commits per club and rolls back on per-club
        # failure, so there is no outer commit/rollback to own here.
        svc = PaymentService(session)
        return await svc.reconcile_all_payouts()
