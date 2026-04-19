"""
Pub/Sub subscriber: notification-events topic
Centralised notification dispatch: email, push, in-app.
Deployed as a separate Cloud Run service.
"""
from fastapi import FastAPI, Request
import base64
import json
import sendgrid
from sendgrid.helpers.mail import Mail

from app.core.config import get_settings

app = FastAPI()


@app.get("/healthz")
async def health():
    return {"status": "ok"}

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
        "password_reset": dispatch_password_reset,
    }

    handler = handlers.get(event_type)
    if handler:
        await handler(payload)

    return {"status": "ok"}


async def dispatch_password_reset(payload: dict):
    """Send password reset email via SendGrid."""
    settings = get_settings()
    sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
    message = Mail(
        from_email=settings.SENDGRID_FROM_EMAIL,
        to_emails=payload["email"],
        subject="Reset your SmashBook password",
        html_content=(
            f"<p>Click the link below to reset your password. "
            f"This link expires in 30 minutes.</p>"
            f'<p><a href="{payload["reset_url"]}">Reset password</a></p>'
            f"<p>If you did not request a password reset, you can safely ignore this email.</p>"
        ),
    )
    sg.send(message)


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
