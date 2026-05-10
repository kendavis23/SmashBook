output "connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "replica_connection_name" {
  value = google_sql_database_instance.replica.connection_name
}
