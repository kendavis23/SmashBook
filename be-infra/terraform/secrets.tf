# ---------------------------------------------------------------------------
# Secret Manager — resource definitions only
# Secret VALUES are never managed by Terraform.
# Set values manually:
#   echo -n "your-value" | gcloud secrets versions add <secret-name> --data-file=-
# ---------------------------------------------------------------------------

locals {
  secrets = [
    "padel-database-url",
    "padel-database-read-replica-url",
    "padel-secret-key",
    "stripe-secret-key",
    "stripe-webhook-secret",
    "sendgrid-api-key",
    "padel-platform-api-key",
  ]
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(local.secrets)
  secret_id = each.key

  replication {
    auto {}
  }
}

# Grant the compute service account access to read all secrets
resource "google_secret_manager_secret_iam_member" "compute_access" {
  for_each  = toset(local.secrets)
  secret_id = google_secret_manager_secret.secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.compute.email}"
}
