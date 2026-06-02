# ---------------------------------------------------------------------------
# Cloud Run Services
# ---------------------------------------------------------------------------

locals {
  resource_limits = {
    cpu    = "1000m"
    memory = "512Mi"
  }

  startup_probe = {
    failure_threshold = 1
    period_seconds    = 240
    timeout_seconds   = 240
  }
}

# ---------------------------------------------------------------------------
# padel-api — main FastAPI backend
# ---------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "api" {
  name     = "padel-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.compute_sa_email

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      max_instance_count = var.max_instance_count
    }

    annotations = {
      "run.googleapis.com/startup-cpu-boost" = "true"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.cloud_sql_connection, var.cloud_sql_replica_connection]
      }
    }

    containers {
      image = "${var.api_image}:${var.image_tag}"

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits            = local.resource_limits
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        failure_threshold = local.startup_probe.failure_threshold
        period_seconds    = local.startup_probe.period_seconds
        timeout_seconds   = local.startup_probe.timeout_seconds
        tcp_socket {
          port = 8080
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-database-url"]
            version = "latest"
          }
        }
      }

      env {
        name = "DATABASE_READ_REPLICA_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-database-read-replica-url"]
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-secret-key"]
            version = "latest"
          }
        }
      }

      env {
        name = "STRIPE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["stripe-secret-key"]
            version = "latest"
          }
        }
      }

      env {
        name = "STRIPE_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["stripe-webhook-secret"]
            version = "latest"
          }
        }
      }

      env {
        name = "STRIPE_CONNECT_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["stripe-connect-webhook-secret"]
            version = "latest"
          }
        }
      }

      env {
        name = "STRIPE_BILLING_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["stripe-billing-secret-key"]
            version = "latest"
          }
        }
      }

      env {
        name = "STRIPE_BILLING_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["stripe-billing-webhook-secret"]
            version = "latest"
          }
        }
      }

      env {
        name = "SENDGRID_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["sendgrid-api-key"]
            version = "latest"
          }
        }
      }

      env {
        name = "PLATFORM_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-platform-api-key"]
            version = "latest"
          }
        }
      }

      env {
        name  = "PUBSUB_PROJECT_ID"
        value = var.project_id
      }
    }

    max_instance_request_concurrency = 80
    timeout                          = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].annotations,
      client,
      client_version,
    ]
  }
}

resource "google_cloud_run_v2_service_iam_member" "api_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ---------------------------------------------------------------------------
# padel-booking-worker
# ---------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "booking_worker" {
  name     = "padel-booking-worker"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.compute_sa_email

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      max_instance_count = var.max_instance_count
    }

    annotations = {
      "run.googleapis.com/startup-cpu-boost" = "true"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.cloud_sql_connection]
      }
    }

    containers {
      image   = "${var.worker_image}:${var.image_tag}"
      command = ["uvicorn"]
      args    = ["app.workers.booking_worker:app", "--host", "0.0.0.0", "--port", "8080"]

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits            = local.resource_limits
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        failure_threshold = local.startup_probe.failure_threshold
        period_seconds    = local.startup_probe.period_seconds
        timeout_seconds   = local.startup_probe.timeout_seconds
        tcp_socket {
          port = 8080
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-database-url"]
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-secret-key"]
            version = "latest"
          }
        }
      }

      env {
        name  = "PUBSUB_PROJECT_ID"
        value = var.project_id
      }
    }

    max_instance_request_concurrency = 80
    timeout                          = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].annotations,
      client,
      client_version,
    ]
  }
}

# ---------------------------------------------------------------------------
# padel-payment-worker
# ---------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "payment_worker" {
  name     = "padel-payment-worker"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.compute_sa_email

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      max_instance_count = var.max_instance_count
    }

    annotations = {
      "run.googleapis.com/startup-cpu-boost" = "true"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.cloud_sql_connection]
      }
    }

    containers {
      image   = "${var.worker_image}:${var.image_tag}"
      command = ["uvicorn"]
      args    = ["app.workers.payment_worker:app", "--host", "0.0.0.0", "--port", "8080"]

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits            = local.resource_limits
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        failure_threshold = local.startup_probe.failure_threshold
        period_seconds    = local.startup_probe.period_seconds
        timeout_seconds   = local.startup_probe.timeout_seconds
        tcp_socket {
          port = 8080
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-database-url"]
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-secret-key"]
            version = "latest"
          }
        }
      }

      env {
        name  = "PUBSUB_PROJECT_ID"
        value = var.project_id
      }
    }

    max_instance_request_concurrency = 80
    timeout                          = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].annotations,
      client,
      client_version,
    ]
  }
}

# ---------------------------------------------------------------------------
# padel-notification-worker
# ---------------------------------------------------------------------------


