# ---------------------------------------------------------------------------
# Pub/Sub — topics and push subscriptions
# ---------------------------------------------------------------------------

locals {
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
