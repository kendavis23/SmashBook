# ─── Google-Managed SSL Certificate (production only) ────────────────────────
# GCP provisions and auto-renews this certificate once DNS resolves to the LB IP.
# Skipped entirely when dns_config = false (staging — HTTP only).
resource "google_compute_managed_ssl_certificate" "frontend" {
  count   = var.dns_config ? 1 : 0
  name    = "${replace(var.domain, ".", "-")}-ssl-cert"
  project = var.project_id

  managed {
    domains = [var.domain]
  }

  lifecycle {
    create_before_destroy = true
  }
}
