terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ═══════════════════════════════════════════════════════════════════════════════
# STAFF PORTAL  (staff.smashbook.io)
# ═══════════════════════════════════════════════════════════════════════════════

module "storage_staff" {
  source      = "./modules/storage"
  project_id  = var.project_id
  bucket_name = var.staff_bucket_name
  region      = var.region
  environment = var.environment
}

module "ssl_staff" {
  source     = "./modules/ssl"
  project_id = var.project_id
  domain     = var.staff_domain
  dns_config = var.dns_config
}

module "cdn_staff" {
  source           = "./modules/cdn"
  project_id       = var.project_id
  bucket_name      = module.storage_staff.bucket_name
  bucket_self_link = module.storage_staff.bucket_self_link
  cdn_cache_mode   = var.cdn_cache_mode
  dns_config       = var.dns_config
}

module "networking_staff" {
  source                 = "./modules/networking"
  project_id             = var.project_id
  url_map_self_link      = module.cdn_staff.url_map_self_link
  http_url_map_self_link = module.cdn_staff.http_redirect_url_map_self_link
  ssl_cert_self_link     = module.ssl_staff.ssl_cert_self_link
  name_prefix            = "staff"
  dns_config             = var.dns_config
}

module "dns_staff" {
  source            = "./modules/dns"
  project_id        = var.project_id
  dns_zone_name     = var.dns_zone_name
  dns_zone_dns_name = var.dns_zone_dns_name
  domain            = var.staff_domain
  static_ip         = module.networking_staff.static_ip_address
  create_zone       = var.create_zone
  dns_config        = var.dns_config
}

# ═══════════════════════════════════════════════════════════════════════════════
# PLAYER PORTAL  (app.smashbook.io)
# ═══════════════════════════════════════════════════════════════════════════════

module "storage_player" {
  source      = "./modules/storage"
  project_id  = var.project_id
  bucket_name = var.player_bucket_name
  region      = var.region
  environment = var.environment
}

module "ssl_player" {
  source     = "./modules/ssl"
  project_id = var.project_id
  domain     = var.player_domain
  dns_config = var.dns_config
}

module "cdn_player" {
  source           = "./modules/cdn"
  project_id       = var.project_id
  bucket_name      = module.storage_player.bucket_name
  bucket_self_link = module.storage_player.bucket_self_link
  cdn_cache_mode   = var.cdn_cache_mode
  dns_config       = var.dns_config
}

module "networking_player" {
  source                 = "./modules/networking"
  project_id             = var.project_id
  url_map_self_link      = module.cdn_player.url_map_self_link
  http_url_map_self_link = module.cdn_player.http_redirect_url_map_self_link
  ssl_cert_self_link     = module.ssl_player.ssl_cert_self_link
  name_prefix            = "player"
  dns_config             = var.dns_config
}

module "dns_player" {
  source            = "./modules/dns"
  project_id        = var.project_id
  dns_zone_name     = var.dns_zone_name
  dns_zone_dns_name = var.dns_zone_dns_name
  domain            = var.player_domain
  static_ip         = module.networking_player.static_ip_address
  create_zone       = false
  dns_config        = var.dns_config
}
