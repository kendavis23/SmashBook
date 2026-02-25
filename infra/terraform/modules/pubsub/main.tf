variable "project_id" { type = string }

resource "google_pubsub_topic" "booking_events" {
  name                       = "booking-events"
  message_retention_duration = "86600s"
}

resource "google_pubsub_topic" "payment_events" {
  name                       = "payment-events"
  message_retention_duration = "86600s"
}

resource "google_pubsub_topic" "notification_events" {
  name                       = "notification-events"
  message_retention_duration = "86600s"
}

# Push subscriptions are added post-deploy once Cloud Run URLs are known.
# See scripts/setup-pubsub-subscriptions.sh

output "topic_names" {
  value = {
    booking_events      = google_pubsub_topic.booking_events.name
    payment_events      = google_pubsub_topic.payment_events.name
    notification_events = google_pubsub_topic.notification_events.name
  }
}
