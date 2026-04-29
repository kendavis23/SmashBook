"""
Unit tests for the _should_confirm helper.

Rule: a booking confirms only when every slot is filled (accepted count >= max_players)
AND every accepted player has paid. Both conditions must hold simultaneously.
"""
from unittest.mock import MagicMock

import pytest

from app.db.models.booking import InviteStatus, PaymentStatus
from app.services.booking_service import _should_confirm


def _booking(max_players):
    b = MagicMock()
    b.max_players = max_players
    return b


def _player(invite_status=InviteStatus.accepted, payment_status=PaymentStatus.paid):
    p = MagicMock()
    p.invite_status = invite_status
    p.payment_status = payment_status
    return p


# ---------------------------------------------------------------------------
# Full court + all paid → confirm
# ---------------------------------------------------------------------------

def test_confirms_when_all_slots_filled_and_all_paid():
    booking = _booking(max_players=4)
    players = [_player() for _ in range(4)]
    assert _should_confirm(booking, players) is True


def test_confirms_with_one_slot_one_paid():
    booking = _booking(max_players=1)
    players = [_player()]
    assert _should_confirm(booking, players) is True


# ---------------------------------------------------------------------------
# Court full but someone hasn't paid → stay pending
# ---------------------------------------------------------------------------

def test_does_not_confirm_when_one_player_unpaid():
    booking = _booking(max_players=4)
    players = [_player() for _ in range(3)] + [_player(payment_status=PaymentStatus.pending)]
    assert _should_confirm(booking, players) is False


def test_does_not_confirm_when_all_players_unpaid():
    booking = _booking(max_players=4)
    players = [_player(payment_status=PaymentStatus.pending) for _ in range(4)]
    assert _should_confirm(booking, players) is False


# ---------------------------------------------------------------------------
# Court not full → stay pending regardless of payment
# ---------------------------------------------------------------------------

def test_does_not_confirm_when_court_not_full():
    booking = _booking(max_players=4)
    players = [_player() for _ in range(3)]  # 3 paid, 1 slot open
    assert _should_confirm(booking, players) is False


def test_does_not_confirm_when_no_players():
    booking = _booking(max_players=4)
    assert _should_confirm(booking, []) is False


# ---------------------------------------------------------------------------
# Only accepted players count toward the slot total
# ---------------------------------------------------------------------------

def test_pending_invites_do_not_count_toward_slot_total():
    # 3 accepted + 1 pending-invite = 4 players in list but only 3 accepted slots filled
    booking = _booking(max_players=4)
    players = [
        _player(),
        _player(),
        _player(),
        _player(invite_status=InviteStatus.pending, payment_status=PaymentStatus.pending),
    ]
    assert _should_confirm(booking, players) is False


def test_declined_invites_do_not_count_toward_slot_total():
    booking = _booking(max_players=4)
    players = [
        _player(),
        _player(),
        _player(),
        _player(invite_status=InviteStatus.declined, payment_status=PaymentStatus.paid),
    ]
    assert _should_confirm(booking, players) is False


def test_pending_invite_payment_not_checked():
    # 4 accepted all paid, plus a declined player who hasn't paid — declined is ignored
    booking = _booking(max_players=4)
    players = [
        _player(),
        _player(),
        _player(),
        _player(),
        _player(invite_status=InviteStatus.declined, payment_status=PaymentStatus.pending),
    ]
    assert _should_confirm(booking, players) is True


# ---------------------------------------------------------------------------
# max_players=None falls back to 4
# ---------------------------------------------------------------------------

def test_none_max_players_defaults_to_4_confirmed():
    booking = _booking(max_players=None)
    players = [_player() for _ in range(4)]
    assert _should_confirm(booking, players) is True


def test_none_max_players_defaults_to_4_not_confirmed_at_3():
    booking = _booking(max_players=None)
    players = [_player() for _ in range(3)]
    assert _should_confirm(booking, players) is False
