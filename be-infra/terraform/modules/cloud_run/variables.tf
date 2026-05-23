variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "api_image" {
  type = string
}

variable "worker_image" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "compute_sa_email" {
  type = string
}

variable "secret_ids" {
  description = "Map of secret name to Secret Manager secret_id, from the secrets module"
  type        = map(string)
}

variable "cloud_sql_connection" {
  type = string
}

variable "cloud_sql_replica_connection" {
  type = string
}

variable "max_instance_count" {
  type    = number
  default = 20
}

variable "sendgrid_from_email" {
  description = "From address used by the notification worker. Domain must be verified in SendGrid."
  type        = string
}

variable "app_base_url" {
  description = "Public base URL of the player web app, used in email links."
  type        = string
}
