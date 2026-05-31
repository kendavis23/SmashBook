"""
Pub/Sub subscriber: court-utilisation snapshot worker (Sprint 7 / G7).

Populates ``court_utilisation_snapshots`` — the one analytics table that must be
a physical snapshot, because ``total_slots`` / ``revenue_potential`` depend on
operating-hours and pricing config *as they were at snapshot time* and can't be
reconstructed if a club later changes hours or prices.

Deployed as a separate Cloud Run service from the same image (``Dockerfile.worker``),
triggered by **Cloud Scheduler → Pub/Sub** (default: daily, after midnight in the
club's timezone). The push payload may request:

    {"event_type": "analytics.snapshot_daily"}                 # each club's yesterday
    {"event_type": "analytics.snapshot_daily",
     "payload": {"snapshot_date": "2026-05-30"}}               # an explicit UTC date
    {"event_type": "analytics.snapshot_backfill",
     "payload": {"days": 90}}                                  # trailing-N-day backfill

Reads come from the **read replica**; writes go to the **primary**. Each
(court, date) is written with a delete-then-insert so re-runs are idempotent —
important because the daily-rollup row has ``hour_of_day = NULL`` and a
``UNIQUE(court_id, snapshot_date, hour_of_day)`` constraint treats NULLs as
distinct, so plain upsert would duplicate the rollup row.
"""
from __future__ import annotations

import base64
import json
from datetime import date as DateType, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Request
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.services.court_utilisation_service import CourtUtilisationService
from app.db.models.analytics import CourtUtilisationSnapshot
from app.db.models.club import Club
from app.db.session import AsyncReadSessionLocal, AsyncSessionLocal

DEFAULT_BACKFILL_DAYS = 90

app = FastAPI()


@app.get("/healthz")
async def health():
    return {"status": "ok"}


@app.post("/pubsub")
async def process_snapshot_event(request: Request):
    """Receive a Pub/Sub push delivery for analytics snapshot events."""
    envelope = await request.json()
    message = envelope.get("message", {})
    data = json.loads(base64.b64decode(message.get("data", "")).decode())

    event_type = data.get("event_type")
    payload = data.get("payload", {}) or {}

    if event_type == "analytics.snapshot_backfill":
        days = int(payload.get("days", DEFAULT_BACKFILL_DAYS))
        result = await backfill(days=days)
    else:  # analytics.snapshot_daily (default)
        explicit = payload.get("snapshot_date")
        snapshot_date = DateType.fromisoformat(explicit) if explicit else None
        result = await run_daily(snapshot_date=snapshot_date)

    return {"status": "ok", **result}


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


async def run_daily(snapshot_date: DateType | None = None) -> dict:
    """Snapshot one day for every club.

    With no ``snapshot_date``, each club gets *its own* local yesterday — clubs
    in different timezones roll over at different UTC instants. With an explicit
    date, that calendar date is used for every club.
    """
    written = 0
    async with AsyncReadSessionLocal() as read_db, AsyncSessionLocal() as write_db:
        for club in await _all_clubs(read_db):
            target = snapshot_date or _yesterday_local(club.timezone)
            written += await snapshot_club_day(read_db, write_db, club, target)
        await write_db.commit()
    return {"clubs_processed": "all", "rows_written": written}


async def backfill(days: int = DEFAULT_BACKFILL_DAYS) -> dict:
    """Snapshot the trailing ``days`` days (excluding today) for every club.

    Pre-snapshot history is approximate: operating-hours / pricing config may
    have drifted since, and only the *current* config is available to read.
    """
    written = 0
    async with AsyncReadSessionLocal() as read_db, AsyncSessionLocal() as write_db:
        for club in await _all_clubs(read_db):
            end = _yesterday_local(club.timezone)
            for offset in range(days):
                target = end - timedelta(days=offset)
                written += await snapshot_club_day(read_db, write_db, club, target)
            await write_db.commit()  # commit per club to bound transaction size
    return {"backfill_days": days, "rows_written": written}


async def snapshot_club_day(
    read_db: AsyncSession,
    write_db: AsyncSession,
    club: Club,
    snapshot_date: DateType,
) -> int:
    """Compute + persist snapshots for every active court of one club on one day.

    Returns the number of rows written. Does not commit — callers control the
    transaction boundary.
    """
    service = CourtUtilisationService(read_db)
    written = 0
    for court in await service.active_courts(club.id):
        rows = await service.gather_court_day(
            club=club, court_id=court.id, snapshot_date=snapshot_date
        )
        # Idempotent: clear any prior rows for this court/date before inserting.
        await write_db.execute(
            delete(CourtUtilisationSnapshot).where(
                CourtUtilisationSnapshot.court_id == court.id,
                CourtUtilisationSnapshot.snapshot_date == snapshot_date,
            )
        )
        for row in rows:
            write_db.add(
                CourtUtilisationSnapshot(
                    club_id=club.id,
                    court_id=court.id,
                    snapshot_date=row.snapshot_date,
                    hour_of_day=row.hour_of_day,
                    day_of_week=row.day_of_week,
                    total_slots=row.total_slots,
                    booked_slots=row.booked_slots,
                    utilisation_pct=row.utilisation_pct,
                    revenue_actual=row.revenue_actual,
                    revenue_potential=row.revenue_potential,
                    avg_booking_lead_time_h=row.avg_booking_lead_time_h,
                )
            )
            written += 1
    return written


def _yesterday_local(tz_name: str) -> DateType:
    now_local = datetime.now(ZoneInfo(tz_name))
    return (now_local - timedelta(days=1)).date()


async def _all_clubs(read_db: AsyncSession) -> list[Club]:
    return list((await read_db.execute(select(Club))).scalars().all())
