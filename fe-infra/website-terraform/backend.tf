terraform {
  backend "gcs" {
    bucket = "tf-state-smashbook-488121-website"
    prefix = "website/state"
  }
}
