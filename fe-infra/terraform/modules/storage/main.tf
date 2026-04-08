# ─── GCS Bucket ───────────────────────────────────────────────────────────────
resource "google_storage_bucket" "frontend" {
  name                        = var.bucket_name
  project                     = var.project_id
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  force_destroy               = var.environment != "prod"

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"  # SPA fallback
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Cache-Control"]
    max_age_seconds = 3600
  }

  versioning {
    enabled = false
  }

  labels = {
    environment = var.environment
    managed-by  = "terraform"
  }
}

# ─── Public Read IAM ──────────────────────────────────────────────────────────
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
