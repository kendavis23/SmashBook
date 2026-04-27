# ---------------------------------------------------------------------------
# Cloud SQL — PostgreSQL 18
# ---------------------------------------------------------------------------

resource "google_sql_database_instance" "main" {
  name             = "smashbook-staging"
  database_version = "POSTGRES_18"
  region           = var.region

  settings {
    tier              = "db-g1-small"
    edition           = "ENTERPRISE"
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
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 15
        retention_unit   = "COUNT"
      }
    }

    disk_type             = "PD_SSD"
    disk_size             = 20
    disk_autoresize       = false
  }

  deletion_protection = true

  lifecycle {
   prevent_destroy = true
    ignore_changes  = []
  }
}

resource "google_sql_database" "smashbook" {
  name     = "padel_db"
  instance = google_sql_database_instance.main.name
}
