variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "name_prefix" {
  description = "Prefix for the SSL certificate resource name (e.g. 'staff', 'player')"
  type        = string
}

variable "origin_cert_pem" {
  description = "Cloudflare Origin Certificate PEM (15-year wildcard *.smashbook.app)"
  type        = string
  sensitive   = true
}

variable "origin_key_pem" {
  description = "Cloudflare Origin Certificate private key PEM"
  type        = string
  sensitive   = true
}
