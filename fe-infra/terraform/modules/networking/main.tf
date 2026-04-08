# ─── Global Static IP ─────────────────────────────────────────────────────────
resource "google_compute_global_address" "frontend" {
  name       = "${var.name_prefix}-global-ip"
  project    = var.project_id
  ip_version = "IPV4"
}

# ══════════════════════════════════════════════════════════════════════════════
# PRODUCTION (dns_config = true): HTTPS + HTTP→HTTPS redirect
# ══════════════════════════════════════════════════════════════════════════════

# ─── HTTPS Target Proxy ───────────────────────────────────────────────────────
resource "google_compute_target_https_proxy" "frontend" {
  count            = var.dns_config ? 1 : 0
  name             = "${var.name_prefix}-https-proxy"
  project          = var.project_id
  url_map          = var.url_map_self_link
  ssl_certificates = [var.ssl_cert_self_link]
}

# ─── HTTPS Forwarding Rule (port 443) ────────────────────────────────────────
resource "google_compute_global_forwarding_rule" "https" {
  count                 = var.dns_config ? 1 : 0
  name                  = "${var.name_prefix}-https-forwarding-rule"
  project               = var.project_id
  ip_address            = google_compute_global_address.frontend.address
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL"
  port_range            = "443"
  target                = google_compute_target_https_proxy.frontend[0].self_link
}

# ─── HTTP Target Proxy → redirect to HTTPS (production) ──────────────────────
resource "google_compute_target_http_proxy" "redirect" {
  count   = var.dns_config ? 1 : 0
  name    = "${var.name_prefix}-http-redirect-proxy"
  project = var.project_id
  url_map = var.http_url_map_self_link
}

# ══════════════════════════════════════════════════════════════════════════════
# STAGING (dns_config = false): HTTP only, no SSL, no redirect
# ══════════════════════════════════════════════════════════════════════════════

# ─── HTTP Target Proxy → backend bucket directly (staging) ───────────────────
resource "google_compute_target_http_proxy" "frontend_http" {
  count   = var.dns_config ? 0 : 1
  name    = "${var.name_prefix}-http-proxy"
  project = var.project_id
  url_map = var.url_map_self_link
}

# ══════════════════════════════════════════════════════════════════════════════
# HTTP Forwarding Rule (port 80)
# Production  → redirect proxy  |  Staging → direct HTTP proxy
# ══════════════════════════════════════════════════════════════════════════════
resource "google_compute_global_forwarding_rule" "http" {
  name                  = "${var.name_prefix}-http-forwarding-rule"
  project               = var.project_id
  ip_address            = google_compute_global_address.frontend.address
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL"
  port_range            = "80"
  target = var.dns_config ? (
    google_compute_target_http_proxy.redirect[0].self_link
  ) : (
    google_compute_target_http_proxy.frontend_http[0].self_link
  )
}
