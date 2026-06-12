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


class GroupDimension(str, enum.Enum):
    """Which attribute to group players by for the group-LTV report (workstream
    C). All three are computed from ``mv_player_value`` alone — no segmentation
    table (structured multi-dimensional segmentation is deliberately deferred).

    * ``membership_tier``  — the player's current paid plan (`membership_plan_name`),
      with non-members collapsed into a single "Non-member" bucket.
    * ``member_status``    — paid member vs non-member.
    * ``activity_status``  — active / lapsed / never-played, split on
      ``inactive_days`` (reuses the inactive-members recency threshold).
    """

    membership_tier = "membership_tier"
    member_status = "member_status"
    activity_status = "activity_status"


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
    # RFV pre-aggregate scores (from ``mv_player_rfv``, LEFT-joined). Null for
    # players not yet scored — only *engaged* players (bookings_played > 0 OR
    # lifetime_spend > 0) get an RFV row, and a newly-engaged player is null until
    # the next nightly refresh. Each score is a per-club quintile (1 = lowest ..
    # 5 = highest); ``rfv_cell`` is the three scores concatenated, e.g. "543".
    recency_score: Optional[int] = None
    frequency_score: Optional[int] = None
    value_score: Optional[int] = None
    rfv_total: Optional[int] = None
    rfv_cell: Optional[str] = None


class PlayerValueLeaderboard(BaseModel):
    """Per-player lifetime value, highest first. ``members_only`` filters to paid
    members (the per-member LTV view)."""

    club_id: uuid.UUID
    members_only: bool
    sort: PlayerSort
    limit: int
    offset: int
    total_records: int  # total players matching the filter (pre-pagination)
    rows: list[PlayerValueRow]


class PlayerActivityLeaderboard(BaseModel):
    """Most-active players, ranked by recent on-court bookings."""

    club_id: uuid.UUID
    window_days: int
    limit: int
    offset: int
    total_records: int  # total active players in the window (pre-pagination)
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
    total_records: int  # inactive members matching the filter (pre-pagination)
    limit: int
    offset: int
    rows: list[PlayerValueRow]


class GroupValueRow(BaseModel):
    """Aggregated lifetime value for one group of players (workstream C)."""

    group_key: str  # raw grouping value (plan name, "paid_member", "lapsed", …)
    group_label: str  # human-readable label
    player_count: int
    paid_member_count: int
    total_lifetime_spend: Decimal
    avg_lifetime_spend: Decimal  # total / player_count (0 when the group is empty)
    total_lifetime_refunds: Decimal
    total_bookings_played: int


class GroupValueReport(BaseModel):
    """Lifetime value rolled up by a grouping dimension — "financial results per
    group of members". Aggregates ``mv_player_value`` at query time; groups are
    ordered by ``total_lifetime_spend`` descending."""

    club_id: uuid.UUID
    dimension: GroupDimension
    # Only meaningful for ``activity_status`` (echoes the recency threshold used
    # to split active/lapsed); ignored for the other dimensions.
    inactive_days: int
    currency: Optional[str]
    rows: list[GroupValueRow]
