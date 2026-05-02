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

variable "armor_policy_self_link" {
  description = "Self-link of the Cloud Armor security policy (Cloudflare-only allowlist)"
  type        = string
}
