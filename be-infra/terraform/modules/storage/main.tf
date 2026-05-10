# ---------------------------------------------------------------------------
# GCS Buckets
# ---------------------------------------------------------------------------

resource "google_storage_bucket" "media" {
  name                        = "padel-media-${var.project_id}-${var.environment}"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

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
  name                        = "padel-exports-${var.project_id}-${var.environment}"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  soft_delete_policy {
    retention_duration_seconds = 0
  }

  versioning {
    enabled = false
  }

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
  name                        = "padel-ai-archive-${var.project_id}-${var.environment}"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  soft_delete_policy {
    retention_duration_seconds = 0
  }

  versioning {
    enabled = false
  }

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
# IAM — runtime SA gets objectAdmin on all three buckets
# ---------------------------------------------------------------------------

resource "google_storage_bucket_iam_member" "runtime_media" {
  bucket = google_storage_bucket.media.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.compute_sa_email}"
}

resource "google_storage_bucket_iam_member" "runtime_exports" {
  bucket = google_storage_bucket.exports.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.compute_sa_email}"
}

resource "google_storage_bucket_iam_member" "runtime_ai_archive" {
  bucket = google_storage_bucket.ai_archive.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.compute_sa_email}"
}
