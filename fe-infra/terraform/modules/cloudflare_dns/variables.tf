variable "zone_id" {
  description = "Cloudflare Zone ID for smashbook.app"
  type        = string
  sensitive   = true
}

variable "record_name" {
  description = "DNS record name without domain suffix (e.g. 'staff', 'app', 'ace-staging')"
  type        = string
}

variable "lb_ip" {
  description = "GCP load balancer static IP address"
  type        = string
}
