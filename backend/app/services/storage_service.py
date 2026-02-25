"""
StorageService — Cloud Storage operations.

Handles signed URL generation for:
  - Match video uploads (player-initiated)
  - Invoice PDF downloads (player-initiated)
  - Report exports (staff-initiated)
"""
from datetime import timedelta
from google.cloud import storage
from app.core.config import get_settings

settings = get_settings()
gcs_client = storage.Client(project=settings.GCS_PROJECT_ID)


class StorageService:

    @staticmethod
    def generate_video_upload_url(tenant_id: str, booking_id: str,
                                   filename: str, content_type: str = "video/mp4") -> dict:
        """
        Returns a signed PUT URL for a match video upload.
        Object path: {tenant_id}/{booking_id}/{filename}
        URL expires in 15 minutes.
        After upload, caller should PATCH booking with video_upload_path.
        """
        bucket = gcs_client.bucket(settings.GCS_BUCKET_VIDEOS)
        blob = bucket.blob(f"{tenant_id}/{booking_id}/{filename}")
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=15),
            method="PUT",
            content_type=content_type,
        )
        return {
            "upload_url": url,
            "gcs_path": f"gs://{settings.GCS_BUCKET_VIDEOS}/{tenant_id}/{booking_id}/{filename}",
        }

    @staticmethod
    def generate_invoice_download_url(gcs_path: str) -> str:
        """
        Returns a signed GET URL for an invoice PDF.
        URL expires in 1 hour.
        gcs_path is stored in Invoice.pdf_storage_path.
        """
        bucket_name, object_path = gcs_path.replace("gs://", "").split("/", 1)
        bucket = gcs_client.bucket(bucket_name)
        blob = bucket.blob(object_path)
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(hours=1),
            method="GET",
        )

    @staticmethod
    def upload_invoice_pdf(pdf_bytes: bytes, tenant_id: str,
                            invoice_id: str) -> str:
        """
        Uploads a generated invoice PDF to the invoices bucket.
        Returns the GCS path to store in Invoice.pdf_storage_path.
        """
        bucket = gcs_client.bucket(settings.GCS_BUCKET_INVOICES)
        object_path = f"{tenant_id}/invoices/{invoice_id}.pdf"
        blob = bucket.blob(object_path)
        blob.upload_from_string(pdf_bytes, content_type="application/pdf")
        return f"gs://{settings.GCS_BUCKET_INVOICES}/{object_path}"

    @staticmethod
    def upload_report_export(file_bytes: bytes, club_id: str,
                              report_type: str, filename: str) -> str:
        """
        Uploads a report CSV/XLSX to the exports bucket.
        Returns signed download URL valid for 1 hour.
        Auto-deleted by GCS lifecycle rule after 7 days.
        """
        bucket = gcs_client.bucket(settings.GCS_BUCKET_EXPORTS)
        object_path = f"{club_id}/{report_type}/{filename}"
        blob = bucket.blob(object_path)
        content_type = "text/csv" if filename.endswith(".csv") else \
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        blob.upload_from_string(file_bytes, content_type=content_type)
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(hours=1),
            method="GET",
        )
