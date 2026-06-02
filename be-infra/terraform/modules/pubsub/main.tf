# ---------------------------------------------------------------------------
# Pub/Sub — topics and push subscriptions
# ---------------------------------------------------------------------------

locals {
  pubsub_topics = [
    "booking-events",
    "payment-events",
    "notification-events",
    "analytics-events",
    # G7 — materialized-view refresh trigger (separate from analytics-events so
    # the snapshot worker never receives refresh messages).
    "analytics-refresh-events",
    # G7 — sink for MV-refresh failure alerts published by refresh_views.py.
    # No subscription yet (alerting consumer is a future gap).
    "analytics-alerts",
  ]
}

data "google_project" "project" {}

resource "google_pubsub_topic" "topics" {
  for_each = toset(local.pubsub_topics)
  name     = each.key
}

# ---------------------------------------------------------------------------
# Dead-letter topics
# ---------------------------------------------------------------------------

resource "google_pubsub_topic" "booking_events_dlq" {
  name = "booking-events-dlq"
}

resource "google_pubsub_topic" "payment_events_dlq" {
  name = "payment-events-dlq"
}

resource "google_pubsub_topic" "notification_events_dlq" {
  name = "notification-events-dlq"
}

resource "google_pubsub_topic" "analytics_events_dlq" {
  name = "analytics-events-dlq"
}

resource "google_pubsub_topic" "analytics_refresh_events_dlq" {
  name = "analytics-refresh-events-dlq"
}

# ---------------------------------------------------------------------------
# Push subscriptions
# ---------------------------------------------------------------------------

resource "google_pubsub_subscription" "booking_events" {
  name  = "booking-events-sub"
  topic = google_pubsub_topic.topics["booking-events"].name

  push_config {
    push_endpoint = "${var.booking_worker_uri}/pubsub"

    oidc_token {
      service_account_email = var.compute_sa_email
    }
  }

  ack_deadline_seconds       = 300
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.booking_events_dlq.id
    max_delivery_attempts = 5
  }
}

resource "google_pubsub_subscription" "payment_events" {
  name  = "payment-events-sub"
  topic = google_pubsub_topic.topics["payment-events"].name

  push_config {
    push_endpoint = "${var.payment_worker_uri}/pubsub"

    oidc_token {
      service_account_email = var.compute_sa_email
    }
  }

  ack_deadline_seconds       = 300
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.payment_events_dlq.id
    max_delivery_attempts = 5
  }
}

resource "google_pubsub_subscription" "notification_events" {
  name  = "notification-events-sub"
  topic = google_pubsub_topic.topics["notification-events"].name

  push_config {
    push_endpoint = "${var.notification_worker_uri}/pubsub"

    oidc_token {
      service_account_email = var.compute_sa_email
    }
  }

  ack_deadline_seconds       = 300
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.notification_events_dlq.id
    max_delivery_attempts = 5
  }
}

resource "google_pubsub_subscription" "analytics_events" {
  name  = "analytics-events-sub"
  topic = google_pubsub_topic.topics["analytics-events"].name

  push_config {
    push_endpoint = "${var.analytics_worker_uri}/pubsub"

    oidc_token {
      service_account_email = var.compute_sa_email
    }
  }

  # The backfill run sweeps 90 days across every club/court — give it the full
  # ack window and a single delivery attempt before DLQ (re-runs are idempotent,
  # so a retry storm is undesirable).
  ack_deadline_seconds       = 600
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  retry_policy {
    minimum_backoff = "30s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.analytics_events_dlq.id
    max_delivery_attempts = 5
  }
}

resource "google_pubsub_subscription" "analytics_refresh_events" {
  name  = "analytics-refresh-events-sub"
  topic = google_pubsub_topic.topics["analytics-refresh-events"].name

  push_config {
    push_endpoint = "${var.analytics_refresh_worker_uri}/pubsub"

    oidc_token {
      service_account_email = var.compute_sa_email
    }
  }

  # REFRESH ... CONCURRENTLY over the revenue views; idempotent, so a retry is
  # harmless. Generous ack window in case the views grow large.
  ack_deadline_seconds       = 600
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  retry_policy {
    minimum_backoff = "30s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.analytics_refresh_events_dlq.id
    max_delivery_attempts = 5
  }
}

# ---------------------------------------------------------------------------
# Grant Pub/Sub service agent publisher rights on each DLQ topic
# (required for Pub/Sub to forward poison messages to the DLQ)
# ---------------------------------------------------------------------------

locals {
  pubsub_sa = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_pubsub_topic_iam_member" "dlq_publisher_booking" {
  topic  = google_pubsub_topic.booking_events_dlq.name
  role   = "roles/pubsub.publisher"
  member = local.pubsub_sa
}

resource "google_pubsub_topic_iam_member" "dlq_publisher_payment" {
  topic  = google_pubsub_topic.payment_events_dlq.name
  role   = "roles/pubsub.publisher"
  member = local.pubsub_sa
}

resource "google_pubsub_topic_iam_member" "dlq_publisher_notification" {
  topic  = google_pubsub_topic.notification_events_dlq.name
  role   = "roles/pubsub.publisher"
  member = local.pubsub_sa
}

resource "google_pubsub_topic_iam_member" "dlq_publisher_analytics" {
  topic  = google_pubsub_topic.analytics_events_dlq.name
  role   = "roles/pubsub.publisher"
  member = local.pubsub_sa
}

resource "google_pubsub_topic_iam_member" "dlq_publisher_analytics_refresh" {
  topic  = google_pubsub_topic.analytics_refresh_events_dlq.name
  role   = "roles/pubsub.publisher"
  member = local.pubsub_sa
}

# ---------------------------------------------------------------------------
# Grant Pub/Sub permission to invoke workers via push
# ---------------------------------------------------------------------------

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoke_booking" {
  project  = var.project_id
  location = var.region
  name     = "padel-booking-worker"
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.compute_sa_email}"
}

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoke_payment" {
  project  = var.project_id
  location = var.region
  name     = "padel-payment-worker"
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.compute_sa_email}"
}

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoke_notification" {
  project  = var.project_id
  location = var.region
  name     = "padel-notification-worker"
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.compute_sa_email}"
}

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoke_analytics" {
  project  = var.project_id
  location = var.region
  name     = "padel-analytics-worker"
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.compute_sa_email}"
}

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoke_analytics_refresh" {
  project  = var.project_id
  location = var.region
  name     = "padel-analytics-refresh-worker"
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.compute_sa_email}"
}

# ---------------------------------------------------------------------------
# Topic ids exported so the scheduler module can target them (Cloud Scheduler →
# Pub/Sub publishes the daily analytics.snapshot_daily / analytics.refresh_views
# messages to these topics).
# ---------------------------------------------------------------------------

output "analytics_events_topic_id" {
  value = google_pubsub_topic.topics["analytics-events"].id
}

output "analytics_refresh_events_topic_id" {
  value = google_pubsub_topic.topics["analytics-refresh-events"].id
}
