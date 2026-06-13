variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "compute_sa_email" {
  type = string
}

variable "booking_worker_uri" {
  type = string
}

variable "payment_worker_uri" {
  type = string
}

variable "notification_worker_uri" {
  type = string
}

variable "analytics_worker_uri" {
  type = string
}

variable "analytics_refresh_worker_uri" {
  type = string
}

variable "settlement_worker_uri" {
  type = string
}

variable "payout_reconcile_worker_uri" {
  type = string
}
