# ---------------------------------------------------------------------------
# Outputs — useful values for CI/CD and collaborators
# ---------------------------------------------------------------------------

output "api_url" {
  description = "Cloud Run URL for the main API"
  value       = google_cloud_run_v2_service.api.uri
}

output "booking_worker_url" {
  description = "Cloud Run URL for the booking worker"
  value       = google_cloud_run_v2_service.booking_worker.uri
}

output "payment_worker_url" {
  description = "Cloud Run URL for the payment worker"
  value       = google_cloud_run_v2_service.payment_worker.uri
}

output "notification_worker_url" {
  description = "Cloud Run URL for the notification worker"
  value       = google_cloud_run_v2_service.notification_worker.uri
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name for use in Cloud Run annotations"
  value       = google_sql_database_instance.main.connection_name
}

output "artifact_registry_url" {
  description = "Base URL for Docker images in Artifact Registry"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.padel_api.repository_id}"
}

output "github_actions_sa_email" {
  description = "Service account email for GitHub Actions — add to GCP_SA_KEY secret"
  value       = google_service_account.github_actions.email
}

output "runtime_sa_email" {
  description = "Runtime service account email used by Cloud Run services"
  value       = google_service_account.compute.email
}
