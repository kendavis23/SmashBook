variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "api_url" {
  description = "Base URL of the padel-api Cloud Run service"
  type        = string
}

variable "platform_api_key_secret_id" {
  description = "Secret Manager secret_id holding the X-Platform-Key value"
  type        = string
}

variable "schedule" {
  description = "Cron schedule for the expiry sweep"
  type        = string
  default     = "* * * * *" # every minute
}

variable "paused" {
  description = "When true, the job exists but does not fire (used to disable the sweep in staging)"
  type        = bool
  default     = false
}

variable "analytics_events_topic_id" {
  description = "Full topic id (projects/.../topics/analytics-events) the daily snapshot job publishes to"
  type        = string
}

variable "analytics_snapshot_schedule" {
  description = "Cron schedule (UTC) for the daily court-utilisation snapshot job"
  type        = string
  default     = "0 2 * * *" # 02:00 UTC daily
}

variable "analytics_snapshot_paused" {
  description = "When true, the daily snapshot job exists but does not fire"
  type        = bool
  default     = false
}

variable "analytics_refresh_events_topic_id" {
  description = "Full topic id (projects/.../topics/analytics-refresh-events) the nightly MV-refresh job publishes to"
  type        = string
}

variable "analytics_refresh_schedule" {
  description = "Cron schedule (UTC) for the nightly materialized-view refresh job"
  type        = string
  default     = "0 3 * * *" # 03:00 UTC daily, after the 02:00 snapshot
}

variable "analytics_refresh_paused" {
  description = "When true, the nightly MV-refresh job exists but does not fire"
  type        = bool
  default     = false
}

variable "settlement_events_topic_id" {
  description = "Full topic id (projects/.../topics/wallet-settlement-events) the daily settlement job publishes to"
  type        = string
}

variable "settlement_schedule" {
  description = "Cron schedule (UTC) for the daily wallet-debt settlement job"
  type        = string
  default     = "0 2 * * *" # 02:00 UTC daily, low-traffic window
}

variable "settlement_paused" {
  description = "When true, the daily settlement job exists but does not fire"
  type        = bool
  default     = false
}
