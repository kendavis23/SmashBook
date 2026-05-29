# ---------------------------------------------------------------------------
# Serverless VPC Access Connector
#
# Lets Cloud Run services reach internal-only resources (e.g. future Cloud SQL
# private IP). With `egress = "PRIVATE_RANGES_ONLY"` on each Cloud Run service,
# only RFC1918 destinations are routed through the connector; public traffic
# continues to leave via the standard Cloud Run network path.
# ---------------------------------------------------------------------------

resource "google_vpc_access_connector" "main" {
  name          = "padel-connector-${var.environment}"
  region        = var.region
  network       = var.network
  ip_cidr_range = var.ip_cidr_range

  machine_type  = "e2-micro"
  min_instances = 2
  max_instances = 3
}
