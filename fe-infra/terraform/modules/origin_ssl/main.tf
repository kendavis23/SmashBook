resource "google_compute_ssl_certificate" "cloudflare_origin" {
  name        = "${var.name_prefix}-cf-origin-cert"
  project     = var.project_id
  certificate = var.origin_cert_pem
  private_key = var.origin_key_pem

  lifecycle {
    create_before_destroy = true
  }
}
