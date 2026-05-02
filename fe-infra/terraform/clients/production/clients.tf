terraform {
  required_version = ">= 1.5"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  backend "gcs" {
    bucket = "tf-state-smashbook-frontend"
    prefix = "production/clients"
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

variable "staff_domain" {
  description = "Full FQDN for the staff portal (e.g. staff.smashbook.app). Leave empty to skip creating staff DNS records."
  type        = string
  default     = ""
}

variable "player_domain" {
  description = "Full FQDN for the player portal (e.g. player.smashbook.app). Leave empty to skip creating player DNS records."
  type        = string
  default     = ""
}

# ─── Read GCP LB IPs from Layer 1 remote state ────────────────────────────────
data "terraform_remote_state" "gcp_prod" {
  backend = "gcs"
  config = {
    bucket = "tf-state-smashbook-frontend"
    prefix = "production/gcp"
  }
}

# ─── Staff DNS (only created when TF_VAR_staff_domain is set) ─────────────────

resource "cloudflare_record" "staff_a" {
  count   = var.staff_domain != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = split(".", var.staff_domain)[0]
  type    = "A"
  content = data.terraform_remote_state.gcp_prod.outputs.lb_static_ip_staff
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

# ─── Player DNS (only created when TF_VAR_player_domain is set) ───────────────

resource "cloudflare_record" "player_a" {
  count   = var.player_domain != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = split(".", var.player_domain)[0]
  type    = "A"
  content = data.terraform_remote_state.gcp_prod.outputs.lb_static_ip_player
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
