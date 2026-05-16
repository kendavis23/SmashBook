variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for regional resources"
  type        = string
  default     = "europe-west2"
}

variable "admin_bucket_name" {
  description = "GCS bucket name for admin build artefacts (must be globally unique)"
  type        = string
}

# ─── Cloudflare ───────────────────────────────────────────────────────────────
variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone:DNS:Edit and Cache:Purge permissions for smashbook.app"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for smashbook.app"
  type        = string
  sensitive   = true
}

# ─── Origin SSL (Cloudflare Origin Certificate) ───────────────────────────────
variable "origin_cert_pem" {
  description = "Cloudflare Origin Certificate PEM (15-year wildcard *.smashbook.app — stored in GCP Secret Manager as CERTIFICATE)"
  type        = string
  sensitive   = true
}

variable "origin_key_pem" {
  description = "Cloudflare Origin Certificate private key PEM (stored in GCP Secret Manager as PRIVATE_KEY)"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Deployment environment tag (staging / production)"
  type        = string
  default     = "production"
}
