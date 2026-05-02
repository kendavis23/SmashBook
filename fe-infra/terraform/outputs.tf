# ─── Staff portal ─────────────────────────────────────────────────────────────
output "staff_bucket_name" {
  description = "GCS bucket hosting the staff portal build"
  value       = module.storage_staff.bucket_name
}

output "staff_static_ip_address" {
  description = "Global static IP for the staff portal load balancer"
  value       = module.networking_staff.static_ip_address
}

output "staff_cdn_backend_bucket_name" {
  description = "Backend bucket resource name for staff portal"
  value       = module.cdn_staff.backend_bucket_name
}

output "staff_ssl_certificate_name" {
  description = "Cloudflare Origin SSL certificate resource name for staff portal"
  value       = module.origin_ssl_staff.ssl_cert_name
}

# ─── Player portal ────────────────────────────────────────────────────────────
output "player_bucket_name" {
  description = "GCS bucket hosting the player portal build"
  value       = module.storage_player.bucket_name
}

output "player_static_ip_address" {
  description = "Global static IP for the player portal load balancer"
  value       = module.networking_player.static_ip_address
}

output "player_cdn_backend_bucket_name" {
  description = "Backend bucket resource name for player portal"
  value       = module.cdn_player.backend_bucket_name
}

output "player_ssl_certificate_name" {
  description = "Cloudflare Origin SSL certificate resource name for player portal"
  value       = module.origin_ssl_player.ssl_cert_name
}

# ─── Shared ───────────────────────────────────────────────────────────────────
output "lb_static_ip_staff" {
  description = "Staff portal LB static IP — consumed by clients/production Cloudflare DNS layer"
  value       = module.networking_staff.static_ip_address
}

output "lb_static_ip_player" {
  description = "Player portal LB static IP — consumed by clients/production Cloudflare DNS layer"
  value       = module.networking_player.static_ip_address
}

output "armor_policy_name" {
  description = "Cloud Armor security policy name (Cloudflare-only allowlist)"
  value       = module.armor.policy_name
}
