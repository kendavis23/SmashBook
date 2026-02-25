variable "project_id" { type = string }
variable "region" { type = string }

resource "google_compute_network" "vpc" {
  name                    = "padel-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "padel-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# Private service access for Cloud SQL
resource "google_compute_global_address" "private_ip_range" {
  name          = "padel-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

output "vpc_id" {
  value = google_compute_network.vpc.self_link
}
