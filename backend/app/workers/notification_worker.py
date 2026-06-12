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

@app.post("/pubsub")
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
        "email_verify": dispatch_email_verify,
        "player_invite": dispatch_player_invite,
        "staff_invite": dispatch_staff_invite,
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


async def dispatch_email_verify(payload: dict):
    """
    Verification email sent on player registration. The link expires in 24h
    (see create_verify_token). The welcome email is sent separately, after
    the player clicks through.
    """
    settings = get_settings()
    email = payload.get("email")
    if not email:
        logger.warning("email_verify payload missing email user_id=%s", payload.get("user_id"))
        return
    full_name = payload.get("full_name") or "there"
    tenant_name = payload.get("tenant_name") or "SmashBook"
    club_name = payload.get("club_name") or tenant_name
    verify_url = payload["verify_url"]
    sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
    message = Mail(
        from_email=settings.SENDGRID_FROM_EMAIL,
        to_emails=email,
        subject=f"Verify your email to join {club_name}",
        html_content=(
            f"<p>Hi {full_name},</p>"
            f"<p>Thanks for signing up at <strong>{club_name}</strong>. "
            f"Click the link below to verify your email and finish setting up your account. "
            f"This link expires in 24 hours.</p>"
            f'<p><a href="{verify_url}">Verify my email</a></p>'
            f"<p>If you did not sign up for {tenant_name}, you can safely ignore this email.</p>"
        ),
    )
    _send_email(sg, message, event_type="email_verify", recipient=email)


async def dispatch_player_invite(payload: dict):
    """
    Staff-initiated player invitation email. Includes a 7-day link to
    /complete-invitation where the recipient sets their password and finishes
    verifying their email.
    """
    settings = get_settings()
    email = payload.get("email")
    if not email:
        logger.warning("player_invite payload missing email user_id=%s", payload.get("user_id"))
        return
    full_name = payload.get("full_name") or "there"
    tenant_name = payload.get("tenant_name") or "SmashBook"
    club_name = payload.get("club_name") or tenant_name
    invited_by = payload.get("invited_by")
    invite_url = payload["invite_url"]
    intro = (
        f"{invited_by} has invited you" if invited_by else "You've been invited"
    )
    sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
    message = Mail(
        from_email=settings.SENDGRID_FROM_EMAIL,
        to_emails=email,
        subject=f"You're invited to join {club_name}",
        html_content=(
            f"<p>Hi {full_name},</p>"
            f"<p>{intro} to join <strong>{club_name}</strong> on SmashBook. "
            f"Click the link below to set your password and finish creating your account. "
            f"This link expires in 7 days.</p>"
            f'<p><a href="{invite_url}">Accept invitation</a></p>'
            f"<p>If you weren't expecting this invitation, you can safely ignore this email.</p>"
        ),
    )
    _send_email(sg, message, event_type="player_invite", recipient=email)


async def dispatch_staff_invite(payload: dict):
    """
    Staff onboarding invitation email (Phase B). Sent only for an email that is
    not yet a tenant user — includes a 7-day link to /complete-staff-invitation
    where the recipient sets their password and finishes creating their account.

    Existing tenant users are promoted in place by the invite endpoint and never
    reach this handler, so no name is known here — greet generically.
    """
    settings = get_settings()
    email = payload.get("email")
    invite_url = payload.get("invite_url")
    if not email or not invite_url:
        logger.warning(
            "staff_invite payload missing email/invite_url invitation_id=%s",
            payload.get("invitation_id"),
        )
        return
    tenant_name = payload.get("tenant_name") or "SmashBook"
    club_name = payload.get("club_name") or tenant_name
    role = payload.get("role")
    invited_by = payload.get("invited_by")
    intro = (
        f"{invited_by} has invited you" if invited_by else "You've been invited"
    )
    role_phrase = f" as a <strong>{role}</strong>" if role else ""
    sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
    message = Mail(
        from_email=settings.SENDGRID_FROM_EMAIL,
        to_emails=email,
        subject=f"You're invited to join {club_name} as staff",
        html_content=(
            f"<p>Hi there,</p>"
            f"<p>{intro} to join <strong>{club_name}</strong>{role_phrase} on SmashBook. "
            f"Click the link below to set your password and finish creating your account. "
            f"This link expires in 7 days.</p>"
            f'<p><a href="{invite_url}">Accept invitation</a></p>'
            f"<p>If you weren't expecting this invitation, you can safely ignore this email.</p>"
        ),
    )
    _send_email(sg, message, event_type="staff_invite", recipient=email)


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
    login_url = payload.get("login_url") or settings.APP_BASE_URL
    sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
    message = Mail(
        from_email=settings.SENDGRID_FROM_EMAIL,
        to_emails=email,
        subject=f"Welcome to {tenant_name}",
        html_content=(
            f"<p>Hi {full_name},</p>"
            f"<p>Welcome to {tenant_name}. Your account is ready — "
            f"you can sign in any time at "
            f'<a href="{login_url}">{login_url}</a> '
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
