output "static_ip_address" {
  description = "Global static IP address assigned to the load balancer"
  value       = google_compute_global_address.frontend.address
}

output "static_ip_name" {
  description = "Resource name of the global static IP"
  value       = google_compute_global_address.frontend.name
}

output "https_proxy_name" {
  description = "Name of the HTTPS target proxy"
  value       = google_compute_target_https_proxy.frontend.name
}

output "https_forwarding_rule_name" {
  description = "Name of the HTTPS forwarding rule"
  value       = google_compute_global_forwarding_rule.https.name
}

output "http_forwarding_rule_name" {
  description = "Name of the HTTP → HTTPS redirect forwarding rule"
  value       = google_compute_global_forwarding_rule.http.name
}
