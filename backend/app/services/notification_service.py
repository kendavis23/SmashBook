"""
NotificationService — publishes notification events to Pub/Sub.
The actual send (email/push) happens in notification_worker.

This service is the single entry point for all outbound notifications
so that callers (booking_service, payment_service, etc.) don't need
to know about SendGrid or Firebase directly.
"""
from app.core.pubsub import publish_notification_event


class NotificationService:

    @staticmethod
    def send_booking_confirmation(booking_id: str, user_ids: list, booking_details: dict) -> None:
        """Email + push: booking confirmed. Sent to organiser and all players."""
        publish_notification_event("send_email", {
            "template": "booking_confirmation",
            "recipients": user_ids,
            "booking_id": booking_id,
            "data": booking_details,
        })
        publish_notification_event("send_push", {
            "template": "booking_confirmation",
            "user_ids": user_ids,
            "booking_id": booking_id,
        })

    @staticmethod
    def send_booking_reminder(booking_id: str, user_ids: list) -> None:
        """Reminder sent N hours before game (reminder_hours_before from ClubSettings)."""
        publish_notification_event("send_booking_reminder", {
            "booking_id": booking_id,
            "user_ids": user_ids,
        })

    @staticmethod
    def send_cancellation_notice(booking_id: str, user_ids: list, refund_amounts: dict) -> None:
        """Notify all players of cancellation with their individual refund amount."""
        publish_notification_event("send_email", {
            "template": "booking_cancelled",
            "recipients": user_ids,
            "booking_id": booking_id,
            "data": {"refund_amounts": refund_amounts},
        })

    @staticmethod
    def send_invite(booking_id: str, invitee_user_id: str, inviter_name: str) -> None:
        """Player receives an invite to join a booking."""
        publish_notification_event("send_push", {
            "template": "player_invite",
            "user_ids": [invitee_user_id],
            "booking_id": booking_id,
            "data": {"inviter_name": inviter_name},
        })

    @staticmethod
    def send_waitlist_available(booking_id: str, user_id: str) -> None:
        """Notify first waitlisted player that a slot has opened."""
        publish_notification_event("waitlist.slot_available", {
            "booking_id": booking_id,
            "user_ids": [user_id],
        })

    @staticmethod
    def send_payment_receipt(booking_id: str, user_id: str, invoice_id: str) -> None:
        publish_notification_event("send_payment_receipt", {
            "booking_id": booking_id,
            "user_id": user_id,
            "invoice_id": invoice_id,
        })

    @staticmethod
    def send_payment_failed_alert(booking_id: str, user_id: str, staff_ids: list) -> None:
        """Alert player to retry + flag to staff."""
        publish_notification_event("send_push", {
            "template": "payment_failed",
            "user_ids": [user_id],
            "booking_id": booking_id,
        })
        publish_notification_event("send_email", {
            "template": "payment_failed_staff_alert",
            "recipients": staff_ids,
            "booking_id": booking_id,
        })

    @staticmethod
    def send_club_announcement(club_id: str, title: str, body: str) -> None:
        """Broadcast announcement to all active players in a club."""
        publish_notification_event("send_club_announcement", {
            "club_id": club_id,
            "title": title,
            "body": body,
        })
