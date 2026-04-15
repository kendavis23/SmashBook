# ---------------------------------------------------------------------------
# Pub/Sub — MVP topics and push subscriptions
# ---------------------------------------------------------------------------

locals {
  # MVP topics only — AI phase topics added in later sprints
  pubsub_topics = [
    "booking-events",
    "payment-events",
    "notification-events",
  ]
}

resource "google_pubsub_topic" "topics" {
  for_each = toset(local.pubsub_topics)
  name     = each.key
}

# ---------------------------------------------------------------------------
# Push subscriptions — each worker receives its topic via HTTP push
# ---------------------------------------------------------------------------

resource "google_pubsub_subscription" "booking_events" {
  name  = "booking-events-sub"
  topic = google_pubsub_topic.topics["booking-events"].name

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.booking_worker.uri}/pubsub"

    oidc_token {
      service_account_email = google_service_account.compute.email
    }
  }

  ack_deadline_seconds       = 300
  message_retention_duration = "604800s" # 7 days
  retain_acked_messages      = false

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  depends_on = [google_cloud_run_v2_service.booking_worker]
}

resource "google_pubsub_subscription" "payment_events" {
  name  = "payment-events-sub"
  topic = google_pubsub_topic.topics["payment-events"].name

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.payment_worker.uri}/pubsub"

    oidc_token {
      service_account_email = google_service_account.compute.email
    }
  }

  ack_deadline_seconds       = 300
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  depends_on = [google_cloud_run_v2_service.payment_worker]
}

resource "google_pubsub_subscription" "notification_events" {
  name  = "notification-events-sub"
  topic = google_pubsub_topic.topics["notification-events"].name

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.notification_worker.uri}/pubsub"

    oidc_token {
      service_account_email = google_service_account.compute.email
    }
  }

  ack_deadline_seconds       = 300
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  depends_on = [google_cloud_run_v2_service.notification_worker]
}

# Grant Pub/Sub permission to invoke the workers via push
resource "google_cloud_run_v2_service_iam_member" "pubsub_invoke_booking" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.booking_worker.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.compute.email}"
}

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoke_payment" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.payment_worker.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.compute.email}"
}

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoke_notification" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.notification_worker.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.compute.email}"
}
