variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "smashbook-488121"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west2"
}

variable "zone" {
  description = "GCP zone for Cloud SQL"
  type        = string
  default     = "europe-west2-a"
}

variable "image_tag" {
  description = "Docker image tag (git SHA) to deploy — overridden by CI/CD pipeline"
  type        = string
  default     = "latest"
}

variable "api_image" {
  description = "Full image path for the API container"
  type        = string
  default     = "europe-west2-docker.pkg.dev/smashbook-488121/padel-api/padel-api"
}

variable "worker_image" {
  description = "Full image path for the worker container"
  type        = string
  default     = "europe-west2-docker.pkg.dev/smashbook-488121/padel-api/padel-worker"
}
