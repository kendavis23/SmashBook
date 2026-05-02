output "record_id" {
  description = "Cloudflare DNS record ID"
  value       = cloudflare_record.frontend_a.id
}

output "hostname" {
  description = "Full hostname of the DNS record"
  value       = cloudflare_record.frontend_a.hostname
}
