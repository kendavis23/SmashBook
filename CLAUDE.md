# CLAUDE.md

# 21 March, 2026

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

SmashBook is a **multi-tenant SaaS platform for padel club management**. Tenants are organisations (club operators) that sign up with SmashBook — a tenant may operate one or more clubs. The long-term vision is AI-driven autonomous club operations. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture document.

**Stack:** FastAPI (backend), PostgreSQL + pgvector (Cloud SQL), SQLAlchemy 2.x (async), Alembic (migrations), Cloud Run, Pub/Sub, Stripe Connect, Anthropic Claude API, Vertex AI, React (staff portal + player web), React Native/Expo (mobile), Docker Compose (local dev), GitHub Actions (CI/CD), Terraform (infra).

**Repo layout:**
```
backend/
  app/
    api/v1/endpoints/       # one file per domain
    db/
      models/               # SQLAlchemy ORM models — edit these for schema changes
      migrations/versions/  # Alembic migration files — never edit manually
    services/               # business logic, one class per domain
    middleware/             # TenantMiddleware, auth
    schemas/                # Pydantic request/response models
    core/                   # config, pubsub, security
    workers/                # Cloud Run worker entry points (Pub/Sub consumers)
  tests/
    unit/
    integration/
docs/
  DATA_MODEL.md              # current live database state — always accurate
  DATA_MODEL_TARGET_STATE.md # target state — the migration blueprint
  ARCHITECTURE.md
  DEPLOYMENT.md
  API_TESTING.md
```

---

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

---

## Architecture

### Multi-Tenancy (most important concept)

The tenant hierarchy is: `subscription_plans → tenants → clubs → (courts, bookings, players, staff)`.

- **Tenants are organisations**, not individual clubs. A single tenant may operate multiple clubs under one subscription. Stripe billing, feature flags, and subscription limits are all at the tenant level.
- **Clubs are the operational root.** Almost all queries are scoped to `club_id`. A player at Club A has no visibility into Club B, even if the same `user_id` exists in both clubs.
- **Tenant resolution** happens in `app/middleware/tenant.py` on every request, setting `request.state.tenant` and the `current_tenant_id` ContextVar. Resolution priority: `X-Tenant-ID` header → `X-Tenant-Subdomain` header → host subdomain (`club.smashbook.app`) → custom domain.
- **Tenant isolation is enforced in the service layer**, not via database RLS. Every service method receives `club_id` from auth context and always filters by it (ADR-006).
- For local dev, use the `X-Tenant-Subdomain` header since `localhost` bypasses host-based resolution.
- **`TenantScopedMixin`** marks models with a direct `tenant_id` column — use `tenant_clause(Model, tenant_id)` from `app/db/session.py` for these. Models scoped transitively via `club_id → clubs.tenant_id` (Court, Booking, etc.) must join through Club instead.

```python
# Always scope queries by club_id — never fetch operational data without it
def get_bookings(db: Session, club_id: UUID, ...) -> list[Booking]:
    return db.query(Booking).filter(
        Booking.club_id == club_id,  # always present
        ...
    ).all()
```

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

### AI Layer

All AI calls must go through `ai_inference_service.py`, which handles:
1. **Feature flag check** — reads `ai_feature_flags` table; returns fallback immediately if disabled for this tenant.
2. **Input deduplication** — SHA-256 hashes the input; skips the model call on cache hit.
3. **Provider call with retry** — Anthropic or Vertex AI, with exponential backoff.
4. **Inference logging** — writes to `ai_inference_log` before returning, always, including on fallback.

**Provider assignment:**
- Anthropic Claude API → anything that produces natural language (notification copy, summaries, re-engagement drafts, conversational booking, chatbot responses)
- Vertex AI → anything that produces a number or classification (price multiplier, churn score, demand forecast, anomaly flag, skill delta)
- pgvector on Cloud SQL → matchmaking and Fill the Court similarity search (`embedding` column on `player_profiles`)

