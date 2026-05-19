"""
Pub/Sub subscriber: notification-events topic
Centralised notification dispatch: email, push, in-app.
Deployed as a separate Cloud Run service.
"""
from fastapi import FastAPI, Request
import base64
import json
import logging
import sendgrid
from sendgrid.helpers.mail import Mail

from app.core.config import get_settings

logger = logging.getLogger(__name__)

app = FastAPI()


def _send_email(sg: sendgrid.SendGridAPIClient, message: Mail, *, event_type: str, recipient: str) -> None:
    """Send via SendGrid and surface failures. Raises on transport error or non-2xx so Pub/Sub retries / DLQs."""
    try:
        response = sg.send(message)
    except Exception:
        logger.exception("sendgrid send raised event_type=%s recipient=%s", event_type, recipient)
        raise
    if response.status_code >= 400:
        logger.error(
            "sendgrid rejected event_type=%s recipient=%s status=%s body=%s",
            event_type, recipient, response.status_code, response.body,
        )
        raise RuntimeError(f"sendgrid returned {response.status_code} for {event_type}")
    logger.info(
        "sendgrid accepted event_type=%s recipient=%s status=%s",
        event_type, recipient, response.status_code,
    )


@app.get("/healthz")
async def health():
    return {"status": "ok"}

@app.post("/")
async def process_notification_event(request: Request):
    envelope = await request.json()
    message = envelope.get("message", {})
    message_id = message.get("messageId") or message.get("message_id")
    try:
        data = json.loads(base64.b64decode(message.get("data", "")).decode())
    except Exception:
        logger.exception("notification worker: malformed pubsub envelope message_id=%s", message_id)
        raise

    event_type = data.get("event_type")
    payload = data.get("payload", {})

    handlers = {
        "send_email": dispatch_email,
        "send_push": dispatch_push,
        "send_booking_reminder": dispatch_reminder,
        "send_payment_receipt": dispatch_receipt,
        "send_club_announcement": dispatch_announcement,
        "password_reset": dispatch_password_reset,
        "welcome": dispatch_welcome,
    }

    handler = handlers.get(event_type)
    if not handler:
        logger.warning(
            "notification worker: no handler for event_type=%s message_id=%s",
            event_type, message_id,
        )
        return {"status": "ok"}

    try:
        await handler(payload)
    except Exception:
        logger.exception(
            "notification handler failed event_type=%s message_id=%s",
            event_type, message_id,
        )
        raise

    return {"status": "ok"}


async def dispatch_password_reset(payload: dict):
    """Send password reset email via SendGrid."""
    settings = get_settings()
    email = payload["email"]
    sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
    message = Mail(
        from_email=settings.SENDGRID_FROM_EMAIL,
        to_emails=email,
        subject="Reset your SmashBook password",
        html_content=(
            f"<p>Click the link below to reset your password. "
            f"This link expires in 30 minutes.</p>"
            f'<p><a href="{payload["reset_url"]}">Reset password</a></p>'
            f"<p>If you did not request a password reset, you can safely ignore this email.</p>"
        ),
    )
    _send_email(sg, message, event_type="password_reset", recipient=email)


async def dispatch_email(payload: dict):
    """Send email via SendGrid."""
    pass


async def dispatch_push(payload: dict):
    """Send push notification via Firebase Cloud Messaging."""
    pass


async def dispatch_reminder(payload: dict):
    pass


async def dispatch_welcome(payload: dict):
    """Welcome email sent after a new player registers."""
    settings = get_settings()
    email = payload.get("email")
    if not email:
        logger.warning("welcome payload missing email user_id=%s", payload.get("user_id"))
        return
    full_name = payload.get("full_name") or "there"
    tenant_name = payload.get("tenant_name") or "SmashBook"
    sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
    message = Mail(
        from_email=settings.SENDGRID_FROM_EMAIL,
        to_emails=email,
        subject=f"Welcome to {tenant_name}",
        html_content=(
            f"<p>Hi {full_name},</p>"
            f"<p>Welcome to {tenant_name}. Your account is ready — "
            f"you can sign in any time at "
            f'<a href="{settings.APP_BASE_URL}">{settings.APP_BASE_URL}</a> '
            f"to book courts, join games, and manage your profile.</p>"
            f"<p>See you on court.</p>"
        ),
    )
    _send_email(sg, message, event_type="welcome", recipient=email)


async def dispatch_receipt(payload: dict):
    """Payment confirmation email. Forwards Stripe's receipt URL when present."""
    settings = get_settings()
    email = payload.get("email")
    if not email:
        logger.warning(
            "receipt payload missing email user_id=%s payment_id=%s",
            payload.get("user_id"), payload.get("payment_id"),
        )
        return
    full_name = payload.get("full_name") or "there"
    amount = payload.get("amount")
    currency = (payload.get("currency") or "").upper()
    receipt_url = payload.get("receipt_url")
    payment_method = payload.get("payment_method")

    amount_line = f"{amount} {currency}".strip() if amount else "your booking"
    if receipt_url:
        body_html = (
            f"<p>Hi {full_name},</p>"
            f"<p>We've received your payment of <strong>{amount_line}</strong>. "
            f'View the full receipt here: <a href="{receipt_url}">{receipt_url}</a>.</p>'
            f"<p>Thanks for playing.</p>"
        )
    else:
        method_line = " from your wallet" if payment_method == "wallet" else ""
        body_html = (
            f"<p>Hi {full_name},</p>"
            f"<p>We've received your payment of <strong>{amount_line}</strong>{method_line}. "
            f"Your booking is confirmed.</p>"
            f"<p>Thanks for playing.</p>"
        )

    sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
    message = Mail(
        from_email=settings.SENDGRID_FROM_EMAIL,
        to_emails=email,
        subject="Your SmashBook payment receipt",
        html_content=body_html,
    )
    _send_email(sg, message, event_type="send_payment_receipt", recipient=email)


async def dispatch_announcement(payload: dict):
    """Broadcast club announcement to all active players."""
    pass
