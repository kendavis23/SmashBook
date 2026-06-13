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

output "analytics_worker_uri" {
  value = google_cloud_run_v2_service.analytics_worker.uri
}

output "analytics_refresh_worker_uri" {
  value = google_cloud_run_v2_service.analytics_refresh_worker.uri
}

output "settlement_worker_uri" {
  value = google_cloud_run_v2_service.settlement_worker.uri
}

output "payout_reconcile_worker_uri" {
  value = google_cloud_run_v2_service.payout_reconcile_worker.uri
}
