variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "domain" {
  description = "Domain to issue the managed certificate for"
  type        = string
}

variable "dns_config" {
  description = "When false (staging), skip SSL certificate creation entirely."
  type        = bool
  default     = true
}
