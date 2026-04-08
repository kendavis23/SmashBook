variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "bucket_name" {
  description = "GCS bucket name (used to name the backend bucket resource)"
  type        = string
}

variable "bucket_self_link" {
  description = "Self-link of the GCS bucket"
  type        = string
}

variable "cdn_cache_mode" {
  description = "CDN cache mode"
  type        = string
  default     = "CACHE_ALL_STATIC"
}

variable "dns_config" {
  description = "When true, create the HTTP → HTTPS redirect URL map (production). When false, create a plain HTTP URL map (staging)."
  type        = bool
  default     = true
}
