output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "booking_worker_uri" {
  value = google_cloud_run_v2_service.booking_worker.uri
}

output "payment_worker_uri" {
  value = google_cloud_run_v2_service.payment_worker.uri
}

output "notification_worker_uri" {
  value = google_cloud_run_v2_service.notification_worker.uri
}
