"""
Pub/Sub subscriber: notification-events topic
Centralised notification dispatch: email, push, in-app.
Deployed as a separate Cloud Run service.
"""
from fastapi import FastAPI, Request
import base64
import json

app = FastAPI()


@app.post("/")
async def process_notification_event(request: Request):
    envelope = await request.json()
    message = envelope.get("message", {})
    data = json.loads(base64.b64decode(message.get("data", "")).decode())

    event_type = data.get("event_type")
    payload = data.get("payload", {})

    handlers = {
        "send_email": dispatch_email,
        "send_push": dispatch_push,
        "send_booking_reminder": dispatch_reminder,
        "send_payment_receipt": dispatch_receipt,
        "send_club_announcement": dispatch_announcement,
    }

    handler = handlers.get(event_type)
    if handler:
        await handler(payload)

    return {"status": "ok"}


async def dispatch_email(payload: dict):
    """Send email via SendGrid."""
    pass


async def dispatch_push(payload: dict):
    """Send push notification via Firebase Cloud Messaging."""
    pass


async def dispatch_reminder(payload: dict):
    pass


async def dispatch_receipt(payload: dict):
    """Generate invoice PDF → upload to GCS → email Stripe receipt link."""
    pass


async def dispatch_announcement(payload: dict):
    """Broadcast club announcement to all active players."""
    pass
