terraform {
  required_version = ">= 1.9"
  required_providers {
    google = { source = "hashicorp/google" ; version = "~> 6.0" }
  }
  backend "gcs" {
    bucket = "padel-tf-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

module "networking" {
  source     = "./modules/networking"
  project_id = var.project_id
  region     = var.region
}

module "cloud_sql" {
  source     = "./modules/cloud-sql"
  project_id = var.project_id
  region     = var.region
  vpc_id     = module.networking.vpc_id
}

module "pubsub" {
  source     = "./modules/pubsub"
  project_id = var.project_id
}

module "storage" {
  source     = "./modules/storage"
  project_id = var.project_id
  region     = var.region
}

module "cloud_run" {
  source             = "./modules/cloud-run"
  project_id         = var.project_id
  region             = var.region
  db_connection_name = module.cloud_sql.connection_name
}
