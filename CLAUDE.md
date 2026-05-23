# CLAUDE.md

_Last updated: 2026-05-23_

> **Maintenance rule:** Whenever this file is updated, bump the `_Last updated:_` line above to today's date. This file is the AI-assistant entry point — staleness here cascades into stale assumptions everywhere downstream. Treat the timestamp as part of the change, not an afterthought.

> **Working in `backend/app/ai/` or `backend/app/analytics/`?** Each of those subtrees has its own `CLAUDE.md` with domain-specific rules (provider routing, fallback contracts, read-replica usage, materialized view policy) and a local `docs/` folder. Those files layer on top of this one — read both.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope Restrictions

**The following directories are owned by a partner and must not be modified:**
- `/frontend`
- `/mobile`
- `/fe-intra`

All other directories, including the root and `/backend`, are in scope.

## What This Project Is

SmashBook is a **multi-tenant SaaS platform for padel club management**. Tenants are organisations (club operators) that sign up with SmashBook — a tenant may operate one or more clubs. The long-term vision is AI-driven autonomous club operations. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture document.

**Stack:** FastAPI (backend), PostgreSQL + pgvector (Cloud SQL), SQLAlchemy 2.x (async), Alembic (migrations), Cloud Run, Pub/Sub, Stripe Connect, Anthropic Claude API, Vertex AI, React (staff portal + player web), React Native/Expo (mobile), Docker Compose (local dev), GitHub Actions (CI/CD), Terraform (infra).

**Repo layout:**
```
backend/
  app/
    # Operational domain (Sprints 1-6) — bookings, payments, auth, messaging, etc.
    api/v1/endpoints/       # one file per operational concern
    services/               # operational business logic
    workers/                # operational Pub/Sub consumers (email, notifications)
    schemas/                # operational Pydantic models

    # AI domain (Sprints 7-12) — see app/ai/CLAUDE.md
    ai/
      api/                  # endpoint modules + ai_router aggregator
      services/             # ai_inference_service + feature services
      workers/              # async AI workers (inference, embeddings)
      schemas/
      tests/
      docs/                 # PROVIDER_ROUTING, FALLBACK_CATALOG, etc.

    # Analytics domain — see app/analytics/CLAUDE.md
    analytics/
      api/                  # endpoint modules + analytics_router aggregator
      services/             # aggregations, rollups
      workers/              # scheduled jobs (view refresh, exports)
      schemas/
      tests/
      docs/                 # REPORT_CATALOG, MATERIALIZED_VIEWS, QUERY_PATTERNS

    # Shared (always relevant, stable)
    db/
      models/               # ALL SQLAlchemy models — operational + AI + analytics
      migrations/versions/  # Alembic migration files — never edit manually
    middleware/             # TenantMiddleware, auth
    core/                   # config, pubsub, security, stripe_clients

  tests/
    unit/
    integration/

docs/                       # cross-cutting docs only — domain-local docs live in app/<domain>/docs/
  DATA_MODEL.md              # current live database state — always accurate
  DATA_MODEL_TARGET_STATE.md # target state — the migration blueprint
  ARCHITECTURE.md
  DEPLOYMENT.md
  API_TESTING.md
  INFRASTRUCTURE.md
  IMPLEMENTED_API.md
```

**Where to put new code:**
- AI feature (anything calling Anthropic / Vertex / pgvector, or that needs `ai_inference_log`) → `app/ai/`
- Report, dashboard, export, scheduled aggregation → `app/analytics/`
- Everything else (booking, payment, auth, messaging, staff, etc.) → existing operational tree
- SQLAlchemy models, regardless of domain → `app/db/models/` (single source of truth)

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