resource "google_cloud_run_v2_service" "notification_worker" {
  name     = "padel-notification-worker"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.compute_sa_email

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      max_instance_count = var.max_instance_count
    }

    annotations = {
      "run.googleapis.com/startup-cpu-boost" = "true"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.cloud_sql_connection]
      }
    }

    containers {
      image   = "${var.worker_image}:${var.image_tag}"
      command = ["uvicorn"]
      args    = ["app.workers.notification_worker:app", "--host", "0.0.0.0", "--port", "8080"]

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits            = local.resource_limits
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        failure_threshold = local.startup_probe.failure_threshold
        period_seconds    = local.startup_probe.period_seconds
        timeout_seconds   = local.startup_probe.timeout_seconds
        tcp_socket {
          port = 8080
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-database-url"]
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-secret-key"]
            version = "latest"
          }
        }
      }

      env {
        name = "SENDGRID_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["sendgrid-api-key"]
            version = "latest"
          }
        }
      }

      env {
        name  = "SENDGRID_FROM_EMAIL"
        value = var.sendgrid_from_email
      }

      env {
        name  = "APP_BASE_URL"
        value = var.app_base_url
      }

      env {
        name  = "PUBSUB_PROJECT_ID"
        value = var.project_id
      }
    }

    max_instance_request_concurrency = 80
    timeout                          = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].annotations,
      client,
      client_version,
    ]
  }
}

# ---------------------------------------------------------------------------
# padel-analytics-worker  (Sprint 7 / G7 — court-utilisation snapshots)
#
# Triggered by Cloud Scheduler → Pub/Sub (analytics-events) → push to /pubsub.
# Unlike the other workers it mounts the **read replica** as well: it runs heavy
# aggregation reads off DATABASE_READ_REPLICA_URL and only writes the compact
# snapshot rows to the primary.
# ---------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "analytics_worker" {
  name     = "padel-analytics-worker"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.compute_sa_email

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      max_instance_count = var.max_instance_count
    }

    annotations = {
      "run.googleapis.com/startup-cpu-boost" = "true"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.cloud_sql_connection, var.cloud_sql_replica_connection]
      }
    }

    containers {
      image   = "${var.worker_image}:${var.image_tag}"
      command = ["uvicorn"]
      args    = ["app.analytics.workers.snapshot_court_utilisation:app", "--host", "0.0.0.0", "--port", "8080"]

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits            = local.resource_limits
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        failure_threshold = local.startup_probe.failure_threshold
        period_seconds    = local.startup_probe.period_seconds
        timeout_seconds   = local.startup_probe.timeout_seconds
        tcp_socket {
          port = 8080
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-database-url"]
            version = "latest"
          }
        }
      }

      env {
        name = "DATABASE_READ_REPLICA_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-database-read-replica-url"]
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-secret-key"]
            version = "latest"
          }
        }
      }

      env {
        name  = "PUBSUB_PROJECT_ID"
        value = var.project_id
      }
    }

    max_instance_request_concurrency = 80
    timeout                          = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].annotations,
      client,
      client_version,
    ]
  }
}

# ---------------------------------------------------------------------------
# padel-analytics-refresh-worker  (Sprint 7 / G7 — materialized-view refresh)
#
# The first MV-refresh worker. Triggered by Cloud Scheduler → Pub/Sub
# (analytics-refresh-events — a topic SEPARATE from analytics-events, because the
# snapshot worker treats any unknown event_type as snapshot_daily) → push to
# /pubsub. Runs REFRESH MATERIALIZED VIEW CONCURRENTLY on the **primary** (a
# write op) and logs each run to analytics_refresh_log; it does NOT read the
# replica, so unlike the snapshot worker it mounts the primary only.
# ---------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "analytics_refresh_worker" {
  name     = "padel-analytics-refresh-worker"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.compute_sa_email

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      max_instance_count = var.max_instance_count
    }

    annotations = {
      "run.googleapis.com/startup-cpu-boost" = "true"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.cloud_sql_connection]
      }
    }

    containers {
      image   = "${var.worker_image}:${var.image_tag}"
      command = ["uvicorn"]
      args    = ["app.analytics.workers.refresh_views:app", "--host", "0.0.0.0", "--port", "8080"]

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits            = local.resource_limits
        cpu_idle          = true
        startup_cpu_boost = true
      }

      startup_probe {
        failure_threshold = local.startup_probe.failure_threshold
        period_seconds    = local.startup_probe.period_seconds
        timeout_seconds   = local.startup_probe.timeout_seconds
        tcp_socket {
          port = 8080
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-database-url"]
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_ids["padel-secret-key"]
            version = "latest"
          }
        }
      }

      env {
        name  = "PUBSUB_PROJECT_ID"
        value = var.project_id
      }
    }

    max_instance_request_concurrency = 80
    timeout                          = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].annotations,
      client,
      client_version,
    ]
  }
}
