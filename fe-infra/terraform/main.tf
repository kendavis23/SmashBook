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
# SHARED — SPA Routing (zone-level Cloudflare URL rewrite — created once)
# Rewrites all non-asset requests to /index.html at the edge so hard-refreshing
# a deep React route (e.g. /clubs) doesn't return a GCS 404.
# Covers every *.smashbook.app subdomain automatically — no per-client change.
# ═══════════════════════════════════════════════════════════════════════════════

module "spa_routing" {
  source             = "./modules/spa_routing"
  cloudflare_zone_id = var.cloudflare_zone_id
}

# ═══════════════════════════════════════════════════════════════════════════════
# SHARED — Cloud Armor (one policy, referenced by both backend buckets)
# ═══════════════════════════════════════════════════════════════════════════════

module "armor" {
  source     = "./modules/armor"
  project_id = var.project_id
}

# ═══════════════════════════════════════════════════════════════════════════════
# STAFF PORTAL  (staff.smashbook.app)
# ═══════════════════════════════════════════════════════════════════════════════

module "storage_staff" {
  source      = "./modules/storage"
  project_id  = var.project_id
  bucket_name = var.staff_bucket_name
  region      = var.region
  environment = var.environment
}

module "origin_ssl_staff" {
  source          = "./modules/origin_ssl"
  project_id      = var.project_id
  name_prefix     = "staff"
  origin_cert_pem = var.origin_cert_pem
  origin_key_pem  = var.origin_key_pem
}

module "cdn_staff" {
  source                 = "./modules/cdn"
  project_id             = var.project_id
  bucket_name            = module.storage_staff.bucket_name
  bucket_self_link       = module.storage_staff.bucket_self_link
  armor_policy_self_link = module.armor.policy_self_link
}

module "networking_staff" {
  source                 = "./modules/networking"
  project_id             = var.project_id
  url_map_self_link      = module.cdn_staff.url_map_self_link
  http_url_map_self_link = module.cdn_staff.http_redirect_url_map_self_link
  ssl_cert_self_link     = module.origin_ssl_staff.ssl_cert_self_link
  name_prefix            = "staff"
}

# ═══════════════════════════════════════════════════════════════════════════════
# PLAYER PORTAL  (player.smashbook.app)
# ═══════════════════════════════════════════════════════════════════════════════

module "storage_player" {
  source      = "./modules/storage"
  project_id  = var.project_id
  bucket_name = var.player_bucket_name
  region      = var.region
  environment = var.environment
}

module "origin_ssl_player" {
  source          = "./modules/origin_ssl"
  project_id      = var.project_id
  name_prefix     = "player"
  origin_cert_pem = var.origin_cert_pem
  origin_key_pem  = var.origin_key_pem
}

module "cdn_player" {
  source                 = "./modules/cdn"
  project_id             = var.project_id
  bucket_name            = module.storage_player.bucket_name
  bucket_self_link       = module.storage_player.bucket_self_link
  armor_policy_self_link = module.armor.policy_self_link
}

module "networking_player" {
  source                 = "./modules/networking"
  project_id             = var.project_id
  url_map_self_link      = module.cdn_player.url_map_self_link
  http_url_map_self_link = module.cdn_player.http_redirect_url_map_self_link
  ssl_cert_self_link     = module.origin_ssl_player.ssl_cert_self_link
  name_prefix            = "player"
}
