output "media_bucket_name" {
  value = google_storage_bucket.media.name
}

output "exports_bucket_name" {
  value = google_storage_bucket.exports.name
}

output "ai_archive_bucket_name" {
  value = google_storage_bucket.ai_archive.name
}
