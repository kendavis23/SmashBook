# ---------------------------------------------------------------------------
# Cloud Scheduler — periodic court-hold expiry sweep
#
# Calls the platform-admin endpoint POST /api/v1/admin/bookings/release-expired-holds
# on a fixed cadence. The endpoint is gated by the X-Platform-Key header (the
# padel-api service is otherwise public), so the job authenticates by sending
# that header rather than an OIDC token.
#
# NOTE: Cloud Scheduler HTTP targets cannot reference Secret Manager natively,
# so the key value is read here via a data source and stored on the job. It
# therefore lands in Terraform state — acceptable because state lives in the
# private tf-state GCS bucket. The secret VERSION must already exist (values are
# populated out-of-band, same as every other secret in the secrets module).
#
# Requires the Cloud Scheduler API (cloudscheduler.googleapis.com) to be enabled
# on the project — enabled out-of-band, like every other API in this repo.
# ---------------------------------------------------------------------------

data "google_secret_manager_secret_version" "platform_api_key" {
  secret = var.platform_api_key_secret_id
}

resource "google_cloud_scheduler_job" "release_expired_holds" {
  name      = "release-expired-holds"
  project   = var.project_id
  region    = var.region
  schedule  = var.schedule
  time_zone = "Etc/UTC"

  # When paused, the job exists but does not fire — used to disable the sweep in
  # environments (e.g. staging) where it need not run continuously.
  paused = var.paused

  # The sweep is short; give it generous headroom but well under the 30-min cap.
  attempt_deadline = "320s"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "${var.api_url}/api/v1/admin/bookings/release-expired-holds"

    headers = {
      "X-Platform-Key" = data.google_secret_manager_secret_version.platform_api_key.secret_data
      "Content-Type"   = "application/json"
    }
  }
}
