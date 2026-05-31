from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.db.session import get_read_db
from app.api.v1.dependencies.auth import require_staff

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/dashboard")
async def financial_dashboard(current_user=Depends(require_staff), db=Depends(get_read_db)):
    """Real-time dashboard: daily revenue, outstanding payments, pending refunds."""
    pass


@router.get("/revenue")
async def revenue_breakdown(
    club_id: str = Query(...),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(require_staff), db=Depends(get_read_db)
):
    """Revenue breakdown by booking type, court, peak/off-peak."""
    pass


@router.get("/utilisation", deprecated=True)
async def utilisation_report(
    club_id: str = Query(...),
    current_user=Depends(require_staff), db=Depends(get_read_db)
):
    """DEPRECATED — superseded by the analytics domain (G7).

    Court utilisation now lives under ``/api/v1/analytics/utilisation/...``,
    backed by ``court_utilisation_snapshots`` rather than a live scan of
    ``bookings``:
      - ``GET /analytics/utilisation/clubs/{club_id}/daily``
      - ``GET /analytics/utilisation/clubs/{club_id}/courts``
      - ``GET /analytics/utilisation/clubs/{club_id}/heatmap``
    This stub is left in place only so existing links don't 404; do not implement it.
    """
    pass


@router.get("/retention")
async def retention_report(current_user=Depends(require_staff), db=Depends(get_read_db)):
    """Player retention and booking frequency data."""
    pass


@router.get("/corporate-events")
async def corporate_events_report(current_user=Depends(require_staff), db=Depends(get_read_db)):
    """Revenue and court usage from corporate events and tournaments."""
    pass


@router.get("/transactions")
async def transaction_log(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    player_id: Optional[str] = None,
    booking_type: Optional[str] = None,
    payment_method: Optional[str] = None,
    current_user=Depends(require_staff), db=Depends(get_read_db)
):
    """Full transaction log with filters."""
    pass


@router.get("/stripe-payouts")
async def stripe_payouts(current_user=Depends(require_staff)):
    """Stripe payout records for bank reconciliation."""
    pass


@router.get("/export")
async def export_report(
    report_type: str = Query(...),
    format: str = Query("csv"),  # csv | xlsx
    current_user=Depends(require_staff), db=Depends(get_read_db)
):
    """Export booking and payment data as CSV or XLSX. Returns signed GCS download URL."""
    pass
