output "admin_bucket_name" {
  description = "GCS bucket hosting the admin build"
  value       = module.storage_admin.bucket_name
}

output "admin_static_ip_address" {
  description = "Global static IP for the admin load balancer"
  value       = module.networking_admin.static_ip_address
}

output "admin_cdn_backend_bucket_name" {
  description = "Backend bucket resource name for admin"
  value       = module.cdn_admin.backend_bucket_name
}

output "admin_ssl_certificate_name" {
  description = "Cloudflare Origin SSL certificate resource name for admin"
  value       = module.origin_ssl_admin.ssl_cert_name
}

output "armor_policy_name" {
  description = "Cloud Armor security policy name (Cloudflare-only allowlist)"
  value       = module.armor.policy_name
}
