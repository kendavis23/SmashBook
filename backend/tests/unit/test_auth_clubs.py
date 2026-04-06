"""
Unit tests for _get_user_clubs() in app.api.v1.endpoints.auth.

The DB session is mocked — no Postgres required.
Tests focus on the branching logic:
  - Staff users → sourced from staff_profiles (active only)
  - Players     → sourced from membership_subscriptions (active only), only when no staff clubs found
  - Empty list  → returned when neither table has matching rows
"""
import uuid
from typing import List, Optional
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.api.v1.endpoints.auth import _get_user_clubs
from app.db.models.staff import StaffRole
from app.db.models.user import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_user() -> MagicMock:
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    return user


def _make_staff_profile(club_id: uuid.UUID, role: StaffRole = StaffRole.trainer) -> MagicMock:
    sp = MagicMock()
    sp.club_id = club_id
    sp.role = role
    return sp


def _make_club(name: str = "Test Club") -> MagicMock:
    club = MagicMock()
    club.id = uuid.uuid4()
    club.name = name
    return club


def _make_subscription() -> MagicMock:
    return MagicMock()


def _mock_db(staff_rows: List, player_rows: Optional[List] = None) -> AsyncMock:
    """
    Build a mock AsyncSession whose execute() returns staff_rows on the first
    call and player_rows on the second call (if made).
    """
    db = AsyncMock()
    side_effects = [staff_rows]
    if player_rows is not None:
        side_effects.append(player_rows)
    db.execute.side_effect = side_effects
    return db


# ---------------------------------------------------------------------------
# Staff user scenarios
# ---------------------------------------------------------------------------


class TestGetUserClubsStaff:
    async def test_staff_single_club_returns_correct_role(self):
        user = _make_user()
        club = _make_club("Padel HQ")
        sp = _make_staff_profile(club.id, role=StaffRole.trainer)
        db = _mock_db(staff_rows=[(sp, club)])

        result = await _get_user_clubs(user, db)

        assert len(result) == 1
        assert result[0].club_id == club.id
        assert result[0].club_name == "Padel HQ"
        assert result[0].role == "trainer"

    async def test_staff_multiple_clubs_returns_all(self):
        user = _make_user()
        club_a = _make_club("Club A")
        club_b = _make_club("Club B")
        sp_a = _make_staff_profile(club_a.id, role=StaffRole.trainer)
        sp_b = _make_staff_profile(club_b.id, role=StaffRole.admin)
        db = _mock_db(staff_rows=[(sp_a, club_a), (sp_b, club_b)])

        result = await _get_user_clubs(user, db)

        assert len(result) == 2
        roles = {r.role for r in result}
        assert roles == {"trainer", "admin"}

    async def test_staff_result_does_not_query_memberships(self):
        """When staff clubs are found, the player membership query must not run."""
        user = _make_user()
        club = _make_club()
        sp = _make_staff_profile(club.id)
        db = _mock_db(staff_rows=[(sp, club)])

        await _get_user_clubs(user, db)

        assert db.execute.call_count == 1

    async def test_all_staff_roles_returned_correctly(self):
        user = _make_user()
        cases = [
            (StaffRole.trainer, "trainer"),
            (StaffRole.ops_lead, "ops_lead"),
            (StaffRole.admin, "admin"),
            (StaffRole.front_desk, "front_desk"),
        ]
        for staff_role, expected_str in cases:
            club = _make_club()
            sp = _make_staff_profile(club.id, role=staff_role)
            db = _mock_db(staff_rows=[(sp, club)])

            result = await _get_user_clubs(user, db)

            assert result[0].role == expected_str


# ---------------------------------------------------------------------------
# Player user scenarios
# ---------------------------------------------------------------------------


class TestGetUserClubsPlayer:
    async def test_player_with_active_membership_returns_club(self):
        user = _make_user()
        club = _make_club("Player Club")
        sub = _make_subscription()
        db = _mock_db(staff_rows=[], player_rows=[(sub, club)])

        result = await _get_user_clubs(user, db)

        assert len(result) == 1
        assert result[0].club_id == club.id
        assert result[0].club_name == "Player Club"
        assert result[0].role == "player"

    async def test_player_multiple_active_memberships_returns_all(self):
        user = _make_user()
        club_a = _make_club("Club A")
        club_b = _make_club("Club B")
        db = _mock_db(
            staff_rows=[],
            player_rows=[(_make_subscription(), club_a), (_make_subscription(), club_b)],
        )

        result = await _get_user_clubs(user, db)

        assert len(result) == 2
        names = {r.club_name for r in result}
        assert names == {"Club A", "Club B"}

    async def test_player_membership_query_only_runs_when_no_staff_clubs(self):
        """Membership query is the fallback — must not run when staff rows exist."""
        user = _make_user()
        club = _make_club()
        sp = _make_staff_profile(club.id)
        # Provide player_rows too — they should never be consumed
        db = _mock_db(staff_rows=[(sp, club)], player_rows=[(_make_subscription(), _make_club())])

        result = await _get_user_clubs(user, db)

        assert db.execute.call_count == 1
        assert result[0].role != "player"


# ---------------------------------------------------------------------------
# Empty / no-club scenarios
# ---------------------------------------------------------------------------


class TestGetUserClubsEmpty:
    async def test_no_staff_no_membership_returns_empty_list(self):
        user = _make_user()
        db = _mock_db(staff_rows=[], player_rows=[])

        result = await _get_user_clubs(user, db)

        assert result == []

    async def test_both_queries_run_when_staff_rows_empty(self):
        user = _make_user()
        db = _mock_db(staff_rows=[], player_rows=[])

        await _get_user_clubs(user, db)

        assert db.execute.call_count == 2
