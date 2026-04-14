output "name_servers" {
  description = "Name servers to set at your domain registrar (only populated when dns_config = true and create_zone = true)"
  value       = (var.dns_config && var.create_zone) ? google_dns_managed_zone.frontend[0].name_servers : []
}

output "a_record_name" {
  description = "DNS A record name (empty when create_zone = true / first run)"
  value       = length(google_dns_record_set.frontend_a) > 0 ? google_dns_record_set.frontend_a[0].name : ""
}

output "www_cname_name" {
  description = "DNS CNAME record name for www (empty when create_zone = true / first run)"
  value       = length(google_dns_record_set.www_cname) > 0 ? google_dns_record_set.www_cname[0].name : ""
}
