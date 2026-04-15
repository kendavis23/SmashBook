terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # GCS backend — create this bucket manually once before running terraform init
  # gcloud storage buckets create gs://tf-state-smashbook-488121-backend --location=europe-west2
  backend "gcs" {
    bucket = "tf-state-smashbook-488121-backend"
    prefix = "staging"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
