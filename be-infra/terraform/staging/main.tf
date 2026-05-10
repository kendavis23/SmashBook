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
  source      = "../modules/database"
  region      = var.region
  zone        = var.zone
  environment = var.environment
  # Staging defaults: db-g1-small, ZONAL, 20 GB, no backups
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
}

module "pubsub" {
  source                  = "../modules/pubsub"
  project_id              = var.project_id
  region                  = var.region
  compute_sa_email        = module.iam.compute_sa_email
  booking_worker_uri      = module.cloud_run.booking_worker_uri
  payment_worker_uri      = module.cloud_run.payment_worker_uri
  notification_worker_uri = module.cloud_run.notification_worker_uri
}

module "storage" {
  source           = "../modules/storage"
  project_id       = var.project_id
  region           = var.region
  environment      = var.environment
  compute_sa_email = module.iam.compute_sa_email
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "api_url" {
  value = module.cloud_run.api_url
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
