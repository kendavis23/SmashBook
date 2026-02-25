"""
ReportService — analytics, utilisation, and financial reporting.
All queries run against the read replica.

Responsibilities:
  - Court utilisation by time period
  - Player retention and booking frequency
  - Revenue breakdown (by type, by peak/off-peak, by court)
  - Corporate event and tournament summary
  - Transaction log with filters
  - Export to CSV/XLSX uploaded to GCS exports bucket
"""
from sqlalchemy.ext.asyncio import AsyncSession
from google.cloud import storage
from app.core.config import get_settings

settings = get_settings()


class ReportService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_utilisation_report(self, club_id: str, date_from, date_to) -> dict:
        """
        For each court: total available slots vs booked slots in period.
        Groups by hour-of-day to identify peak/underused windows.
        Returns: { courts: [{ court_id, name, total_slots, booked_slots, pct_utilised }],
                   peak_hours: [...], underused_hours: [...] }
        """
        pass

    async def get_retention_report(self, club_id: str) -> dict:
        """
        Returns player booking frequency distribution and cohort retention.
        Segments players by: one-time, occasional (<4/month), regular (>=4/month).
        """
        pass

    async def get_transaction_log(self, club_id: str, date_from=None, date_to=None,
                                   user_id=None, booking_type=None,
                                   payment_method=None, page: int = 1) -> dict:
        """Paginated transaction log for the staff finance view."""
        pass

    async def get_corporate_events_report(self, club_id: str, date_from=None,
                                           date_to=None) -> dict:
        """Revenue and court usage from corporate_event and tournament bookings."""
        pass

    async def export_to_gcs(self, club_id: str, report_type: str,
                              date_from, date_to, format: str = "csv") -> str:
        """
        Runs the relevant report query, serialises to CSV or XLSX,
        uploads to gs://{GCS_BUCKET_EXPORTS}/{club_id}/{report_type}/{timestamp}.{format},
        returns a signed download URL valid for 1 hour.
        """
        pass
