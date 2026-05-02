output "backend_bucket_name" {
  description = "Name of the CDN backend bucket resource"
  value       = google_compute_backend_bucket.frontend.name
}

output "backend_bucket_self_link" {
  description = "Self-link of the CDN backend bucket"
  value       = google_compute_backend_bucket.frontend.self_link
}

output "url_map_self_link" {
  description = "Self-link of the HTTPS URL map"
  value       = google_compute_url_map.frontend_https.self_link
}

output "http_redirect_url_map_self_link" {
  description = "Self-link of the HTTP → HTTPS redirect URL map"
  value       = google_compute_url_map.http_redirect.self_link
}
