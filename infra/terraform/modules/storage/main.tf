variable "project_id" { type = string }
variable "region" { type = string }

resource "google_storage_bucket" "videos" {
  name          = "${var.project_id}-match-videos"
  location      = var.region
  force_destroy = false

  lifecycle_rule {
    condition { age = 365 }
    action { type = "SetStorageClass" ; storage_class = "NEARLINE" }
  }

  cors {
    origin          = ["*"]
    method          = ["PUT"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket" "invoices" {
  name          = "${var.project_id}-invoices"
  location      = var.region
  force_destroy = false

  lifecycle_rule {
    condition { age = 2555 }  # 7 years
    action { type = "Delete" }
  }
}

resource "google_storage_bucket" "exports" {
  name          = "${var.project_id}-report-exports"
  location      = var.region
  lifecycle_rule {
    condition { age = 7 }
    action { type = "Delete" }
  }
}

output "bucket_names" {
  value = {
    videos   = google_storage_bucket.videos.name
    invoices = google_storage_bucket.invoices.name
    exports  = google_storage_bucket.exports.name
  }
}
