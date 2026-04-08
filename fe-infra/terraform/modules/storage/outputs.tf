output "bucket_name" {
  description = "Name of the GCS bucket"
  value       = google_storage_bucket.frontend.name
}

output "bucket_url" {
  description = "gs:// URL of the bucket"
  value       = google_storage_bucket.frontend.url
}

output "bucket_self_link" {
  description = "Self-link used by the CDN backend bucket resource"
  value       = google_storage_bucket.frontend.self_link
}