**Fallback required:** Every AI feature must have a non-AI fallback. If dynamic pricing is unavailable, return `price_per_slot` from `pricing_rules`. If matchmaking fails, proceed without player suggestions. `fallback_used` on `ai_inference_log` records which path ran.

Dynamic pricing is the only **synchronous** AI call (blocks the booking request). Everything else is async via Pub/Sub. AI features are gated per-tenant via flags on `subscription_plans` (plan-level) and `ai_feature_flags` (runtime override).

### Auth

JWT dual-token pattern (access token 60 min, refresh token 30 days). Tokens carry `user_id`, `club_id`, `role`, and `tenant_id` claims. Role enforcement via `require_role()` FastAPI dependencies. Roles: `player`, `viewer`, `staff`, `trainer`, `ops_lead`, `admin`, `owner`.

---

## The Two Data Model Files

These two files together define the full schema lifecycle. Understanding the distinction between them is essential.

### `docs/DATA_MODEL.md`
- **Is:** An exact description of the database as it exists right now — every table, column, enum, and index that has been successfully migrated and verified.
- **Updated:** Only after a migration has been applied and verified locally. Never ahead of a migration.

### `docs/DATA_MODEL_TARGET_STATE.md`
- **Is:** The complete target schema across all sprints. Every table, column, enum, and index SmashBook will eventually need. Columns not yet in the database are marked `**NEW**`. Migration groups (G1–G12) label every change with the sprint that first needs it.
- **Updated:** When new user stories require schema changes, or the target design evolves.
- **Not the database** — nothing in this file exists in Postgres until a migration is written and applied.

**The diff between the two files is the migration backlog.** When starting work on a sprint, read the relevant migration group from `DATA_MODEL_TARGET_STATE.md`, implement those changes, then update `DATA_MODEL.md` to match.

---

## Database Change Workflow

Always follow this order exactly — no shortcuts:

```
1. Read DATA_MODEL_TARGET_STATE.md for the target definition
2. Edit backend/app/db/models/<model>.py
3. cd backend && alembic revision --autogenerate -m "short_description"
4. Review the generated migrations/versions/ file carefully —
   fix enum creation order, partitioning, server_defaults before proceeding
5. alembic upgrade head
6. alembic downgrade -1 && alembic upgrade head  (verify both directions)
7. Update docs/DATA_MODEL.md to reflect the applied change
8. Commit model file + migration file + updated DATA_MODEL.md together
```

**Never:**
- Modify the database directly (no manual `ALTER TABLE`)
- Apply a migration without reviewing the generated file first
- Update `DATA_MODEL.md` before the migration is applied and verified
- Commit a model change without its migration, or a migration without its model change

---

## Alembic — Common Gotchas

**New enum types** must be created before the column that uses them:
```python
from sqlalchemy.dialects import postgresql

def upgrade():
    my_enum = postgresql.ENUM('val1', 'val2', name='myenumname')
    my_enum.create(op.get_bind())
    op.add_column('table', sa.Column('col',
        sa.Enum('val1', 'val2', name='myenumname'), nullable=True))

def downgrade():
    op.drop_column('table', 'col')
    op.execute('DROP TYPE IF EXISTS myenumname')
```

**pgvector** requires the extension before creating `player_profiles.embedding`:
```python
op.execute("CREATE EXTENSION IF NOT EXISTS vector")
```
Also requires `cloudsql.enable_pgvector = on` in Cloud SQL flags before the migration runs.

**`ai_inference_log`** must be range-partitioned by `created_at` month. Autogenerate won't produce the partition DDL — write it manually in the migration.

**Non-nullable columns on existing tables** must have a `server_default` in the migration even if the model marks them `nullable=False`:
```python
op.add_column('users', sa.Column('is_suspended', sa.Boolean(),
    nullable=False, server_default='false'))
```

---

## Testing

