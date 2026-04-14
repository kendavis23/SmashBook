output "ssl_cert_name" {
  description = "Resource name of the managed SSL certificate (null when dns_config = false)"
  value       = var.dns_config ? google_compute_managed_ssl_certificate.frontend[0].name : null
}

output "ssl_cert_self_link" {
  description = "Self-link passed to the HTTPS target proxy (null when dns_config = false)"
  value       = var.dns_config ? google_compute_managed_ssl_certificate.frontend[0].self_link : null
}
