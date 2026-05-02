# Cloud Armor policy — allow only Cloudflare edge IPs, deny everything else.
# Full IP list: https://www.cloudflare.com/ips/
# GCP limits src_ip_ranges to 10 per rule, so Cloudflare IPs are split across three rules.
resource "google_compute_security_policy" "cloudflare_only" {
  name    = "cloudflare-only"
  project = var.project_id
  type    = "CLOUD_ARMOR_EDGE"

  rule {
    priority    = 1000
    action      = "allow"
    description = "Allow Cloudflare edge IPs (batch 1/3)"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = [
          "173.245.48.0/20",
          "103.21.244.0/22",
          "103.22.200.0/22",
          "103.31.4.0/22",
          "141.101.64.0/18",
          "108.162.192.0/18",
          "190.93.240.0/20",
          "188.114.96.0/20",
          "197.234.240.0/22",
          "198.41.128.0/17",
        ]
      }
    }
  }

  rule {
    priority    = 1001
    action      = "allow"
    description = "Allow Cloudflare edge IPs (batch 2/3)"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = [
          "162.158.0.0/15",
          "104.16.0.0/13",
          "104.24.0.0/14",
          "172.64.0.0/13",
          "131.0.72.0/22",
          "2400:cb00::/32",
          "2606:4700::/32",
          "2803:f800::/32",
          "2405:b500::/32",
          "2405:8100::/32",
        ]
      }
    }
  }

  rule {
    priority    = 1002
    action      = "allow"
    description = "Allow Cloudflare edge IPs (batch 3/3)"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = [
          "2a06:98c0::/29",
          "2c0f:f248::/32",
        ]
      }
    }
  }

  rule {
    priority    = 2147483647
    action      = "deny(403)"
    description = "Deny all non-Cloudflare traffic"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}