Integration tests use a separate Docker Postgres instance at `postgresql://test:test@localhost/test`:

```bash
docker run -d --name smashbook-test-db \
  -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test \
  -p 5432:5432 postgres:16
```

Run tests:
```bash
cd backend
.venv/bin/python -m pytest tests/integration/ -v
# Stop at first failure:
.venv/bin/python -m pytest tests/integration/ -v -x
# Single test:
.venv/bin/python -m pytest tests/integration/test_auth.py::TestLogin::test_success -v -s
```

The suite uses `httpx.AsyncClient` with `ASGITransport` — no server process needed. `TenantMiddleware` runs in-process, so seed fixtures must **commit** their data (not just flush) to be visible to the middleware's independent session.

Every new endpoint needs at minimum:
1. Role enforcement test — 403 for the wrong role
2. Tenant isolation test — 401 when token `tenant_id` ≠ `X-Tenant-ID` header
3. Happy path test — correct status code and response shape

---

## Sprint Structure

Migration groups in `DATA_MODEL_TARGET_STATE.md` map to sprints. Implement the group before starting that sprint's feature work.

| Sprints | Phase | Focus | Migration groups |
|---|---|---|---|
| 1–2 | MVP | Auth, tenant/club setup, court discovery | G1, G2 |
| 3–4 | MVP | Core booking flow, payments, wallet | G3, G4 |
| 5–6 | MVP | Staff admin, reservations, reporting, support, discounts | G5, G6 |
| 7–8 | Phase 1 AI | Dynamic pricing, gap detection, smart notifications, autonomous finance | G7, G8 |
| 9 | Phase 2 AI | Matchmaking, Fill the Court, cancellation prediction, skill ELO | G9 |
| 10 | Phase 2 AI | Churn scoring, segmentation, campaigns, operational AI | G10 |
| 11 | Phase 3 AI | Conversational booking, AI support chatbot | G11 |
| 12 | Phase 3 AI | Video analysis, training recommendations, market intelligence | G12 |

---

## Key Files

| Concern | Location |
|---|---|
| App settings / env vars | `app/core/config.py` |
| Tenant middleware | `app/middleware/tenant.py` |
| Tenant dependency (for endpoints) | `app/api/v1/dependencies/tenant.py` |
| Auth dependency | `app/api/v1/dependencies/auth.py` |
| DB session factories | `app/db/session.py` |
| ORM models | `app/db/models/` |
| Pub/Sub publisher | `app/core/pubsub.py` |
| Current DB state | `docs/DATA_MODEL.md` |
| Target DB state | `docs/DATA_MODEL_TARGET_STATE.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Deployment runbook | `docs/DEPLOYMENT.md` |
| Integration test docs | `docs/API_TESTING.md` |

---

## Environment Variables

Defined in `backend/app/core/config.py` via pydantic-settings. For local dev, create `backend/.env` (gitignored). Required: `SECRET_KEY`, `DATABASE_URL`, `DATABASE_READ_REPLICA_URL`, `PUBSUB_PROJECT_ID`, `GCS_BUCKET_VIDEOS`, `GCS_BUCKET_INVOICES`, `GCS_PROJECT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PLATFORM_API_KEY`, `SENDGRID_API_KEY`, `FIREBASE_PROJECT_ID`.

---

## Documentation Standards

### Timestamps

Every file in `docs/` must have a `_Last updated: YYYY-MM-DD HH:MM UTC_` line at the very top (line 1), before the title. Update this timestamp whenever you modify the file.

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

### Tracking Implemented APIs

`docs/IMPLEMENTED_API.md` is the authoritative list of working endpoints. **Update it every time an endpoint moves from stub (`pass`) to implemented.** Steps:

1. Move the endpoint from the "Not Yet Implemented" table into its domain section.
2. Update the `_Last updated` timestamp on line 1 to the current UTC date/time.

Never leave `IMPLEMENTED_API.md` out of sync with the code after completing an endpoint.
