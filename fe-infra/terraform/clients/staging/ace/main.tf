module "dns" {
  source = "../../_template"

  environment          = var.environment
  cloudflare_api_token = var.cloudflare_api_token
  cloudflare_zone_id   = var.cloudflare_zone_id
  staff_domain         = var.staff_domain
  player_domain        = var.player_domain
  tf_state_bucket      = var.tf_state_bucket
  tf_state_prefix      = var.tf_state_prefix
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_zone_id" {
  type      = string
  sensitive = true
}

variable "environment" {
  type = string
}

variable "staff_domain" {
  type    = string
  default = ""
}

variable "player_domain" {
  type    = string
  default = ""
}

variable "tf_state_bucket" {
  type = string
}

variable "tf_state_prefix" {
  type    = string
  default = "frontend/state"
}
