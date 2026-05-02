resource "cloudflare_record" "frontend_a" {
  zone_id = var.zone_id
  name    = var.record_name
  type    = "A"
  value   = var.lb_ip
  proxied = true
}
