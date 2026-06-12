# AI Domain — CLAUDE.md

_Last updated: 2026-06-12_

**Commits:** The user handles all commits manually. Never run `git commit` or `git push` — make the changes and leave them for the user to review and commit.

This subtree owns every AI-driven feature in SmashBook: dynamic pricing, gap detection, smart notifications, matchmaking, Fill the Court, cancellation prediction, churn scoring, segmentation/campaigns, conversational booking, AI support chatbot, video analysis, training recommendations, market intelligence.

If you are reading this, you are working on AI. Operational booking/payment/auth code lives elsewhere — do not edit it from here. Cross-domain changes (e.g. injecting a pricing call into `booking_service.py`) should go through a thin call site in operational code that delegates to a service in `app/ai/services/`.

## Where things go

```
app/ai/
  api/         # FastAPI endpoint modules — each declares router = APIRouter(prefix="/<feature>")
  api/router.py  # ai_router aggregator — register all endpoint routers here
  services/    # business logic, one class per AI feature
  workers/     # Pub/Sub consumers (async inference, embedding generation, scheduled jobs)
  schemas/     # Pydantic request/response models
  tests/       # co-located unit + integration tests for AI features
  docs/        # AI-specific reference docs (see below)
```

**Models do NOT live here.** All SQLAlchemy models — including AI-specific tables like `ai_inference_log`, `ai_feature_flags`, `gap_detection_events`, `cancellation_predictions`, `player_profiles.embedding` — live in [/backend/app/db/models/](../db/models/). This is non-negotiable: one source of truth, one Alembic chain, one migration history.

## Hard rules (load-bearing — never bypass)

1. **All AI calls go through `ai_inference_service.py`.** Never call `anthropic.messages.create()` or Vertex AI clients directly from feature services. The service handles feature-flag check → input dedup → provider call with retry → inference logging. See [docs/INFERENCE_LOGGING.md](docs/INFERENCE_LOGGING.md).

2. **Every AI feature must have a non-AI fallback.** If the model is disabled, errors, or times out, return a deterministic default. `fallback_used` on `ai_inference_log` records which path ran. See [docs/FALLBACK_CATALOG.md](docs/FALLBACK_CATALOG.md) for each feature's required fallback.

3. **Feature flags live in `ai_feature_flags`, not `subscription_plans`.** Plan-level defaults are seeded into `ai_feature_flags` at tenant provisioning. To toggle an AI feature for a tenant, write to `ai_feature_flags`. The `subscription_plans` table does not carry AI flag columns. See [docs/FEATURE_FLAG_MATRIX.md](docs/FEATURE_FLAG_MATRIX.md).

4. **Provider routing is not negotiable.** See [docs/PROVIDER_ROUTING.md](docs/PROVIDER_ROUTING.md):
   - Anthropic Claude API → natural language (notification copy, summaries, drafts, conversational booking, chatbot responses)
   - Vertex AI → numbers/classifications (pricing multipliers, churn scores, demand forecasts, anomaly flags, skill deltas)
   - pgvector on Cloud SQL → matchmaking and Fill the Court similarity

5. **Sync vs async.** Dynamic pricing is the **only** synchronous AI call (it blocks the booking request). Every other AI feature is async via Pub/Sub. New synchronous AI calls require an explicit decision recorded somewhere.

6. **Inference logging is always-on.** Every call to `ai_inference_service` writes a row to `ai_inference_log` *before returning*, including on fallback. No conditional logging.

## Multi-tenancy still applies

All AI features are tenant-scoped. Inference requests carry `tenant_id` and (where relevant) `club_id`. The same multi-tenancy rules from root [CLAUDE.md](../../../CLAUDE.md) apply: scope queries by `club_id`, resolve tenant via middleware. Do not "shortcut" tenancy because the data feels generic — model outputs leak across tenants if you do.

## Pub/Sub pattern for async work

Workers in `app/ai/workers/` consume Pub/Sub events. Build pattern:
- Worker entry points are Cloud Run services built from the same `Dockerfile.worker` with a different CMD.
- Publishers use the helpers in `app/core/pubsub.py` — never instantiate a `PublisherClient` directly.
- Workers must be idempotent (Pub/Sub at-least-once delivery).

## Wiring new endpoints

1. Create `app/ai/api/<feature>.py` with `router = APIRouter(prefix="/<feature>", tags=["ai-<feature>"])`.
2. Register on `ai_router` in `app/ai/api/router.py`.
3. Do not touch `app/api/v1/router.py` — the aggregator is already wired there.

Final URL is `/api/v1/ai/<feature>/...`.

## Tests

Co-located in `app/ai/tests/`. Run via `pytest app/ai/tests/` from `backend/`. Shared fixtures (DB, tenant context) live in `backend/tests/conftest.py`. If you need an AI-specific fixture, put it in `app/ai/tests/conftest.py`.

Every new AI endpoint needs at minimum:
1. Role enforcement test
2. Tenant isolation test
3. Happy path + **fallback path** test (verify `fallback_used=true` when feature flag is off)

## Documentation in this subtree

Domain-local docs in `app/ai/docs/`:
- [PROVIDER_ROUTING.md](docs/PROVIDER_ROUTING.md) — Anthropic vs Vertex vs pgvector routing
- [FALLBACK_CATALOG.md](docs/FALLBACK_CATALOG.md) — required fallback per AI feature
- [PROMPT_TEMPLATES.md](docs/PROMPT_TEMPLATES.md) — prompts, system messages, few-shot examples
- [FEATURE_FLAG_MATRIX.md](docs/FEATURE_FLAG_MATRIX.md) — plan defaults, flag semantics
- [INFERENCE_LOGGING.md](docs/INFERENCE_LOGGING.md) — `ai_inference_log` schema and write rules

Schema state and the migration backlog stay in central `/docs/DATA_MODEL.md` and `/docs/DATA_MODEL_TARGET_STATE.md` — do not duplicate model definitions here.

## Sprint alignment

This subtree owns the AI-side work in migration groups **G8, G9b, and G13–G16** (Sprints 9–15; production go-live is after Sprint 10, so G13–G16 are post-launch). G7 belongs to analytics; G9a/G9-360/G10/G11 are operational-tree work. Read the relevant group in [/docs/DATA_MODEL_TARGET_STATE.md](../../../docs/DATA_MODEL_TARGET_STATE.md) before starting a sprint, implement the migrations, then update `DATA_MODEL.md`.
