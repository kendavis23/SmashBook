output "static_ip_address" {
  description = "Global static IP address assigned to the load balancer"
  value       = google_compute_global_address.frontend.address
}

output "static_ip_name" {
  description = "Resource name of the global static IP"
  value       = google_compute_global_address.frontend.name
}

output "https_proxy_name" {
  description = "Name of the HTTPS target proxy (null when dns_config = false)"
  value       = var.dns_config ? google_compute_target_https_proxy.frontend[0].name : null
}

output "https_forwarding_rule_name" {
  description = "Name of the HTTPS forwarding rule (null when dns_config = false)"
  value       = var.dns_config ? google_compute_global_forwarding_rule.https[0].name : null
}

output "http_forwarding_rule_name" {
  description = "Name of the HTTP forwarding rule"
  value       = google_compute_global_forwarding_rule.http.name
}
