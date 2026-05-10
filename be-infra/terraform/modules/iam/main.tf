# ---------------------------------------------------------------------------
# Service Accounts
# ---------------------------------------------------------------------------

resource "google_service_account" "compute" {
  account_id   = "padel-runtime"
  display_name = "SmashBook Runtime Service Account"
  description  = "Used by Cloud Run services and workers at runtime"
}

resource "google_service_account" "github_actions" {
  account_id   = "github-actions-deployer"
  display_name = "GitHub Actions Deployer"
  description  = "Used by GitHub Actions CI/CD pipeline to deploy Cloud Run services"
}

# ---------------------------------------------------------------------------
# IAM bindings
# ---------------------------------------------------------------------------

locals {
  github_actions_roles = [
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/cloudsql.client",
    "roles/secretmanager.viewer",
    "roles/iam.serviceAccountUser",
  ]

  compute_roles = [
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/pubsub.publisher",
    "roles/pubsub.subscriber",
  ]
}

resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset(local.github_actions_roles)
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "compute_roles" {
  for_each = toset(local.compute_roles)
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.compute.email}"
}

resource "google_artifact_registry_repository_iam_member" "github_actions_push" {
  location   = var.region
  repository = var.artifact_registry_name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.github_actions.email}"
}
