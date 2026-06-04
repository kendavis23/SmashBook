"""Async report-export endpoint (Sprint 7 / G7).

``POST /api/v1/analytics/exports`` — the async successor to the old synchronous
``GET /reports/export`` stub. Per analytics/CLAUDE.md rule 5, large exports must
not stream through the request path: this endpoint validates the request (role,
tenant isolation, known report type), publishes ``analytics.export_requested`` to
the ``analytics-events`` topic, and returns ``202 Accepted``. The
``app/analytics/workers/export_report.py`` worker builds the file, writes it to
GCS, and emails a signed download URL.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas.export import ExportAccepted, ExportRequest
from app.api.v1.dependencies.auth import require_staff
from app.api.v1.dependencies.tenant import get_tenant
from app.core.pubsub import publish_analytics_export
from app.db.models.club import Club
from app.db.models.tenant import Tenant
from app.db.session import get_read_db

router = APIRouter(prefix="/exports", tags=["analytics-exports"])


@router.post("", response_model=ExportAccepted, status_code=status.HTTP_202_ACCEPTED)
async def request_export(
    body: ExportRequest,
    current_user=Depends(require_staff),
    tenant: Tenant = Depends(get_tenant),
    db: AsyncSession = Depends(get_read_db),
):
    """Queue an async report export. The download link is emailed to the caller.

    The club is validated against the caller's tenant here (cheap, on the request
    path) so a bad request fails fast with ``404`` rather than silently in the
    worker.
    """
    club = (
        await db.execute(
            select(Club).where(Club.id == body.club_id, Club.tenant_id == tenant.id)
        )
    ).scalar_one_or_none()
    if club is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Club not found"
        )

    if not current_user.email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A verified email is required to receive the export link",
        )

    publish_analytics_export(
        "analytics.export_requested",
        {
            "tenant_id": str(tenant.id),
            "club_id": str(body.club_id),
            "report_type": body.report_type.value,
            "format": body.format.value,
            "basis": body.basis.value,
            "date_from": body.date_from.isoformat() if body.date_from else None,
            "date_to": body.date_to.isoformat() if body.date_to else None,
            "requested_by_user_id": str(current_user.id),
            "recipient_email": current_user.email,
        },
    )

    return ExportAccepted(
        report_type=body.report_type,
        format=body.format,
        detail=f"Export queued; a download link will be emailed to {current_user.email}.",
    )
