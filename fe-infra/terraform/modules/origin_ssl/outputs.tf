output "ssl_cert_self_link" {
  description = "Self-link of the GCP SSL certificate resource (consumed by networking module)"
  value       = google_compute_ssl_certificate.cloudflare_origin.self_link
}

output "ssl_cert_name" {
  description = "Resource name of the GCP SSL certificate"
  value       = google_compute_ssl_certificate.cloudflare_origin.name
}
