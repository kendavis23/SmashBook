terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# ═══════════════════════════════════════════════════════════════════════════════
# SHARED — Cloud Armor (Cloudflare-only allowlist)
# ═══════════════════════════════════════════════════════════════════════════════

module "armor" {
  source     = "../terraform/modules/armor"
  project_id = var.project_id
}

# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN  (admin.smashbook.app)
# ═══════════════════════════════════════════════════════════════════════════════

module "storage_admin" {
  source      = "../terraform/modules/storage"
  project_id  = var.project_id
  bucket_name = var.admin_bucket_name
  region      = var.region
  environment = var.environment
}

module "origin_ssl_admin" {
  source          = "../terraform/modules/origin_ssl"
  project_id      = var.project_id
  name_prefix     = "admin"
  origin_cert_pem = var.origin_cert_pem
  origin_key_pem  = var.origin_key_pem
}

module "cdn_admin" {
  source                 = "../terraform/modules/cdn"
  project_id             = var.project_id
  bucket_name            = module.storage_admin.bucket_name
  bucket_self_link       = module.storage_admin.bucket_self_link
  armor_policy_self_link = module.armor.policy_self_link
}

module "networking_admin" {
  source                 = "../terraform/modules/networking"
  project_id             = var.project_id
  url_map_self_link      = module.cdn_admin.url_map_self_link
  http_url_map_self_link = module.cdn_admin.http_redirect_url_map_self_link
  ssl_cert_self_link     = module.origin_ssl_admin.ssl_cert_self_link
  name_prefix            = "admin"
}

# ═══════════════════════════════════════════════════════════════════════════════
# CLOUDFLARE DNS  (admin.smashbook.app)
# ═══════════════════════════════════════════════════════════════════════════════

resource "cloudflare_record" "admin_subdomain" {
  zone_id = var.cloudflare_zone_id
  name    = "admin"
  type    = "A"
  content = module.networking_admin.static_ip_address
  proxied = true
}
