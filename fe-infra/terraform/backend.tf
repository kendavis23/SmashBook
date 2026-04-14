terraform {
  backend "gcs" {
    bucket = "tf-state-smashbook-488121-frontend"
    prefix = "frontend/state"
  }
}
