"""Response schemas for the "Player value" analytics endpoints (G7, workstream B).

All three reports read one materialized view, ``mv_player_value`` (grain
``(club_id, user_id)`` — a point-in-time stock, refreshed nightly):

  * inactive members  -> ``InactiveMembersReport``
  * per-member LTV     -> ``PlayerValueLeaderboard``
  * most-active players-> ``PlayerActivityLeaderboard``

``lifetime_spend`` is **net realised spend** — the player's own succeeded /
refunded payments, minus refunds (equipment is already embedded in the payment
amount). Membership MRR is excluded, matching the revenue report.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class PlayerSort(str, enum.Enum):
    """Sort key for the player-value leaderboard."""

    lifetime_spend = "lifetime_spend"
    bookings_played = "bookings_played"
    last_played_at = "last_played_at"


class PlayerValueRow(BaseModel):
    """One player's lifetime value + recency at a club. ``full_name`` / ``email``
    are joined live from ``users`` (kept out of the MV to avoid stale PII)."""

    user_id: uuid.UUID
    full_name: Optional[str]
    email: Optional[str]
    is_paid_member: bool
    membership_plan_name: Optional[str]
    first_played_at: Optional[datetime]
    last_played_at: Optional[datetime]
    bookings_played: int
    played_last_30d: int
    played_last_90d: int
    lifetime_gross: Decimal
    lifetime_refunds: Decimal
    lifetime_spend: Decimal
    payments_count: int
    currency: Optional[str]


class PlayerValueLeaderboard(BaseModel):
    """Per-player lifetime value, highest first. ``members_only`` filters to paid
    members (the per-member LTV view)."""

    club_id: uuid.UUID
    members_only: bool
    sort: PlayerSort
    limit: int
    offset: int
    rows: list[PlayerValueRow]


class PlayerActivityLeaderboard(BaseModel):
    """Most-active players, ranked by recent on-court bookings."""

    club_id: uuid.UUID
    window_days: int
    limit: int
    offset: int
    rows: list[PlayerValueRow]


class InactiveMembersReport(BaseModel):
    """Paid members who have not played within ``inactive_days`` (including those
    who have never played). Ordered by ``last_played_at`` ascending (longest-gone
    first; never-played sort first via NULLS FIRST)."""

    club_id: uuid.UUID
    inactive_days: int
    cutoff: datetime  # last_played_at strictly before this counts as inactive
    member_count: int  # total paid members at the club (the denominator)
    inactive_count: int
    limit: int
    offset: int
    rows: list[PlayerValueRow]
