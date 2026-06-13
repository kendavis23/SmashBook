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

# ---------------------------------------------------------------------------
# Cloud Scheduler — daily court-utilisation snapshot (Sprint 7 / G7)
#
# Unlike the expiry sweep, this job uses a Pub/Sub target: it publishes
# {"event_type": "analytics.snapshot_daily"} to the analytics-events topic,
# which the push subscription delivers to padel-analytics-worker. The worker
# snapshots each club's *local* yesterday, so a single fixed UTC fire time is
# sufficient regardless of club timezone.
#
# The one-time 90-day history backfill is NOT scheduled — trigger it on demand
# (`make analytics-backfill-staging`, or the run_court_snapshots.py script).
# ---------------------------------------------------------------------------

data "google_project" "project" {}

# Cloud Scheduler publishes as its own service agent; grant it publisher on the
# analytics-events topic so the daily job can enqueue the snapshot message.
resource "google_pubsub_topic_iam_member" "scheduler_publish_analytics" {
  topic  = var.analytics_events_topic_id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

resource "google_cloud_scheduler_job" "analytics_snapshot_daily" {
  name      = "analytics-snapshot-daily"
  project   = var.project_id
  region    = var.region
  schedule  = var.analytics_snapshot_schedule
  time_zone = "Etc/UTC"

  paused = var.analytics_snapshot_paused

  # The push delivery does the real work; the publish itself is instant.
  attempt_deadline = "320s"

  retry_config {
    retry_count = 1
  }

  pubsub_target {
    topic_name = var.analytics_events_topic_id
    data       = base64encode(jsonencode({ event_type = "analytics.snapshot_daily" }))
  }
}

# ---------------------------------------------------------------------------
# Cloud Scheduler — nightly materialized-view refresh (Sprint 7 / G7)
#
# Publishes {"event_type": "analytics.refresh_views"} to analytics-refresh-events
# (a topic distinct from analytics-events), delivered to
# padel-analytics-refresh-worker, which runs REFRESH MATERIALIZED VIEW
# CONCURRENTLY over the revenue views and logs to analytics_refresh_log. Fires at
# 03:00 UTC — after the 02:00 snapshot job, though the two are independent.
# ---------------------------------------------------------------------------

resource "google_pubsub_topic_iam_member" "scheduler_publish_analytics_refresh" {
  topic  = var.analytics_refresh_events_topic_id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

resource "google_cloud_scheduler_job" "analytics_refresh_daily" {
  name      = "analytics-refresh-daily"
  project   = var.project_id
  region    = var.region
  schedule  = var.analytics_refresh_schedule
  time_zone = "Etc/UTC"

  paused = var.analytics_refresh_paused

  # The push delivery does the real work; the publish itself is instant.
  attempt_deadline = "320s"

  retry_config {
    retry_count = 1
  }

  pubsub_target {
    topic_name = var.analytics_refresh_events_topic_id
    data       = base64encode(jsonencode({ event_type = "analytics.refresh_views" }))
  }
}

# ---------------------------------------------------------------------------
# Cloud Scheduler — daily wallet-debt settlement (Stage 2.6)
#
# Publishes {"event_type": "wallet.settle"} to wallet-settlement-events,
# delivered to padel-settlement-worker, which runs the platform-wide
# PaymentService.settle_wallet_debts() — transferring each club's accumulated
# wallet receivables to its Stripe Connect account. Fires at 02:00 UTC (the
# low-traffic window); settlement is platform-wide and resolved server-side, so
# no X-Tenant-ID / club scope is supplied.
# ---------------------------------------------------------------------------

resource "google_pubsub_topic_iam_member" "scheduler_publish_settlement" {
  topic  = var.settlement_events_topic_id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

resource "google_cloud_scheduler_job" "wallet_settle_debts" {
  name      = "wallet-settle-debts"
  project   = var.project_id
  region    = var.region
  schedule  = var.settlement_schedule
  time_zone = "Etc/UTC"

  paused = var.settlement_paused

  # The push delivery does the real work; the publish itself is instant.
  attempt_deadline = "320s"

  retry_config {
    retry_count = 1
  }

  pubsub_target {
    topic_name = var.settlement_events_topic_id
    data       = base64encode(jsonencode({ event_type = "wallet.settle" }))
  }
}
