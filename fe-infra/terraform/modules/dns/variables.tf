variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "dns_zone_name" {
  description = "Cloud DNS managed zone resource name (e.g. smashbook-zone)"
  type        = string
}

variable "dns_zone_dns_name" {
  description = "DNS name of the managed zone, trailing dot required (e.g. smashbook.io.)"
  type        = string
}

variable "domain" {
  description = "Full domain to point at the load balancer (e.g. app.smashbook.io)"
  type        = string
}

variable "static_ip" {
  description = "Global static IP address from the networking module"
  type        = string
}

variable "create_zone" {
  description = "Set to true to create the DNS managed zone; false to use an existing one"
  type        = bool
  default     = false
}

variable "dns_config" {
  description = "When false (staging), skip all DNS resources regardless of create_zone."
  type        = bool
  default     = true
}
