"""Response schemas for court-utilisation analytics endpoints (G7)."""
from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class DailyUtilisationPoint(BaseModel):
    """One day's utilisation for a club, aggregated across its courts."""

    snapshot_date: date
    total_slots: int
    booked_slots: int
    utilisation_pct: Decimal
    revenue_actual: Decimal
    revenue_potential: Decimal


class ClubDailyUtilisation(BaseModel):
    club_id: uuid.UUID
    date_from: date
    date_to: date
    points: list[DailyUtilisationPoint]


class CourtUtilisationSummary(BaseModel):
    """A single court's utilisation rolled up over the requested date range."""

    court_id: uuid.UUID
    court_name: str
    total_slots: int
    booked_slots: int
    utilisation_pct: Decimal
    revenue_actual: Decimal
    revenue_potential: Decimal


class ClubCourtsUtilisation(BaseModel):
    club_id: uuid.UUID
    date_from: date
    date_to: date
    courts: list[CourtUtilisationSummary]


class HeatmapCell(BaseModel):
    """Average utilisation for one (day_of_week, hour_of_day) bucket."""

    day_of_week: int          # 0=Mon … 6=Sun
    hour_of_day: int          # 0–23
    avg_utilisation_pct: Decimal
    total_slots: int
    booked_slots: int


class ClubUtilisationHeatmap(BaseModel):
    club_id: uuid.UUID
    date_from: date
    date_to: date
    cells: list[HeatmapCell]
