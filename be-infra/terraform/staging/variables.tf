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

variable "analytics_snapshot_paused" {
  description = "Pause the daily court-utilisation snapshot Cloud Scheduler job in staging. Defaults to false so analytics data stays current."
  type        = bool
  default     = false
}

variable "analytics_refresh_paused" {
  description = "Pause the nightly materialized-view refresh Cloud Scheduler job in staging. Defaults to false so the revenue views stay current."
  type        = bool
  default     = false
}

variable "settlement_paused" {
  description = "Pause the daily wallet-debt settlement Cloud Scheduler job in staging. Defaults to false; set to true if the staging Stripe account is not in test mode, since settlement issues real Connect transfers."
  type        = bool
  default     = false
}

variable "payout_reconcile_paused" {
  description = "Pause the daily Stripe payout reconciliation Cloud Scheduler job in staging. Defaults to true — the sweep ships paused until explicitly enabled."
  type        = bool
  default     = true
}
