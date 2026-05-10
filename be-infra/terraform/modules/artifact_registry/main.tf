resource "google_artifact_registry_repository" "padel_api" {
  location      = var.region
  repository_id = "padel-api"
  description   = "Padel booking app backend images"
  format        = "DOCKER"

  lifecycle {
    prevent_destroy = true
  }
}
