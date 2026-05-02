terraform {
  required_version = ">= 1.5"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# ─── Variables ────────────────────────────────────────────────────────────────

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone:DNS:Edit permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for smashbook.app"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Deployment environment — staging or production"
  type        = string
}

variable "staff_domain" {
  description = "Full FQDN for the staff portal (e.g. ace-staging.smashbook.app). Leave empty to skip."
  type        = string
  default     = ""
}

variable "player_domain" {
  description = "Full FQDN for the player portal (e.g. ace-player-staging.smashbook.app). Leave empty to skip."
  type        = string
  default     = ""
}

# ─── Read GCP LB IPs from Layer 1 remote state ────────────────────────────────

variable "tf_state_bucket" {
  description = "GCS bucket holding the Layer 1 Terraform state"
  type        = string
}

variable "tf_state_prefix" {
  description = "Prefix within the bucket where Layer 1 state lives"
  type        = string
  default     = "frontend/state"
}

data "terraform_remote_state" "gcp" {
  backend = "gcs"
  config = {
    bucket = var.tf_state_bucket
    prefix = var.tf_state_prefix
  }
}

# ─── Staff DNS ────────────────────────────────────────────────────────────────

resource "cloudflare_record" "staff_a" {
  count   = var.staff_domain != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = split(".", var.staff_domain)[0]
  type    = "A"
  content = data.terraform_remote_state.gcp.outputs.lb_static_ip_staff
  proxied = true
}

resource "cloudflare_record" "staff_www" {
  count   = var.staff_domain != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "www.${split(".", var.staff_domain)[0]}"
  type    = "CNAME"
  content = var.staff_domain
  proxied = true
}

# ─── Player DNS ───────────────────────────────────────────────────────────────

resource "cloudflare_record" "player_a" {
  count   = var.player_domain != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = split(".", var.player_domain)[0]
  type    = "A"
  content = data.terraform_remote_state.gcp.outputs.lb_static_ip_player
  proxied = true
}

resource "cloudflare_record" "player_www" {
  count   = var.player_domain != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "www.${split(".", var.player_domain)[0]}"
  type    = "CNAME"
  content = var.player_domain
  proxied = true
}