Dynamic pricing is the only **synchronous** AI call (blocks the booking request). Everything else is async via Pub/Sub. **AI features are gated per-tenant via the `ai_feature_flags` table only.** Plan-level defaults are seeded as rows into `ai_feature_flags` when a tenant is provisioned (one row per AI feature, `is_enabled` set from the plan default). `subscription_plans` does **not** carry AI feature flag columns — it carries only non-AI flags (clubs/courts/staff caps, `tournaments_enabled`, `messaging_enabled`, etc.). When toggling an AI feature for a tenant, write to `ai_feature_flags`, never to `subscription_plans`.

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

**Migration group status:** `DATA_MODEL_TARGET_STATE.md` has a Status column in its migration backlog table. When you apply a migration, update both `DATA_MODEL.md` (add the migration row) **and** flip the Status to ✅ in `DATA_MODEL_TARGET_STATE.md`. If the migration is run but the docs haven't caught up, the group is 🚧 — it is not ✅ until both files reflect reality.

---

## Target State Design Decisions (May 2026 simplification)

The target state was simplified in May 2026 to remove ~7 tables and avoid over-engineering before real customer demand reveals what's actually needed. **These are deliberate non-decisions** — when you encounter a use case that *seems* to call for one of the dropped tables, re-read this section before reintroducing it.

**Merged / dropped tables, and where their concerns now live:**

- **`notification_deliveries` + `campaign_deliveries` → `message_deliveries`.** One unified delivery table with `source` enum (`template`, `campaign`) and nullable FKs to both `template_id` and `campaign_id`. All inbox queries, open/click/conversion analytics, and per-campaign rollups go through this single table.
- **`chat_threads` + `chat_messages` dropped.** Support tickets and casual player↔club chat are the same domain. `support_tickets` carries a `category` enum (`support`, `chat`, `booking_inquiry`); `support_messages` carries `intent`, `booking_id`, and `ai_inference_id` for chat use cases. One inbox, one query path.
- **`membership_perks` dropped.** Perks (`discount_pct`, `booking_credits_per_period`, `guest_passes_per_period`, `priority_booking_days`, `max_active_members`, `trial_days`) remain as columns on `membership_plans`. Don't add a perks table until a customer asks for a perk that can't be expressed in a column. `membership_plan_pricing` is kept — multiple billing intervals per plan is a real need.
- **`player_segments` + `player_segment_memberships` + `campaign_messages` dropped.** Campaigns is now a single table with a `target_filter` JSONB (saved query). Structured player segmentation gets reintroduced post-revenue when real clubs reveal what they want to segment by.
- **`tournament_matches` dropped.** A tournament match is a `bookings` row with `booking_type = 'tournament'`, a `tournament_id` FK, and optional `tournament_round` / `tournament_match_label` fields. Players (and doubles partners) go in `booking_players` with a new nullable `team` enum. Scores go in `match_results`.

**Architectural decisions held open:**

- **`ai_recommendations` table design** is deferred to Sprint 10. Two options on the table: (1) thin inbox row that links via `source_event_id` to feature-specific tables (`gap_detection_events`, `cancellation_predictions`, etc.) that already own the structured data — recommended; or (2) unified table with a smaller (3–4 value) recommendation domain enum. Don't bake either into code without revisiting this decision at Sprint 10 kickoff. See the architectural note at the top of `DATA_MODEL_TARGET_STATE.md` for full context.

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
   (add a row to the Database Migrations table at the bottom)
8. Update docs/DATA_MODEL_TARGET_STATE.md — flip the migration group's
   Status to ✅ Applied (with the migration revision ID)
