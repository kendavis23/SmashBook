"""Response schemas for the coach-popularity report (G7).

One report, one leaderboard endpoint. Rows are read from ``mv_coach_popularity``
(grain ``(club_id, staff_profile_id)``) with the coach's display name joined live
from ``users`` via ``staff_profiles`` — no PII in the view. ``return_rate`` is
derived in the service (``repeat_players / distinct_players``), not stored in the
view, so cross-coach roll-ups always recompute from numerator and denominator.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class CoachSort(str, enum.Enum):
    """Sort key for the coach-popularity leaderboard (all descending)."""

    sessions = "sessions"
    distinct_players = "distinct_players"
    repeat_players = "repeat_players"
    return_rate = "return_rate"
    lesson_revenue = "lesson_revenue"
    last_session_at = "last_session_at"


class CoachPopularityRow(BaseModel):
    """One coach's lesson volume, reach, repeat business, and revenue at a club.
    ``coach_name`` / ``is_active`` are joined live from ``staff_profiles`` ⋈
    ``users`` (kept out of the MV to avoid stale PII)."""

    staff_profile_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    coach_name: Optional[str]
    is_active: Optional[bool]
    sessions: int
    first_session_at: Optional[datetime]
    last_session_at: Optional[datetime]
    sessions_last_30d: int
    sessions_last_90d: int
    distinct_players: int
    repeat_players: int
    # repeat_players / distinct_players (0.0 when the coach has no players).
    return_rate: float
    total_attendances: int
    lesson_revenue: Decimal
    currency: Optional[str]


class CoachPopularityLeaderboard(BaseModel):
    """Coaches ranked by the chosen metric, highest first."""

    club_id: uuid.UUID
    sort: CoachSort
    limit: int
    offset: int
    total_records: int  # total coaches with at least one session (pre-pagination)
    rows: list[CoachPopularityRow]
