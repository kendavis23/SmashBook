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
