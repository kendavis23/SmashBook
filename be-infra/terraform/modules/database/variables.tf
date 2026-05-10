variable "region" {
  type = string
}

variable "zone" {
  type = string
}

variable "environment" {
  type = string
}

variable "tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-g1-small"
}

variable "availability_type" {
  description = "ZONAL for staging, REGIONAL for prod"
  type        = string
  default     = "ZONAL"
}

variable "disk_size" {
  type    = number
  default = 20
}

variable "backup_enabled" {
  type    = bool
  default = false
}
