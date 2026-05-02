# Cloud CDN is NOT used — Cloudflare handles all CDN responsibilities.
# The backend bucket has CDN disabled; Cloud Armor is attached to block
# non-Cloudflare traffic directly at the edge.

resource "google_compute_backend_bucket" "frontend" {
  name        = "${replace(var.bucket_name, "_", "-")}-backend"
  project     = var.project_id
  bucket_name = var.bucket_name
  enable_cdn  = false

  edge_security_policy = var.armor_policy_self_link
}

# ─── HTTPS URL Map ────────────────────────────────────────────────────────────
resource "google_compute_url_map" "frontend_https" {
  name            = "${replace(var.bucket_name, "_", "-")}-url-map"
  project         = var.project_id
  default_service = google_compute_backend_bucket.frontend.self_link
}

# ─── HTTP → HTTPS Redirect URL Map ───────────────────────────────────────────
resource "google_compute_url_map" "http_redirect" {
  name    = "${replace(var.bucket_name, "_", "-")}-http-redirect"
  project = var.project_id

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}
