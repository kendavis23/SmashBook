output "policy_self_link" {
  description = "Self-link of the Cloud Armor security policy (attach via edge_security_policy on backend bucket)"
  value       = google_compute_security_policy.cloudflare_only.self_link
}

output "policy_name" {
  description = "Resource name of the Cloud Armor security policy"
  value       = google_compute_security_policy.cloudflare_only.name
}
