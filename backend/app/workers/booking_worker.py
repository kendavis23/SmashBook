"""
Pub/Sub subscriber: booking-events topic
Handles async side-effects after booking creation/cancellation.
Deployed as a separate Cloud Run service.
"""
from fastapi import FastAPI, Request
import base64
import json

app = FastAPI()


@app.post("/")
async def process_booking_event(request: Request):
    """Receive Pub/Sub push delivery for booking events."""
    envelope = await request.json()
    message = envelope.get("message", {})
    data = json.loads(base64.b64decode(message.get("data", "")).decode())

    event_type = data.get("event_type")
    payload = data.get("payload", {})

    handlers = {
        "booking.created": handle_booking_created,
        "booking.confirmed": handle_booking_confirmed,
        "booking.cancelled": handle_booking_cancelled,
        "booking.reminder_due": handle_booking_reminder,
        "waitlist.slot_available": handle_waitlist_slot,
    }

    handler = handlers.get(event_type)
    if handler:
        await handler(payload)

    return {"status": "ok"}


async def handle_booking_created(payload: dict):
    """Send confirmation email/push to organiser and invited players."""
    pass


async def handle_booking_confirmed(payload: dict):
    """Booking reached min_players_to_confirm — notify all players."""
    pass


async def handle_booking_cancelled(payload: dict):
    """Trigger refund calculation and notify players."""
    pass


async def handle_booking_reminder(payload: dict):
    """Send match reminder notification N hours before game."""
    pass


async def handle_waitlist_slot(payload: dict):
    """Notify waitlisted players that a slot has opened."""
    pass
