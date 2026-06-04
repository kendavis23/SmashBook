"""Pub/Sub subscriber: async report-export worker (Sprint 7 / G7).

Consumes ``analytics.export_requested`` events published by
``app/analytics/api/exports.py``. For each request it:

1. resolves the report type to a builder (``REPORT_BUILDERS``),
2. runs the builder against the **read replica** (`AsyncReadSessionLocal`),
3. serialises the rows to CSV or XLSX,
4. uploads the file to ``GCS_BUCKET_EXPORTS`` (1-hour signed URL, 7-day GCS
   lifecycle delete — see ``StorageService.upload_report_export``), and
5. emails the signed download URL to the requesting staff member.

Deployed as a separate Cloud Run service from the same image
(``Dockerfile.worker``), subscribed to its own ``analytics-export-events`` topic
(one topic per worker, mirroring the snapshot/refresh split, so this worker never
receives the scheduled snapshot/refresh messages). The ``event_type`` guard is a
belt-and-braces check, not the isolation mechanism.

The email is sent directly via SendGrid here rather than through the generic
``send_email`` notification event, because that path needs the freshly-minted
signed URL and the notification worker's generic ``dispatch_email`` is not the
owner of export delivery. On any failure the worker logs and publishes to
``analytics-alerts`` — it never silently drops a requested export.
"""
from __future__ import annotations

import base64
import csv
import io
import json
import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import sendgrid
from fastapi import FastAPI, Request
from sendgrid.helpers.mail import Mail

from app.analytics.schemas.player import PlayerSort
from app.analytics.schemas.revenue import Granularity, RevenueBasis
from app.analytics.services.player_value_service import PlayerValueService
from app.analytics.services.revenue_service import RevenueService
from app.core.config import get_settings
from app.core.pubsub import publish_analytics_alert
from app.db.session import AsyncReadSessionLocal
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

app = FastAPI()

_DEFAULT_RANGE_DAYS = 30
# Hard cap so a runaway club can't materialise an unbounded export in memory.
_MAX_PLAYER_ROWS = 50_000
_PLAYER_PAGE = 500


@app.get("/healthz")
async def health():
    return {"status": "ok"}


@app.post("/pubsub")
async def process_export_event(request: Request):
    """Receive a Pub/Sub push delivery for analytics export events."""
    envelope = await request.json()
    message = envelope.get("message", {})
    data = json.loads(base64.b64decode(message.get("data", "")).decode())

    event_type = data.get("event_type")
    if event_type != "analytics.export_requested":
        # Snapshot/refresh events share this topic; not ours.
        return {"status": "ignored", "event_type": event_type}

    payload = data.get("payload", {}) or {}
    return await run_export(payload)


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


def _resolve_range(date_from: str | None, date_to: str | None) -> tuple[date, date]:
    today = datetime.now(timezone.utc).date()
    end = date.fromisoformat(date_to) if date_to else today
    start = date.fromisoformat(date_from) if date_from else (end - timedelta(days=_DEFAULT_RANGE_DAYS))
    return start, end


async def run_export(payload: dict) -> dict:
    """Build, upload, and email one export. Returns a small status dict."""
    report_type = payload.get("report_type")
    recipient = payload.get("recipient_email")
    club_id_raw = payload.get("club_id")

    builder = REPORT_BUILDERS.get(report_type)
    if builder is None:
        logger.error("export: unknown report_type=%s", report_type)
        publish_analytics_alert(
            "analytics.export_failed",
            {"report_type": report_type, "error": "unknown report_type"},
        )
        return {"status": "failed", "error": "unknown report_type"}

    try:
        club_id = uuid.UUID(club_id_raw)
        fmt = (payload.get("format") or "csv").lower()
        async with AsyncReadSessionLocal() as db:
            headers, rows = await builder(db, club_id, payload)

        file_bytes = _to_csv(headers, rows) if fmt == "csv" else _to_xlsx(headers, rows)
        filename = f"{report_type}_{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.{fmt}"

        signed_url = StorageService.upload_report_export(
            file_bytes=file_bytes,
            club_id=str(club_id),
            report_type=report_type,
            filename=filename,
        )

        _email_export(recipient, report_type, signed_url)
        return {"status": "ok", "rows": len(rows), "filename": filename}
    except Exception as exc:  # noqa: BLE001 - record + alert on any failure
        logger.exception("export failed report_type=%s", report_type)
        publish_analytics_alert(
            "analytics.export_failed",
            {"report_type": report_type, "club_id": club_id_raw, "error": str(exc)},
        )
        return {"status": "failed", "error": str(exc)}


# ---------------------------------------------------------------------------
# Report builders -> (headers, rows). Rows are lists of CSV-safe scalars.
# ---------------------------------------------------------------------------


def _cell(value) -> object:
    if value is None:
        return ""
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


