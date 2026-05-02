# ─── Global Static IP ─────────────────────────────────────────────────────────
resource "google_compute_global_address" "frontend" {
  name       = "${var.name_prefix}-global-ip"
  project    = var.project_id
  ip_version = "IPV4"
}

# ─── HTTPS Target Proxy ───────────────────────────────────────────────────────
resource "google_compute_target_https_proxy" "frontend" {
  name             = "${var.name_prefix}-https-proxy"
  project          = var.project_id
  url_map          = var.url_map_self_link
  ssl_certificates = [var.ssl_cert_self_link]
}

# ─── HTTPS Forwarding Rule (port 443) ────────────────────────────────────────
resource "google_compute_global_forwarding_rule" "https" {
  name                  = "${var.name_prefix}-https-forwarding-rule"
  project               = var.project_id
  ip_address            = google_compute_global_address.frontend.address
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL"
  port_range            = "443"
  target                = google_compute_target_https_proxy.frontend.self_link
}

# ─── HTTP → HTTPS Redirect (port 80) ─────────────────────────────────────────
resource "google_compute_target_http_proxy" "redirect" {
  name    = "${var.name_prefix}-http-redirect-proxy"
  project = var.project_id
  url_map = var.http_url_map_self_link
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "${var.name_prefix}-http-forwarding-rule"
  project               = var.project_id
  ip_address            = google_compute_global_address.frontend.address
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL"
  port_range            = "80"
  target                = google_compute_target_http_proxy.redirect.self_link
}
