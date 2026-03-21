"""
conftest.py — set required env vars before any app module is imported.

pydantic-settings validates ALL required fields at import time when
app.core.security (and others) call get_settings() at module level.
Setting os.environ here runs before pytest collects test modules.
"""
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5433/test")
os.environ.setdefault("DATABASE_READ_REPLICA_URL", "postgresql+asyncpg://test:test@localhost:5433/test")
os.environ.setdefault("PUBSUB_PROJECT_ID", "test-project")
os.environ.setdefault("GCS_BUCKET_VIDEOS", "test-videos-bucket")
os.environ.setdefault("GCS_BUCKET_INVOICES", "test-invoices-bucket")
os.environ.setdefault("GCS_PROJECT_ID", "test-project")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test_dummy")
os.environ.setdefault("PLATFORM_API_KEY", "test-platform-key")
os.environ.setdefault("SENDGRID_API_KEY", "SG.test_dummy")
os.environ.setdefault("FIREBASE_PROJECT_ID", "test-firebase-project")
