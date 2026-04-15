# ---------------------------------------------------------------------------
# Service Accounts
# ---------------------------------------------------------------------------

# Runtime service account — used by all Cloud Run services
# Note: The default compute SA (607958067144-compute@developer.gserviceaccount.com)
# is imported. For new projects, create a dedicated SA instead.
resource "google_service_account" "compute" {
  account_id   = "padel-runtime"
  display_name = "SmashBook Runtime Service Account"
  description  = "Used by Cloud Run services and workers at runtime"
}

# GitHub Actions deployer — used by CI/CD pipeline
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-deployer"
  display_name = "GitHub Actions Deployer"
  description  = "Used by GitHub Actions CI/CD pipeline to deploy Cloud Run services"
}

# ---------------------------------------------------------------------------
# IAM bindings for GitHub Actions deployer
# ---------------------------------------------------------------------------

locals {
  github_actions_roles = [
    "roles/run.admin",               # Deploy Cloud Run services
    "roles/artifactregistry.writer", # Push Docker images
    "roles/cloudsql.client",         # Run migrations via Cloud SQL
    "roles/secretmanager.viewer",    # Read secret metadata
    "roles/iam.serviceAccountUser",  # Act as runtime SA
  ]
}

resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset(local.github_actions_roles)
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.github_actions.email}"
}

# ---------------------------------------------------------------------------
# IAM bindings for the runtime service account
# ---------------------------------------------------------------------------

locals {
  compute_roles = [
    "roles/cloudsql.client",              # Connect to Cloud SQL
    "roles/secretmanager.secretAccessor", # Read secrets at runtime
    "roles/pubsub.publisher",             # Publish events to topics
    "roles/pubsub.subscriber",            # Consume from subscriptions
  ]
}

resource "google_project_iam_member" "compute_roles" {
  for_each = toset(local.compute_roles)
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.compute.email}"
}

# ---------------------------------------------------------------------------
# Artifact Registry — grant deployer push access to the specific repo
# ---------------------------------------------------------------------------

resource "google_artifact_registry_repository_iam_member" "github_actions_push" {
  location   = var.region
  repository = google_artifact_registry_repository.padel_api.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.github_actions.email}"
}
