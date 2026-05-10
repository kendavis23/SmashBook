output "repository_name" {
  # Use .id (full resource path) to match what the provider stores in state for IAM members
  value = google_artifact_registry_repository.padel_api.id
}

output "registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.padel_api.repository_id}"
}
