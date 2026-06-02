"""Response schemas for the club-level "player flow" analytics endpoints
(G7, workstream A): active players and new member sign-ups.

Two materialized views back these:
  * ``mv_club_active_player_day`` (presence grain) -> active KPI + timeseries
  * ``mv_club_signups_day`` (flow grain)            -> sign-ups timeseries

"Active" counts distinct players actually on court (``booking_players``).
"Sign-ups" counts new **paid** membership subscription starts (plan price > 0).
"""
from __future__ import annotations

import enum
import uuid
from datetime import date

from pydantic import BaseModel


class FlowGranularity(str, enum.Enum):
    day = "day"
    week = "week"
    month = "month"


class ActivePlayersKpi(BaseModel):
    """Distinct players who were on court within the trailing ``window_days``
    ending ``as_of`` — the "active players over the last N days" headline."""

    club_id: uuid.UUID
    as_of: date
    window_days: int
    active_players: int


class ActivePlayersPoint(BaseModel):
    period_start: date  # club-local start of the calendar bucket
    active_players: int  # distinct players active within that bucket


class ActivePlayersTimeseries(BaseModel):
    """Distinct active players per *calendar* bucket (WAP/MAP analog). Buckets
    are calendar periods, not a trailing window, so the same player active in
    two months counts once per month — not deduplicated across the range."""

    club_id: uuid.UUID
    granularity: FlowGranularity
    date_from: date
    date_to: date
    points: list[ActivePlayersPoint]


class SignupsPoint(BaseModel):
    period_start: date
    signups: int


class SignupsTimeseries(BaseModel):
    """New paid-member sign-ups over time. Additive — ``total_signups`` is the
    sum across the range."""

    club_id: uuid.UUID
    granularity: FlowGranularity
    date_from: date
    date_to: date
    total_signups: int
    points: list[SignupsPoint]
