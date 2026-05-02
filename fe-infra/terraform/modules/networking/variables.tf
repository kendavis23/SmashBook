variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "url_map_self_link" {
  description = "Self-link of the HTTPS URL map (from cdn module)"
  type        = string
}

variable "http_url_map_self_link" {
  description = "Self-link of the HTTP → HTTPS redirect URL map (from cdn module)"
  type        = string
}

variable "ssl_cert_self_link" {
  description = "Self-link of the managed SSL certificate (from ssl module)"
  type        = string
}

variable "name_prefix" {
  description = "Prefix for resource names to distinguish staff vs player stacks (e.g. 'staff', 'player')"
  type        = string
  default     = "frontend"
}
