# ─── Backend Bucket (CDN-enabled) ─────────────────────────────────────────────
resource "google_compute_backend_bucket" "frontend" {
  name        = "${replace(var.bucket_name, "_", "-")}-backend"
  project     = var.project_id
  bucket_name = var.bucket_name
  enable_cdn  = true

  cdn_policy {
    cache_mode                   = var.cdn_cache_mode
    client_ttl                   = 3600
    default_ttl                  = 3600
    max_ttl                      = 86400
    negative_caching             = true
    serve_while_stale            = 86400
    cache_key_policy {
      include_http_headers       = []
      query_string_whitelist     = []
    }
  }
}

# ─── URL Map (serves backend bucket — used for HTTPS in prod, HTTP in staging) ─
resource "google_compute_url_map" "frontend_https" {
  name            = "${replace(var.bucket_name, "_", "-")}-url-map"
  project         = var.project_id
  default_service = google_compute_backend_bucket.frontend.self_link
}

# ─── HTTP → HTTPS Redirect URL Map (production only) ─────────────────────────
resource "google_compute_url_map" "http_redirect" {
  count   = var.dns_config ? 1 : 0
  name    = "${replace(var.bucket_name, "_", "-")}-http-redirect"
  project = var.project_id

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}