9. Bump the "_Last updated:_" line on both docs to today's date
10. Commit model file + migration file + both updated docs together
```

**Never:**
- Modify the database directly (no manual `ALTER TABLE`)
- Apply a migration without reviewing the generated file first
- Update `DATA_MODEL.md` before the migration is applied and verified
- Commit a model change without its migration, or a migration without its model change
- **Write migration files by hand** — always use `alembic revision --autogenerate`. Hand-writing revision IDs or `down_revision` values causes duplicate-head errors and broken chains. Before creating any migration, run `alembic heads` to confirm a single head exists.

**Useful state commands (run from `backend/`):**
```bash
alembic current    # revision the DB is currently on
alembic heads      # should always show exactly one head
alembic history    # full revision lineage
alembic check      # warns if models are ahead of the latest migration
```

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
  -p 5432:5432 postgres:18
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

Defined in `backend/app/core/config.py` via pydantic-settings. For local dev, create `backend/.env` (gitignored). Required: `SECRET_KEY`, `DATABASE_URL`, `DATABASE_READ_REPLICA_URL`, `PUBSUB_PROJECT_ID`, `GCS_BUCKET_VIDEOS`, `GCS_BUCKET_INVOICES`, `GCS_PROJECT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_BILLING_SECRET_KEY`, `STRIPE_BILLING_WEBHOOK_SECRET`, `PLATFORM_API_KEY`, `SENDGRID_API_KEY`, `FIREBASE_PROJECT_ID`, `APP_BASE_URL` (e.g. `https://smashbook.app`; used to construct password-reset links; defaults to that value if unset).

### Stripe — two-account model

SmashBook talks to Stripe via two distinct account identities, each with its own `StripeClient` instance defined in `backend/app/core/stripe_clients.py`:

- **Platform account** (`platform_client()`, reads `STRIPE_SECRET_KEY`) — Stripe Connect, player payments, application fees, payouts. Used by `clubs.py`, `payment_service.py`, `membership_service.py`. Webhook signing secret: `STRIPE_WEBHOOK_SECRET` (+ `STRIPE_CONNECT_WEBHOOK_SECRET`).
- **Billing account** (`billing_client()`, reads `STRIPE_BILLING_SECRET_KEY`) — tenant SaaS subscriptions (clubs paying SmashBook). Used exclusively by `stripe_billing_service.py`. Webhook signing secret: `STRIPE_BILLING_WEBHOOK_SECRET`; endpoint `POST /api/v1/webhooks/stripe-billing`.

Until the dedicated SmashBook Corporate Stripe account is provisioned, `STRIPE_BILLING_SECRET_KEY` may point to the same Stripe account as `STRIPE_SECRET_KEY`. The split is a pure secrets/dashboard change — see `docs/runbooks/STRIPE_BILLING_ACCOUNT_SPLIT.md`. Never reintroduce the module-level `stripe.api_key = ...` global in `stripe_billing_service.py` — it forces both accounts to share state.

---

## Documentation Standards

### Timestamps

Every file in `docs/` must have a `_Last updated: YYYY-MM-DD HH:MM UTC_` line at the very top (line 1), before the title. `CLAUDE.md` follows the same rule but with just the date (`_Last updated: YYYY-MM-DD_`). Update the timestamp whenever you modify the file — for `CLAUDE.md` in particular, this is non-negotiable: it is the AI-assistant entry point and a stale date silently signals "no recent changes" to every future session.

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

### Tracking Infrastructure Changes

`docs/INFRASTRUCTURE.md` is the authoritative record of what is actually deployed in GCP. **Update it every time a `terraform apply` moves infrastructure from `INFRASTRUCTURE_TARGET_STATE.md` toward the live state.** Steps:

1. Add or update the relevant section (Cloud Run, Cloud SQL, Pub/Sub, Secret Manager, Cloud Storage, IAM, etc.) to reflect exactly what was applied.
2. Remove the item from the **Known Gaps** table if it is now resolved.
3. Update the `_Last updated` timestamp on line 1 to the current UTC date/time.

Never leave `INFRASTRUCTURE.md` out of sync with Terraform after completing an infrastructure task.

### Tracking Implemented APIs

`docs/IMPLEMENTED_API.md` is the authoritative list of working endpoints. **Update it every time an endpoint moves from stub (`pass`) to implemented.** Steps:

1. Move the endpoint from the "Not Yet Implemented" table into its domain section.
2. Update the `_Last updated` timestamp on line 1 to the current UTC date/time.

Never leave `IMPLEMENTED_API.md` out of sync with the code after completing an endpoint.
