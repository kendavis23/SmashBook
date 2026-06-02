terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Same bucket and prefix as the original be-infra/terraform/ root — existing
  # state is picked up automatically after running terraform init here.
  backend "gcs" {
    bucket = "tf-state-smashbook-488121-backend"
    prefix = "staging"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ---------------------------------------------------------------------------
# Modules
# ---------------------------------------------------------------------------

module "artifact_registry" {
  source     = "../modules/artifact_registry"
  project_id = var.project_id
  region     = var.region
}

module "iam" {
  source                 = "../modules/iam"
  project_id             = var.project_id
  region                 = var.region
  artifact_registry_name = module.artifact_registry.repository_name
}

module "secrets" {
  source           = "../modules/secrets"
  compute_sa_email = module.iam.compute_sa_email
}

module "database" {
  source         = "../modules/database"
  region         = var.region
  zone           = var.zone
  environment    = var.environment
  backup_enabled = true
  # Staging: db-g1-small, ZONAL, 20 GB, backups enabled (15 retained, 7-day PITR)
}

module "vpc_connector" {
  source        = "../modules/vpc_connector"
  region        = var.region
  environment   = var.environment
  ip_cidr_range = "10.8.0.0/28"
}

module "cloud_run" {
  source                       = "../modules/cloud_run"
  project_id                   = var.project_id
  region                       = var.region
  api_image                    = var.api_image
  worker_image                 = var.worker_image
  image_tag                    = var.image_tag
  compute_sa_email             = module.iam.compute_sa_email
  secret_ids                   = module.secrets.secret_ids
  cloud_sql_connection         = module.database.connection_name
  cloud_sql_replica_connection = module.database.replica_connection_name
  sendgrid_from_email          = var.sendgrid_from_email
  app_base_url                 = var.app_base_url
  vpc_connector_id             = module.vpc_connector.connector_id
}

module "pubsub" {
  source                       = "../modules/pubsub"
  project_id                   = var.project_id
  region                       = var.region
  compute_sa_email             = module.iam.compute_sa_email
  booking_worker_uri           = module.cloud_run.booking_worker_uri
  payment_worker_uri           = module.cloud_run.payment_worker_uri
  notification_worker_uri      = module.cloud_run.notification_worker_uri
  analytics_worker_uri         = module.cloud_run.analytics_worker_uri
  analytics_refresh_worker_uri = module.cloud_run.analytics_refresh_worker_uri

  # The run.invoker IAM members reference services by literal name, so Terraform
  # has no implicit edge to their creation — force pubsub to wait for cloud_run
  # so a clean apply doesn't race the IAM bindings ahead of the services (404).
  depends_on = [module.cloud_run]
}

module "storage" {
  source           = "../modules/storage"
  project_id       = var.project_id
  region           = var.region
  environment      = var.environment
  compute_sa_email = module.iam.compute_sa_email
}

module "scheduler" {
  source                     = "../modules/scheduler"
  project_id                 = var.project_id
  region                     = var.region
  api_url                    = module.cloud_run.api_url
  platform_api_key_secret_id = module.secrets.secret_ids["padel-platform-api-key"]
  # Staging does not need the sweep running continuously — defaults to paused.
  # Flip `release_holds_scheduler_paused = false` (or `terraform apply` after a
  # `gcloud scheduler jobs resume`) to enable it for a testing session.
  paused = var.release_holds_scheduler_paused

  # Daily court-utilisation snapshot job (02:00 UTC). Runs in staging so the
  # analytics data stays warm; flip `analytics_snapshot_paused = true` to disable.
  analytics_events_topic_id = module.pubsub.analytics_events_topic_id
  analytics_snapshot_paused = var.analytics_snapshot_paused

  # Nightly materialized-view refresh job (03:00 UTC) for the revenue views.
  # Flip `analytics_refresh_paused = true` to disable.
  analytics_refresh_events_topic_id = module.pubsub.analytics_refresh_events_topic_id
  analytics_refresh_paused          = var.analytics_refresh_paused
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "api_url" {
  value = module.cloud_run.api_url
}

output "analytics_worker_uri" {
  value = module.cloud_run.analytics_worker_uri
}

output "analytics_refresh_worker_uri" {
  value = module.cloud_run.analytics_refresh_worker_uri
}

output "artifact_registry_url" {
  value = module.artifact_registry.registry_url
}

output "cloud_sql_connection_name" {
  value = module.database.connection_name
}

output "replica_connection_name" {
  value = module.database.replica_connection_name
}

output "github_actions_sa_email" {
  value = module.iam.github_actions_sa_email
}

output "runtime_sa_email" {
  value = module.iam.compute_sa_email
}

output "media_bucket_name" {
  value = module.storage.media_bucket_name
}

output "exports_bucket_name" {
  value = module.storage.exports_bucket_name
}

output "ai_archive_bucket_name" {
  value = module.storage.ai_archive_bucket_name
}
