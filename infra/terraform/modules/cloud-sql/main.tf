variable "project_id" { type = string }
variable "region" { type = string }
variable "vpc_id" { type = string }

resource "google_sql_database_instance" "primary" {
  name             = "padel-db-primary"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = "db-custom-4-15360"
    availability_type = "REGIONAL"

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
      retained_backups               = 14
    }
  }
  deletion_protection = true
}

resource "google_sql_database_instance" "read_replica" {
  name                 = "padel-db-replica"
  database_version     = "POSTGRES_16"
  region               = var.region
  master_instance_name = google_sql_database_instance.primary.name

  replica_configuration { failover_target = false }

  settings {
    tier = "db-custom-2-7680"
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
    }
  }
}

resource "google_sql_database" "padel" {
  name     = "padel"
  instance = google_sql_database_instance.primary.name
}

output "connection_name" {
  value = google_sql_database_instance.primary.connection_name
}
