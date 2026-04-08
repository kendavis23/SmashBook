# ─── Staff portal ─────────────────────────────────────────────────────────────
output "staff_bucket_name" {
  description = "GCS bucket hosting the staff portal build"
  value       = module.storage_staff.bucket_name
}

output "staff_static_ip_address" {
  description = "Global static IP for the staff portal load balancer"
  value       = module.networking_staff.static_ip_address
}

output "staff_frontend_url" {
  description = "Public URL of the staff portal (HTTPS in prod, HTTP IP in staging)"
  value = var.dns_config ? (
    "https://${var.staff_domain}"
  ) : (
    "http://${module.networking_staff.static_ip_address}"
  )
}

output "staff_cdn_backend_bucket_name" {
  description = "CDN backend bucket resource name for staff portal"
  value       = module.cdn_staff.backend_bucket_name
}

output "staff_ssl_certificate_name" {
  description = "Managed SSL certificate resource name for staff portal (null in staging)"
  value       = module.ssl_staff.ssl_cert_name
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

output "player_frontend_url" {
  description = "Public URL of the player portal (HTTPS in prod, HTTP IP in staging)"
  value = var.dns_config ? (
    "https://${var.player_domain}"
  ) : (
    "http://${module.networking_player.static_ip_address}"
  )
}

output "player_cdn_backend_bucket_name" {
  description = "CDN backend bucket resource name for player portal"
  value       = module.cdn_player.backend_bucket_name
}

output "player_ssl_certificate_name" {
  description = "Managed SSL certificate resource name for player portal (null in staging)"
  value       = module.ssl_player.ssl_cert_name
}

# ─── Shared ───────────────────────────────────────────────────────────────────
output "dns_zone_name_servers" {
  description = "Name servers to delegate to at your domain registrar (only when dns_config = true and create_zone = true)"
  value       = module.dns_staff.name_servers
}
