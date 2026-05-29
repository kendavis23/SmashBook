"""Shared booking auto-confirmation rule.

A booking confirms only when every player slot is filled
(accepted_count >= max_players) and every accepted player has paid. This rule is
evaluated from several call sites — booking creation/join/invite-response and the
payment confirmation paths (card webhook + wallet debit) — so it lives here as a
single source of truth rather than being re-implemented at each one.
"""
from app.db.models.booking import Booking, BookingPlayer, InviteStatus, PaymentStatus


def should_confirm(booking: Booking, players: list[BookingPlayer]) -> bool:
    """Return True only when all slots are filled and every accepted player has paid."""
    max_p = booking.max_players or 4
    accepted = [p for p in players if p.invite_status == InviteStatus.accepted]
    return (
        len(accepted) >= max_p
        and all(p.payment_status == PaymentStatus.paid for p in accepted)
    )
