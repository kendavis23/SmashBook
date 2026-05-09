# ---------------------------------------------------------------------------
# GCS Buckets — staging environment
# ---------------------------------------------------------------------------

resource "google_storage_bucket" "media" {
  name                        = "padel-media-${var.project_id}-staging"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Soft-delete disabled — receipts/media are re-derivable from the DB;
  # no need to pay for 7-day retained deletes.
  soft_delete_policy {
    retention_duration_seconds = 0
  }

  versioning {
    enabled = false
  }

  cors {
    origin          = ["https://*.smashbook.app"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "ETag"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket" "exports" {
  name                        = "padel-exports-${var.project_id}-staging"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  soft_delete_policy {
    retention_duration_seconds = 0
  }

  versioning {
    enabled = false
  }

  # Export objects expire after 7 days; signed URLs are short-lived anyway.
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket" "ai_archive" {
  name                        = "padel-ai-archive-${var.project_id}-staging"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  soft_delete_policy {
    retention_duration_seconds = 0
  }

  versioning {
    enabled = false
  }

  # Archive job (Stage 3) will write objects here for inference logs >90 days.
  # Transition to Coldline after 30 days in the bucket to cut storage cost.
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
}

# ---------------------------------------------------------------------------
# IAM — runtime SA gets objectAdmin on media, exports, and ai-archive.
# Scoped to individual buckets rather than the project to follow least-privilege.
# ---------------------------------------------------------------------------

resource "google_storage_bucket_iam_member" "runtime_media" {
  bucket = google_storage_bucket.media.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.compute.email}"
}

resource "google_storage_bucket_iam_member" "runtime_exports" {
  bucket = google_storage_bucket.exports.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.compute.email}"
}

resource "google_storage_bucket_iam_member" "runtime_ai_archive" {
  bucket = google_storage_bucket.ai_archive.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.compute.email}"
}
