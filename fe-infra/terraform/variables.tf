variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for regional resources"
  type        = string
  default     = "europe-west2"
}

# ─── Staff portal ─────────────────────────────────────────────────────────────
variable "staff_domain" {
  description = "Domain for the staff portal (e.g. staff.smashbook.io)"
  type        = string
}

variable "staff_bucket_name" {
  description = "GCS bucket name for staff portal build artefacts (must be globally unique)"
  type        = string
}

# ─── Player portal ────────────────────────────────────────────────────────────
variable "player_domain" {
  description = "Domain for the player portal (e.g. app.smashbook.io)"
  type        = string
}

variable "player_bucket_name" {
  description = "GCS bucket name for player portal build artefacts (must be globally unique)"
  type        = string
}

# ─── Shared ───────────────────────────────────────────────────────────────────
variable "cdn_cache_mode" {
  description = "CDN cache mode for backend buckets"
  type        = string
  default     = "CACHE_ALL_STATIC"
}

variable "dns_zone_name" {
  description = "Name of the Cloud DNS managed zone (resource name, not DNS name)"
  type        = string
}

variable "dns_zone_dns_name" {
  description = "DNS name of the managed zone, e.g. smashbook.io."
  type        = string
}

variable "create_zone" {
  description = "Set to true to create the DNS managed zone; false if it already exists"
  type        = bool
  default     = false
}

variable "environment" {
  description = "Deployment environment tag (dev / staging / prod)"
  type        = string
  default     = "staging"
}

variable "dns_config" {
  description = "Set to true (production) to create DNS records, SSL certificate, and HTTPS load balancer. Set to false (staging) to create an HTTP-only load balancer accessible via the static IP — no DNS, no SSL, no redirect."
  type        = bool
  default     = true
}
