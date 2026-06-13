"""
Unit tests for the payout-reconciliation worker (G8-Pay).

No DB or network — patches ``reconcile`` so nothing touches Postgres or Stripe.

Coverage
--------
- a ``payout.reconcile`` push envelope invokes the sweep and returns its result
  merged into the response
- an unexpected event_type is acked (200) without running the sweep, so Pub/Sub
  does not redeliver it forever
"""
import base64
import json
from unittest.mock import AsyncMock, patch

import httpx
from httpx import ASGITransport

from app.workers import payout_reconciliation_worker as worker


def _envelope(event_type: str) -> dict:
    data = base64.b64encode(json.dumps({"event_type": event_type}).encode()).decode()
    return {"message": {"data": data}}


async def _post(envelope: dict) -> httpx.Response:
    transport = ASGITransport(app=worker.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://worker") as client:
        return await client.post("/pubsub", json=envelope)


class TestProcessReconcileEvent:
    async def test_payout_reconcile_runs_sweep(self):
        result = {"clubs_processed": 4, "clubs_failed": 0, "payouts_reconciled": 2}
        with patch.object(worker, "reconcile", AsyncMock(return_value=result)) as mock_reconcile:
            resp = await _post(_envelope("payout.reconcile"))

        mock_reconcile.assert_awaited_once()
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok", **result}

    async def test_unexpected_event_type_is_ignored(self):
        with patch.object(worker, "reconcile", AsyncMock()) as mock_reconcile:
            resp = await _post(_envelope("wallet.settle"))

        mock_reconcile.assert_not_called()
        assert resp.status_code == 200
        assert resp.json()["status"] == "ignored"
