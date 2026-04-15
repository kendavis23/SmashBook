# ---------------------------------------------------------------------------
# Cloud SQL — PostgreSQL 18
# ---------------------------------------------------------------------------

resource "google_sql_database_instance" "main" {
  name             = "smashbook-staging"
  database_version = "POSTGRES_18"
  region           = var.region

  settings {
    tier              = "db-perf-optimized-N-8"
    edition           = "ENTERPRISE_PLUS"
    availability_type = "ZONAL"
    activation_policy = "ALWAYS"

    location_preference {
      zone = var.zone
    }

    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    backup_configuration {
      enabled                        = false
      point_in_time_recovery_enabled = false
      start_time                     = "19:00"
      transaction_log_retention_days = 14

      backup_retention_settings {
        retained_backups = 15
        retention_unit   = "COUNT"
      }
    }

    disk_type             = "PD_SSD"
    disk_size             = 100
    disk_autoresize       = false

    data_cache_config {
      data_cache_enabled = true
    }
  }

  deletion_protection = true

  lifecycle {
    # Prevent accidental destruction of the database
    prevent_destroy = true
    # Ignore image/revision changes managed by CI/CD
    ignore_changes = []
  }
}

resource "google_sql_database" "smashbook" {
  name     = "padel_db"
  instance = google_sql_database_instance.main.name
}
