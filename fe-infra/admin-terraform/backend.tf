terraform {
  backend "gcs" {
    bucket = "tf-state-smashbook-488121-admin"
    prefix = "admin/state"
  }
}
