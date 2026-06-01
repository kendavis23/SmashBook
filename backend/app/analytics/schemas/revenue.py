"""Response schemas for the "Financials by club" revenue analytics endpoints (G7).

All totals are **transactional revenue** — money that flowed through a
``payments`` row (court time + equipment, split across the booking_type and
``equipment`` revenue types). Membership MRR is Stripe-only and intentionally
excluded; see REPORT_CATALOG.md → "Revenue by club, period".
"""
from __future__ import annotations

import enum
import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class RevenueBasis(str, enum.Enum):
    """Which timestamp anchors a revenue row.

    ``service`` buckets by ``bookings.start_datetime`` (when the court time is
    delivered — accrual view); ``cash`` buckets by ``payments.created_at`` (when
    the money actually moved). Each maps to its own materialized view.
    """

    service = "service"
    cash = "cash"


class Granularity(str, enum.Enum):
    day = "day"
    week = "week"
    month = "month"


class RevenueTimeseriesPoint(BaseModel):
    period_start: date  # club-local start of the day/week/month bucket
    gross_amount: Decimal
    refund_amount: Decimal
    net_amount: Decimal
    transaction_count: int


class ClubRevenueTimeseries(BaseModel):
    club_id: uuid.UUID
    basis: RevenueBasis
    granularity: Granularity
    date_from: date
    date_to: date
    currency: Optional[str]
    points: list[RevenueTimeseriesPoint]


class RevenueByTypeRow(BaseModel):
    revenue_type: str  # regular | lesson_individual | lesson_group | corporate_event | tournament | equipment
    gross_amount: Decimal
    refund_amount: Decimal
    net_amount: Decimal
    transaction_count: int


class ClubRevenueByType(BaseModel):
    club_id: uuid.UUID
    basis: RevenueBasis
    date_from: date
    date_to: date
    currency: Optional[str]
    rows: list[RevenueByTypeRow]


class ClubRevenueSummary(BaseModel):
    club_id: uuid.UUID
    basis: RevenueBasis
    date_from: date
    date_to: date
    currency: Optional[str]
    gross_amount: Decimal
    refund_amount: Decimal
    net_amount: Decimal
    transaction_count: int
    # net_amount / transaction_count. Named per-transaction (not per-booking)
    # because the MV granularity is the payment, and one booking can split into
    # several payments. 0 when there are no transactions.
    avg_transaction_value: Decimal
    by_type: list[RevenueByTypeRow]


class ClubRevenueComparisonRow(BaseModel):
    club_id: uuid.UUID
    club_name: str
    currency: Optional[str]
    gross_amount: Decimal
    refund_amount: Decimal
    net_amount: Decimal
    transaction_count: int


class TenantRevenueComparison(BaseModel):
    """Tenant-wide cross-club comparison — the multi-site ROI view."""

    basis: RevenueBasis
    date_from: date
    date_to: date
    clubs: list[ClubRevenueComparisonRow]
