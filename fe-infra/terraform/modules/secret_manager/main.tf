# ─── Enable Secret Manager API ────────────────────────────────────────────────
resource "google_project_service" "secretmanager" {
  project            = var.project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# ─── Helper locals ────────────────────────────────────────────────────────────
locals {
  secrets = {
    FRONTEND_WEB_STAFF_API_BASE_URL    = var.staff_api_base_url
    FRONTEND_WEB_STAFF_BUCKET          = var.staff_bucket_name
    FRONTEND_WEB_STAFF_SITE_URL        = var.staff_site_url
    FRONTEND_WEB_PLAYER_API_BASE_URL   = var.player_api_base_url
    FRONTEND_WEB_PLAYER_BUCKET         = var.player_bucket_name
    FRONTEND_WEB_PLAYER_SITE_URL       = var.player_site_url
  }
}

# ─── Create secrets ───────────────────────────────────────────────────────────
resource "google_secret_manager_secret" "frontend" {
  for_each  = local.secrets
  project   = var.project_id
  secret_id = each.key

  replication {
    auto {}
  }

  labels = {
    managed-by  = "terraform"
    environment = var.environment
  }

  depends_on = [google_project_service.secretmanager]
}

# ─── Store secret versions (the actual values) ────────────────────────────────
resource "google_secret_manager_secret_version" "frontend" {
  for_each    = local.secrets
  secret      = google_secret_manager_secret.frontend[each.key].id
  secret_data = each.value
}
