# ---------------------------------------------------------------------------
# Cloud SQL — PostgreSQL 18
# ---------------------------------------------------------------------------

resource "google_sql_database_instance" "main" {
  name             = "smashbook-${var.environment}"
  database_version = "POSTGRES_18"
  region           = var.region

  settings {
    tier              = var.tier
    edition           = "ENTERPRISE"
    availability_type = var.availability_type
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
      enabled                        = var.backup_enabled
      point_in_time_recovery_enabled = var.backup_enabled
      start_time                     = "19:00"
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 15
        retention_unit   = "COUNT"
      }
    }

    disk_type             = "PD_SSD"
    disk_size             = var.disk_size
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

# ---------------------------------------------------------------------------
# Read replica
# ---------------------------------------------------------------------------

resource "google_sql_database_instance" "replica" {
  name                 = "smashbook-${var.environment}-replica"
  database_version     = "POSTGRES_18"
  region               = var.region
  master_instance_name = google_sql_database_instance.main.name

  replica_configuration {
    failover_target = false
  }

  settings {
    tier              = var.tier
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

    disk_type       = "PD_SSD"
    disk_size       = var.disk_size
    disk_autoresize = false
  }

  deletion_protection = true

  lifecycle {
    prevent_destroy = true
    ignore_changes  = []
  }
}
