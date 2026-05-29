variable "region" {
  type = string
}

variable "environment" {
  description = "Environment suffix (staging, prod). Used in the connector name."
  type        = string
}

variable "network" {
  description = "VPC network the connector attaches to. Default GCP network is the only network in the project today."
  type        = string
  default     = "default"
}

variable "ip_cidr_range" {
  description = "/28 CIDR for the connector's reserved range. Must not overlap any subnet in the network."
  type        = string
}
