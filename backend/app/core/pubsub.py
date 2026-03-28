import json
from google.cloud import pubsub_v1
from app.core.config import get_settings

settings = get_settings()

_publisher = None

def get_publisher() -> pubsub_v1.PublisherClient:
    """Lazy-initialise the Pub/Sub publisher — avoids credential errors at import time."""
    global _publisher
    if _publisher is None:
        _publisher = pubsub_v1.PublisherClient()
    return _publisher

def publish_event(topic_name: str, event_type: str, payload: dict) -> None:
    """Publish an event to a Pub/Sub topic."""
    publisher = get_publisher()
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