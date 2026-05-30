variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "zone" {
  type = string
}

variable "environment" {
  type = string
}

variable "image_tag" {
  description = "Docker image tag (git SHA) — overridden by CI/CD"
  type        = string
  default     = "latest"
}

variable "api_image" {
  type = string
}

variable "worker_image" {
  type = string
}

variable "sendgrid_from_email" {
  type = string
}

variable "app_base_url" {
  type = string
}

variable "release_holds_scheduler_paused" {
  description = "Pause the court-hold expiry Cloud Scheduler job in staging (it need not run continuously here). Set to false to enable the sweep."
  type        = bool
  default     = true
}
