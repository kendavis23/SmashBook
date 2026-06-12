"""
Unit tests for the staff_invite notification handler.

No DB or network — patches _send_email so nothing hits SendGrid.

Regression guard for the bug where the invite endpoint published a
``staff_invite`` Pub/Sub event but notification_worker had no handler for it,
so staff invitation emails were silently dropped.

Coverage
--------
- staff_invite is registered in the dispatch table (process_notification_event
  resolves a handler, does not fall through to the "no handler" path)
- dispatch_staff_invite builds a message and calls _send_email with the right
  event_type and recipient
- a payload missing email or invite_url returns without sending
"""
import base64
import json
from unittest.mock import patch

from app.workers import notification_worker
from app.workers.notification_worker import dispatch_staff_invite


def _valid_payload():
    return {
        "invitation_id": "11111111-1111-1111-1111-111111111111",
        "email": "newhire@example.com",
        "role": "trainer",
        "tenant_name": "Acme Padel",
        "club_id": "22222222-2222-2222-2222-222222222222",
        "club_name": "Acme Padel Downtown",
        "invited_by": "Jane Owner",
        "invite_url": "https://acme.smashbook.app/complete-staff-invitation?token=abc",
    }


class TestDispatchStaffInvite:
    async def test_sends_email_with_correct_event_type_and_recipient(self):
        with patch.object(notification_worker, "_send_email") as mock_send:
            await dispatch_staff_invite(_valid_payload())

        mock_send.assert_called_once()
        _, message = mock_send.call_args.args
        assert mock_send.call_args.kwargs["event_type"] == "staff_invite"
        assert mock_send.call_args.kwargs["recipient"] == "newhire@example.com"
        # The invite link must make it into the email body.
        assert "complete-staff-invitation" in str(message.contents[0].content)

    async def test_missing_invite_url_returns_without_sending(self):
        payload = _valid_payload()
        del payload["invite_url"]
        with patch.object(notification_worker, "_send_email") as mock_send:
            await dispatch_staff_invite(payload)
        mock_send.assert_not_called()

    async def test_missing_email_returns_without_sending(self):
        payload = _valid_payload()
        del payload["email"]
        with patch.object(notification_worker, "_send_email") as mock_send:
            await dispatch_staff_invite(payload)
        mock_send.assert_not_called()


class TestStaffInviteRegistered:
    async def test_event_resolves_to_handler(self):
        """A staff_invite event must reach dispatch_staff_invite — not the
        'no handler' fall-through that originally swallowed it."""
        envelope = {
            "message": {
                "data": base64.b64encode(
                    json.dumps(
                        {"event_type": "staff_invite", "payload": _valid_payload()}
                    ).encode()
                ).decode()
            }
        }

        class _FakeRequest:
            async def json(self):
                return envelope

        with patch.object(
            notification_worker, "dispatch_staff_invite"
        ) as mock_handler:
            result = await notification_worker.process_notification_event(_FakeRequest())

        mock_handler.assert_called_once()
        assert result == {"status": "ok"}
