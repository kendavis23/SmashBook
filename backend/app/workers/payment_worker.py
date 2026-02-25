"""
Pub/Sub subscriber: payment-events topic
Handles Stripe webhook events forwarded via main API.
Deployed as a separate Cloud Run service.
"""
from fastapi import FastAPI, Request
import base64
import json

app = FastAPI()


@app.post("/")
async def process_payment_event(request: Request):
    envelope = await request.json()
    message = envelope.get("message", {})
    data = json.loads(base64.b64decode(message.get("data", "")).decode())

    event_type = data.get("event_type")
    payload = data.get("payload", {})

    handlers = {
        "payment_intent.succeeded": handle_payment_succeeded,
        "payment_intent.payment_failed": handle_payment_failed,
        "charge.refunded": handle_refund,
    }

    handler = handlers.get(event_type)
    if handler:
        await handler(payload)

    return {"status": "ok"}


async def handle_payment_succeeded(payload: dict):
    """Mark booking_player.payment_status=paid, generate invoice, send receipt."""
    pass


async def handle_payment_failed(payload: dict):
    """Flag booking as unpaid, alert staff, notify player."""
    pass


async def handle_refund(payload: dict):
    """Update payment record, wallet balance if applicable, send refund confirmation."""
    pass