async def _build_revenue_by_type(db, club_id, payload):
    basis = RevenueBasis(payload.get("basis") or "service")
    start, end = _resolve_range(payload.get("date_from"), payload.get("date_to"))
    result = await RevenueService(db).by_type(club_id, basis, start, end)
    headers = ["revenue_type", "gross_amount", "refund_amount", "net_amount", "transaction_count"]
    rows = [
        [_cell(r.revenue_type), _cell(r.gross_amount), _cell(r.refund_amount), _cell(r.net_amount), _cell(r.transaction_count)]
        for r in result.rows
    ]
    return headers, rows


async def _build_revenue_summary(db, club_id, payload):
    basis = RevenueBasis(payload.get("basis") or "service")
    start, end = _resolve_range(payload.get("date_from"), payload.get("date_to"))
    s = await RevenueService(db).summary(club_id, basis, start, end)
    headers = ["revenue_type", "gross_amount", "refund_amount", "net_amount", "transaction_count"]
    rows = [
        [_cell(r.revenue_type), _cell(r.gross_amount), _cell(r.refund_amount), _cell(r.net_amount), _cell(r.transaction_count)]
        for r in s.by_type
    ]
    # Trailing TOTAL row so the file is self-summarising.
    rows.append(["TOTAL", _cell(s.gross_amount), _cell(s.refund_amount), _cell(s.net_amount), _cell(s.transaction_count)])
    return headers, rows


async def _build_revenue_timeseries(db, club_id, payload):
    basis = RevenueBasis(payload.get("basis") or "service")
    start, end = _resolve_range(payload.get("date_from"), payload.get("date_to"))
    ts = await RevenueService(db).timeseries(club_id, basis, Granularity.day, start, end)
    headers = ["period_start", "gross_amount", "refund_amount", "net_amount", "transaction_count"]
    rows = [
        [_cell(p.period_start), _cell(p.gross_amount), _cell(p.refund_amount), _cell(p.net_amount), _cell(p.transaction_count)]
        for p in ts.points
    ]
    return headers, rows


async def _build_player_value(db, club_id, payload):
    svc = PlayerValueService(db)
    headers = [
        "user_id", "full_name", "email", "is_paid_member", "membership_plan_name",
        "first_played_at", "last_played_at", "bookings_played", "played_last_30d",
        "played_last_90d", "lifetime_gross", "lifetime_refunds", "lifetime_spend",
        "payments_count", "currency",
    ]
    rows: list[list] = []
    offset = 0
    while offset < _MAX_PLAYER_ROWS:
        page = await svc.leaderboard(
            club_id, members_only=False, sort=PlayerSort.lifetime_spend,
            limit=_PLAYER_PAGE, offset=offset,
        )
        for r in page.rows:
            rows.append([
                _cell(r.user_id), _cell(r.full_name), _cell(r.email),
                _cell(r.is_paid_member), _cell(r.membership_plan_name),
                _cell(r.first_played_at), _cell(r.last_played_at),
                _cell(r.bookings_played), _cell(r.played_last_30d),
                _cell(r.played_last_90d), _cell(r.lifetime_gross),
                _cell(r.lifetime_refunds), _cell(r.lifetime_spend),
                _cell(r.payments_count), _cell(r.currency),
            ])
        if len(page.rows) < _PLAYER_PAGE:
            break
        offset += _PLAYER_PAGE
    return headers, rows


REPORT_BUILDERS = {
    "revenue_summary": _build_revenue_summary,
    "revenue_by_type": _build_revenue_by_type,
    "revenue_timeseries": _build_revenue_timeseries,
    "player_value": _build_player_value,
}


# ---------------------------------------------------------------------------
# Serialisation + delivery
# ---------------------------------------------------------------------------


def _to_csv(headers: list[str], rows: list[list]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")


def _to_xlsx(headers: list[str], rows: list[list]) -> bytes:
    from openpyxl import Workbook  # lazy: only needed for the xlsx path

    wb = Workbook(write_only=True)
    ws = wb.create_sheet()
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _email_export(recipient: str | None, report_type: str, signed_url: str) -> None:
    settings = get_settings()
    if not recipient:
        logger.warning("export: no recipient for report_type=%s, skipping email", report_type)
        return
    sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
    message = Mail(
        from_email=settings.SENDGRID_FROM_EMAIL,
        to_emails=recipient,
        subject=f"Your SmashBook export is ready: {report_type}",
        html_content=(
            f"<p>Your <strong>{report_type}</strong> export is ready.</p>"
            f'<p><a href="{signed_url}">Download it here</a>. '
            f"This link expires in 1 hour for security; re-run the export if it lapses.</p>"
        ),
    )
    response = sg.send(message)
    if response.status_code >= 400:
        raise RuntimeError(
            f"sendgrid returned {response.status_code} sending export to {recipient}"
        )
