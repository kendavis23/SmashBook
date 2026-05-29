output "connector_id" {
  description = "Fully-qualified connector ID for use in Cloud Run vpc_access blocks."
  value       = google_vpc_access_connector.main.id
}

output "connector_name" {
  value = google_vpc_access_connector.main.name
}
