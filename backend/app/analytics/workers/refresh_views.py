"""
Pub/Sub subscriber: materialized-view refresh worker (Sprint 7 / G7).

The first MV-refresh infrastructure in the system. ``snapshot_court_utilisation``
is a *physical snapshot* worker; this one runs ``REFRESH MATERIALIZED VIEW
CONCURRENTLY`` over the views that back report queries (the two revenue-by-club
views, ``mv_player_value``, and the two club player-flow views) and records every
attempt in ``analytics_refresh_log``.

Deployed as a separate Cloud Run service from the same image
(``Dockerfile.worker``), triggered by **Cloud Scheduler → Pub/Sub** (default:
nightly 03:00 UTC, per MATERIALIZED_VIEWS.md). The push payload may request:

    {"event_type": "analytics.refresh_views"}                      # all views
    {"event_type": "analytics.refresh_views",
     "payload": {"views": ["mv_revenue_by_club_day_cash"]}}        # a subset

Each view is refreshed independently: one view failing does not abort the rest.
On failure the worker writes a ``failed`` log row AND publishes to the
``analytics-alerts`` topic.

``REFRESH MATERIALIZED VIEW CONCURRENTLY`` cannot run inside a transaction
block, so the refresh runs on a dedicated AUTOCOMMIT connection. The log write
goes through a normal session on the primary.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from sqlalchemy import text

from app.core.pubsub import publish_analytics_alert
from app.db.models.analytics import AnalyticsRefreshLog, RefreshStatus
from app.db.session import AsyncSessionLocal, engine

logger = logging.getLogger(__name__)

# Registry of refreshable views. Refresh requests are intersected with this list,
# so an arbitrary string from the payload can never reach the SQL string.
#
# Order matters: views are refreshed sequentially in this order, and
# ``mv_player_rfv`` is defined ON TOP OF ``mv_player_value``, so it must come
# after it to score against the freshly-refreshed values.
REFRESH_VIEWS: list[str] = [
    "mv_revenue_by_club_day_service",
    "mv_revenue_by_club_day_cash",
    "mv_player_value",
    "mv_player_rfv",
    "mv_club_active_player_day",
    "mv_club_signups_day",
    "mv_coach_popularity",
]

app = FastAPI()


@app.get("/healthz")
async def health():
    return {"status": "ok"}


@app.post("/pubsub")
async def process_refresh_event(request: Request):
    """Receive a Pub/Sub push delivery for analytics view-refresh events."""
    import base64
    import json

    envelope = await request.json()
    message = envelope.get("message", {})
    data = json.loads(base64.b64decode(message.get("data", "")).decode())

    event_type = data.get("event_type") or "analytics.refresh_views"
    payload = data.get("payload", {}) or {}
    requested = payload.get("views")

    result = await refresh_views(requested=requested, triggered_by=event_type)
    return {"status": "ok", **result}


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


async def refresh_views(
    requested: list[str] | None = None,
    triggered_by: str = "manual",
) -> dict:
    """Refresh the requested views (default: all registered views).

    Unknown view names are ignored — only names in ``REFRESH_VIEWS`` are ever
    executed. Each view is refreshed independently; a failure is logged and
    alerted but does not stop the others.
    """
    if requested:
        targets = [v for v in requested if v in REFRESH_VIEWS]
    else:
        targets = list(REFRESH_VIEWS)

    results = [await _refresh_one(view, triggered_by) for view in targets]
    succeeded = sum(1 for r in results if r["status"] == RefreshStatus.success.value)
    return {
        "views_requested": len(targets),
        "views_succeeded": succeeded,
        "views_failed": len(targets) - succeeded,
        "results": results,
    }


async def _refresh_one(view_name: str, triggered_by: str) -> dict:
    """Refresh a single view, time it, capture the row count, and log the run."""
    started_at = datetime.now(timezone.utc)
    status = RefreshStatus.success
    row_count: int | None = None
    error: str | None = None

    try:
        # CONCURRENTLY must run outside a transaction block -> AUTOCOMMIT.
        async with engine.connect() as raw:
            conn = await raw.execution_options(isolation_level="AUTOCOMMIT")
            await conn.execute(
                text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view_name}")
            )
            row_count = (
                await conn.execute(text(f"SELECT count(*) FROM {view_name}"))
            ).scalar_one()
    except Exception as exc:  # noqa: BLE001 - we record and alert on any failure
        status = RefreshStatus.failed
        error = str(exc)
        logger.exception("refresh of %s failed", view_name)

    completed_at = datetime.now(timezone.utc)
    duration_ms = int((completed_at - started_at).total_seconds() * 1000)

    await _write_log(
        view_name=view_name,
        status=status,
        started_at=started_at,
        completed_at=completed_at,
        duration_ms=duration_ms,
        row_count=row_count,
        error=error,
        triggered_by=triggered_by,
    )

    if status is RefreshStatus.failed:
        try:
            publish_analytics_alert(
                "analytics.refresh_failed",
                {"view_name": view_name, "error": error},
            )
        except Exception:  # noqa: BLE001 - alerting must not mask the original failure
            logger.exception("failed to publish analytics-alerts for %s", view_name)

    return {
        "view_name": view_name,
        "status": status.value,
        "duration_ms": duration_ms,
        "row_count": row_count,
    }


async def _write_log(**kwargs) -> None:
    async with AsyncSessionLocal() as db:
        db.add(AnalyticsRefreshLog(**kwargs))
        await db.commit()
