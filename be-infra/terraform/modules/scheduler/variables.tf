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
