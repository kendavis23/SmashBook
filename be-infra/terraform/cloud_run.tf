# ---------------------------------------------------------------------------
# Cloud Run Services
# ---------------------------------------------------------------------------

locals {
  cloud_sql_connection = "${var.project_id}:${var.region}:smashbook-staging"

  # Common container resource limits
  resource_limits = {
    cpu    = "1000m"
    memory = "512Mi"
  }

  # Common startup probe — matches existing configuration
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
    service_account = google_service_account.compute.email

    scaling {
      max_instance_count = 20
    }

    annotations = {
      "run.googleapis.com/startup-cpu-boost" = "true"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [local.cloud_sql_connection]
      }
    }

    containers {
      image = "${var.api_image}:${var.image_tag}"

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits             = local.resource_limits
        cpu_idle           = true
        startup_cpu_boost  = true
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

      # Secrets from Secret Manager
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["padel-database-url"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "DATABASE_READ_REPLICA_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["padel-database-read-replica-url"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["padel-secret-key"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "STRIPE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["stripe-secret-key"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "STRIPE_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["stripe-webhook-secret"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SENDGRID_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["sendgrid-api-key"].secret_id
            version = "latest"
          }
        }
      }
    }

    max_instance_request_concurrency = 80
    timeout               = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    # Image tag is managed by CI/CD — don't let terraform plan show drift on every deploy
    ignore_changes = [
      template[0].containers[0].image,
      template[0].annotations,
      client,
      client_version,
    ]
  }
}

# Public access — API is open (auth handled by JWT middleware)
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
    service_account = google_service_account.compute.email

    scaling {
      max_instance_count = 20
    }

    annotations = {
      "run.googleapis.com/startup-cpu-boost" = "true"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [local.cloud_sql_connection]
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
        limits             = local.resource_limits
        cpu_idle           = true
        startup_cpu_boost  = true
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
            secret  = google_secret_manager_secret.secrets["padel-database-url"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["padel-secret-key"].secret_id
            version = "latest"
          }
        }
      }
    }

    max_instance_request_concurrency = 80
    timeout               = "300s"
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
    service_account = google_service_account.compute.email

    scaling {
      max_instance_count = 20
    }

    annotations = {
      "run.googleapis.com/startup-cpu-boost" = "true"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [local.cloud_sql_connection]
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
        limits             = local.resource_limits
        cpu_idle           = true
        startup_cpu_boost  = true
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
            secret  = google_secret_manager_secret.secrets["padel-database-url"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["padel-secret-key"].secret_id
            version = "latest"
          }
        }
      }
    }

    max_instance_request_concurrency = 80
    timeout               = "300s"
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
    service_account = google_service_account.compute.email

    scaling {
      max_instance_count = 20
    }

    annotations = {
      "run.googleapis.com/startup-cpu-boost" = "true"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [local.cloud_sql_connection]
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
        limits             = local.resource_limits
        cpu_idle           = true
        startup_cpu_boost  = true
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
            secret  = google_secret_manager_secret.secrets["padel-database-url"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["padel-secret-key"].secret_id
            version = "latest"
          }
        }
      }
    }

    max_instance_request_concurrency = 80
    timeout               = "300s"
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
