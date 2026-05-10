output "compute_sa_email" {
  value = google_service_account.compute.email
}

output "github_actions_sa_email" {
  value = google_service_account.github_actions.email
}
