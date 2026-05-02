output "website_bucket_name" {
  description = "GCS bucket hosting the website build"
  value       = module.storage_website.bucket_name
}

output "website_static_ip_address" {
  description = "Global static IP for the website load balancer"
  value       = module.networking_website.static_ip_address
}

output "website_cdn_backend_bucket_name" {
  description = "Backend bucket resource name for website"
  value       = module.cdn_website.backend_bucket_name
}

output "website_ssl_certificate_name" {
  description = "Cloudflare Origin SSL certificate resource name for website"
  value       = module.origin_ssl_website.ssl_cert_name
}

output "armor_policy_name" {
  description = "Cloud Armor security policy name (Cloudflare-only allowlist)"
  value       = module.armor.policy_name
}
