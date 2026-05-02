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
# WEBSITE  (smashbook.app)
# ═══════════════════════════════════════════════════════════════════════════════

module "storage_website" {
  source      = "../terraform/modules/storage"
  project_id  = var.project_id
  bucket_name = var.website_bucket_name
  region      = var.region
  environment = var.environment
}

module "origin_ssl_website" {
  source          = "../terraform/modules/origin_ssl"
  project_id      = var.project_id
  name_prefix     = "website"
  origin_cert_pem = var.origin_cert_pem
  origin_key_pem  = var.origin_key_pem
}

module "cdn_website" {
  source                 = "../terraform/modules/cdn"
  project_id             = var.project_id
  bucket_name            = module.storage_website.bucket_name
  bucket_self_link       = module.storage_website.bucket_self_link
  armor_policy_self_link = module.armor.policy_self_link
}

module "networking_website" {
  source                 = "../terraform/modules/networking"
  project_id             = var.project_id
  url_map_self_link      = module.cdn_website.url_map_self_link
  http_url_map_self_link = module.cdn_website.http_redirect_url_map_self_link
  ssl_cert_self_link     = module.origin_ssl_website.ssl_cert_self_link
  name_prefix            = "website"
}

# ═══════════════════════════════════════════════════════════════════════════════
# CLOUDFLARE DNS  (smashbook.app)
# ═══════════════════════════════════════════════════════════════════════════════

# smashbook.app → website LB static IP (always created — the apex record is mandatory)
resource "cloudflare_record" "website_apex" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "A"
  content = module.networking_website.static_ip_address
  proxied = true
}

# www.smashbook.app → var.website_domain (only created when TF_VAR_website_domain is set)
resource "cloudflare_record" "website_www" {
  count   = var.website_domain != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "www"
  type    = "CNAME"
  content = var.website_domain
  proxied = true
}
