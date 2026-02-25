from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Padel Booking API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database - Cloud SQL (Postgres)
    DATABASE_URL: str                        # Primary (read/write)
    DATABASE_READ_REPLICA_URL: str           # Read replica

    # Pub/Sub
    PUBSUB_PROJECT_ID: str
    PUBSUB_TOPIC_BOOKING_EVENTS: str = "booking-events"
    PUBSUB_TOPIC_PAYMENT_EVENTS: str = "payment-events"
    PUBSUB_TOPIC_NOTIFICATION_EVENTS: str = "notification-events"

    # Cloud Storage
    GCS_BUCKET_VIDEOS: str          # Match video uploads
    GCS_BUCKET_INVOICES: str        # Generated invoice PDFs
    GCS_PROJECT_ID: str

    # Stripe
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    STRIPE_API_VERSION: str = "2024-12-18.acacia"

    # Email
    SENDGRID_API_KEY: str
    SENDGRID_FROM_EMAIL: str = "noreply@padelbooking.app"

    # Push Notifications (Firebase)
    FIREBASE_PROJECT_ID: str
    FIREBASE_CREDENTIALS_PATH: str = "/secrets/firebase-credentials.json"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
