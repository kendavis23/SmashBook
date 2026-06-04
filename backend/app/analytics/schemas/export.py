"""Request/response schemas for async analytics report exports (G7).

Exports are **asynchronous** (analytics/CLAUDE.md rule 5): the endpoint validates
the request, publishes ``analytics.export_requested`` to the ``analytics-events``
topic, and returns ``202 Accepted``. The ``export_report`` worker generates the
file, uploads it to ``GCS_BUCKET_EXPORTS``, and emails a 1-hour signed download
URL. Nothing is streamed through the request path, and no job-tracking table is
needed — the signed link is delivered by email, not polled.

This is the async successor to the old synchronous ``GET /reports/export`` stub.
"""
from __future__ import annotations

import enum
import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel

from app.analytics.schemas.revenue import RevenueBasis


class ExportReportType(str, enum.Enum):
    """Which report to export. Each value maps to a builder in the worker's
    ``REPORT_BUILDERS`` registry; all current reports are club-scoped.

    These cover the concerns of the retired ``/reports/*`` stubs:
    revenue/dashboard/corporate-events all read the revenue views (corporate
    events + tournaments are revenue types in ``revenue_by_type``), and the
    retention concern is served by ``player_value``.
    """

    revenue_summary = "revenue_summary"
    revenue_by_type = "revenue_by_type"
    revenue_timeseries = "revenue_timeseries"
    player_value = "player_value"


class ExportFormat(str, enum.Enum):
    csv = "csv"
    xlsx = "xlsx"


class ExportRequest(BaseModel):
    """Body for ``POST /api/v1/analytics/exports``."""

    report_type: ExportReportType
    club_id: uuid.UUID  # all exportable reports are club-scoped today
    format: ExportFormat = ExportFormat.csv
    # Revenue reports only; ignored by player_value. Default the trailing 30 days
    # is applied by the worker when omitted.
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    basis: RevenueBasis = RevenueBasis.service


class ExportAccepted(BaseModel):
    """``202`` acknowledgement — the file is produced asynchronously and the
    download link is emailed to the requesting staff member."""

    status: str = "queued"
    report_type: ExportReportType
    format: ExportFormat
    detail: str
