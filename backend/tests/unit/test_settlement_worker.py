"""
Unit tests for the wallet-settlement worker (Stage 2.6).

No DB or network — patches ``settle`` so nothing touches Postgres or Stripe.

Coverage
--------
- a ``wallet.settle`` push envelope invokes the settlement run and returns its
  result merged into the response
- an unexpected event_type is acked (200) without running settlement, so Pub/Sub
  does not redeliver it forever
"""
import base64
import json
from unittest.mock import AsyncMock, patch

import httpx
from httpx import ASGITransport

from app.workers import settlement_worker


def _envelope(event_type: str) -> dict:
    data = base64.b64encode(json.dumps({"event_type": event_type}).encode()).decode()
    return {"message": {"data": data}}


async def _post(envelope: dict) -> httpx.Response:
    transport = ASGITransport(app=settlement_worker.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://worker") as client:
        return await client.post("/pubsub", json=envelope)


class TestProcessSettlementEvent:
    async def test_wallet_settle_runs_settlement(self):
        result = {"settled_count": 3, "total_transferred": 1500, "skipped_count": 0}
        with patch.object(settlement_worker, "settle", AsyncMock(return_value=result)) as mock_settle:
            resp = await _post(_envelope("wallet.settle"))

        mock_settle.assert_awaited_once()
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok", **result}

    async def test_unexpected_event_type_is_ignored(self):
        with patch.object(settlement_worker, "settle", AsyncMock()) as mock_settle:
            resp = await _post(_envelope("payment.succeeded"))

        mock_settle.assert_not_called()
        assert resp.status_code == 200
        assert resp.json()["status"] == "ignored"
