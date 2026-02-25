import json
from google.cloud import pubsub_v1
from app.core.config import get_settings

settings = get_settings()
publisher = pubsub_v1.PublisherClient()


def publish_event(topic_name: str, event_type: str, payload: dict) -> None:
    """Publish an event to a Pub/Sub topic."""
    topic_path = publisher.topic_path(settings.PUBSUB_PROJECT_ID, topic_name)
    message = {
        "event_type": event_type,
        "payload": payload,
    }
    data = json.dumps(message).encode("utf-8")
    future = publisher.publish(topic_path, data=data, event_type=event_type)
    future.result()


def publish_booking_event(event_type: str, payload: dict) -> None:
    publish_event(settings.PUBSUB_TOPIC_BOOKING_EVENTS, event_type, payload)


def publish_payment_event(event_type: str, payload: dict) -> None:
    publish_event(settings.PUBSUB_TOPIC_PAYMENT_EVENTS, event_type, payload)


def publish_notification_event(event_type: str, payload: dict) -> None:
    publish_event(settings.PUBSUB_TOPIC_NOTIFICATION_EVENTS, event_type, payload)
