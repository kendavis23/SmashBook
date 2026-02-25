variable "project_id" { type = string }
variable "region" { type = string }
variable "db_connection_name" { type = string }

resource "google_cloud_run_v2_service" "api" {
  name     = "padel-api"
  location = var.region
  template {
    containers {
      image = "gcr.io/${var.project_id}/padel-api:latest"
      ports { container_port = 8080 }
      env {
        name  = "DATABASE_URL"
        value_source { secret_key_ref { secret = "db-primary-url" ; version = "latest" } }
      }
      env {
        name  = "DATABASE_READ_REPLICA_URL"
        value_source { secret_key_ref { secret = "db-replica-url" ; version = "latest" } }
      }
      env {
        name  = "STRIPE_SECRET_KEY"
        value_source { secret_key_ref { secret = "stripe-secret-key" ; version = "latest" } }
      }
      resources { limits = { cpu = "2" ; memory = "1Gi" } }
    }
    scaling { min_instance_count = 1 ; max_instance_count = 20 }
  }
}

resource "google_cloud_run_v2_service" "booking_worker" {
  name     = "padel-booking-worker"
  location = var.region
  template {
    containers {
      image   = "gcr.io/${var.project_id}/padel-worker:latest"
      command = ["uvicorn", "app.workers.booking_worker:app", "--host", "0.0.0.0", "--port", "8080"]
      resources { limits = { cpu = "1" ; memory = "512Mi" } }
    }
    scaling { min_instance_count = 0 ; max_instance_count = 10 }
  }
}

resource "google_cloud_run_v2_service" "payment_worker" {
  name     = "padel-payment-worker"
  location = var.region
  template {
    containers {
      image   = "gcr.io/${var.project_id}/padel-worker:latest"
      command = ["uvicorn", "app.workers.payment_worker:app", "--host", "0.0.0.0", "--port", "8080"]
      resources { limits = { cpu = "1" ; memory = "512Mi" } }
    }
    scaling { min_instance_count = 0 ; max_instance_count = 10 }
  }
}

resource "google_cloud_run_v2_service" "notification_worker" {
  name     = "padel-notification-worker"
  location = var.region
  template {
    containers {
      image   = "gcr.io/${var.project_id}/padel-worker:latest"
      command = ["uvicorn", "app.workers.notification_worker:app", "--host", "0.0.0.0", "--port", "8080"]
      resources { limits = { cpu = "1" ; memory = "512Mi" } }
    }
    scaling { min_instance_count = 0 ; max_instance_count = 10 }
  }
}
