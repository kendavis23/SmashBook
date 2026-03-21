# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

SmashBook is a **multi-tenant SaaS platform for padel club management**. Padel clubs are the tenants. The long-term vision is AI-driven autonomous club operations. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture document.

## Commands

### Local Development

```bash
# Start API + Postgres (runs migrations automatically on startup)
docker compose up

# API:      http://localhost:8080
# Docs:     http://localhost:8080/api/v1/docs
# Database: localhost:5432  (user: padel_user, pass: padel_pass, db: padel_db)
```

### Backend (run from `backend/`)

```bash
# Activate virtualenv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Create a new migration (after editing models)
alembic revision --autogenerate -m "description"

# Run the dev server directly (without Docker)
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload

# Run all tests
pytest

# Run a single test file
pytest tests/unit/test_tenant_middleware.py

# Run a single test by name
pytest tests/unit/test_tenant_middleware.py::test_resolve_by_x_tenant_id_header

# Seed local database
python scripts/seed_local.py
```

## Architecture

### Multi-Tenancy (most important concept)

The tenant hierarchy is: `subscription_plans → tenants → clubs → (courts, bookings, players, staff)`.

- **Tenant resolution** happens in `app/middleware/tenant.py` on every request, setting `request.state.tenant` and the `current_tenant_id` ContextVar. Resolution priority: `X-Tenant-ID` header → `X-Tenant-Subdomain` header → host subdomain (`club.smashbook.app`) → custom domain.
- **Tenant isolation is enforced in the service layer**, not via database RLS. Every service method receives `club_id` from auth context and always filters by it (ADR-006).
- For local dev, use the `X-Tenant-Subdomain` header since `localhost` bypasses host-based resolution.
- **`TenantScopedMixin`** marks models with a direct `tenant_id` column — use `tenant_clause(Model, tenant_id)` from `app/db/session.py` for these. Models scoped transitively via `club_id → clubs.tenant_id` (Court, Booking, etc.) must join through Club instead.

### Request Flow

```
Client → TenantMiddleware → CORS → FastAPI route
       → Depends(get_tenant), Depends(get_db), Depends(current_user)
       → service class (business logic + club_id scoping)
       → SQLAlchemy model → PostgreSQL
```

### Database Sessions

Two engines exist: primary read/write (`get_db`) and read replica (`get_read_db`). Use `get_read_db` for GET endpoints and report queries. Both are in `app/db/session.py`.

### Pub/Sub Event Pattern

Async work (notifications, AI pipeline) is triggered via helpers in `app/core/pubsub.py`. Workers in `app/workers/` consume these events as separate Cloud Run services built from the same Docker image (`Dockerfile.worker`) with different CMD overrides at deploy time.

### AI Layer (future phases)

All AI calls must go through `ai_inference_service.py`, which handles: feature flag gating, input deduplication/caching, provider calls with retry, and inference logging to `ai_inference_log`. Dynamic pricing is the only synchronous AI call (blocks the booking request); everything else is async via Pub/Sub. AI features are gated per-tenant via flags on `subscription_plans`. Provider rule: language generation → Anthropic Claude; structured ML/prediction → Vertex AI; semantic search → pgvector on the same Cloud SQL instance.

### Auth

JWT dual-token pattern (access token 60 min, refresh token 30 days). Tokens carry `user_id`, `club_id`, `role`, and `tenant_id` claims. Role enforcement via `require_role()` FastAPI dependencies. Roles: `player`, `viewer`, `staff`, `trainer`, `ops_lead`, `admin`, `owner`.

## Key Files

| Concern | Location |
|---------|----------|
| App settings / env vars | `app/core/config.py` |
| Tenant middleware | `app/middleware/tenant.py` |
| Tenant dependency (for endpoints) | `app/api/v1/dependencies/tenant.py` |
| DB session factories | `app/db/session.py` |
| ORM models | `app/db/models/` |
| Pub/Sub publisher | `app/core/pubsub.py` |

## Environment Variables

Defined in `backend/app/core/config.py` via pydantic-settings. For local dev, create `backend/.env` (gitignored). Required: `SECRET_KEY`, `DATABASE_URL`, `DATABASE_READ_REPLICA_URL`, `PUBSUB_PROJECT_ID`, `GCS_BUCKET_VIDEOS`, `GCS_BUCKET_INVOICES`, `GCS_PROJECT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PLATFORM_API_KEY`, `SENDGRID_API_KEY`, `FIREBASE_PROJECT_ID`.

## Documentation Standards

### Timestamps

Every file in `docs/` must have a `_Last updated: YYYY-MM-DD HH:MM UTC_` line at the very top (line 1), before the title. Update this timestamp whenever you modify the file.

Example:
```
_Last updated: 2026-03-21 14:00 UTC_

# Document Title
```

### When to Update Docs

After any significant change, update the relevant `docs/` file(s) before finishing the task. Significant changes include:

- New or removed API endpoints
- Schema / data model changes (models, migrations)
- Architecture decisions (new services, patterns, integrations)
- Auth or tenant-isolation changes
- New environment variables or config options
- Changes to the deployment or worker setup

If no single existing doc covers the change, add a note to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
