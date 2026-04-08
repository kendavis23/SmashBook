variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "bucket_name" {
  description = "Globally unique GCS bucket name"
  type        = string
}

variable "region" {
  description = "GCS bucket location"
  type        = string
  default     = "europe-west2"
}

variable "environment" {
  description = "Deployment environment tag"
  type        = string
  default     = "staging"
}
