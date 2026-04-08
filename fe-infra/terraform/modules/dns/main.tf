# ─── Managed DNS Zone (optional — set create_zone = true to provision) ────────
# Skipped entirely when dns_config = false (staging).
resource "google_dns_managed_zone" "frontend" {
  count       = (var.dns_config && var.create_zone) ? 1 : 0
  name        = var.dns_zone_name
  project     = var.project_id
  dns_name    = var.dns_zone_dns_name
  description = "Managed zone for ${var.dns_zone_dns_name}"

  dnssec_config {
    state = "on"
  }
}

# ─── A Record → Load Balancer static IP ──────────────────────────────────────
# count = 0 when create_zone=true so Terraform does not refresh against a
# not-yet-existing zone during the first plan. Set create_zone=false on all
# subsequent runs — record sets will then be created normally.
# Also skipped entirely when dns_config = false (staging).
# depends_on the zone resource ensures Terraform deletes records before the zone
# on destroy, preventing 404 errors when the zone is removed first.
resource "google_dns_record_set" "frontend_a" {
  count        = (var.dns_config && !var.create_zone) ? 1 : 0
  name         = "${var.domain}."
  project      = var.project_id
  managed_zone = var.dns_zone_name
  type         = "A"
  ttl          = 300
  rrdatas      = [var.static_ip]

  depends_on = [google_dns_managed_zone.frontend]
}

# ─── www CNAME → apex (optional convenience record) ──────────────────────────
resource "google_dns_record_set" "www_cname" {
  count        = (var.dns_config && !var.create_zone) ? 1 : 0
  name         = "www.${var.domain}."
  project      = var.project_id
  managed_zone = var.dns_zone_name
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["${var.domain}."]

  depends_on = [google_dns_managed_zone.frontend]
}
