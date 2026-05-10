output "secret_ids" {
  description = "Map of secret name to Secret Manager secret_id"
  value       = { for k, v in google_secret_manager_secret.secrets : k => v.secret_id }
}
