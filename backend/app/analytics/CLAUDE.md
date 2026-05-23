# Analytics Domain — CLAUDE.md

_Last updated: 2026-05-23_

This subtree owns reporting, dashboards, exports, scheduled aggregations, and materialized views. If your work is "give me a number derived from operational data," it belongs here. If your work is "decide what the system should do next based on a model prediction," it belongs in [/backend/app/ai/](../ai/).

## Where things go

```
app/analytics/
  api/         # FastAPI endpoint modules (reports, dashboards, exports)
  api/router.py  # analytics_router aggregator
  services/    # aggregation + rollup business logic
  workers/     # scheduled jobs (nightly rollups, materialized view refresh)
  schemas/     # Pydantic response models for reports and dashboards
  tests/       # co-located tests
  docs/        # analytics-specific reference docs
```

**Models do NOT live here.** SQLAlchemy models for analytics tables, materialized views, and rollup tables live in [/backend/app/db/models/](../db/models/) with everything else.

## Hard rules

1. **Always use the read replica for analytics queries.** Inject `Depends(get_read_db)`, not `get_db`. Heavy aggregation queries on the primary will starve the booking and payment paths. Writes (recording report runs, refresh logs) go through the primary.

2. **Aggregations are precomputed where possible.** A report that scans `bookings` every page load will not survive ten clubs. Use materialized views, rollup tables, or scheduled workers. See [docs/MATERIALIZED_VIEWS.md](docs/MATERIALIZED_VIEWS.md).

3. **Tenant isolation still applies.** Reports are scoped by `tenant_id` and (for club-level reports) `club_id`. A tenant must never see another tenant's numbers, even in an aggregate. Add the filter explicitly in every query — do not rely on the report definition to remember.

4. **Time zones are explicit.** A report's "today" is the club's local "today," not UTC. Aggregations must take the club's timezone into account when bucketing by day/week/month. Watch this carefully when copying SQL from the AI subtree, which often works in UTC for inference logs.

5. **Exports are async.** CSV / Parquet / Excel exports of more than a few thousand rows must run as a Pub/Sub-triggered worker that writes to GCS and emails a signed URL. Do not stream large exports through the request path.

## Wiring new endpoints

1. Create `app/analytics/api/<feature>.py` with `router = APIRouter(prefix="/<feature>", tags=["analytics-<feature>"])`.
2. Register on `analytics_router` in `app/analytics/api/router.py`.
3. Do not touch `app/api/v1/router.py`.

Final URL is `/api/v1/analytics/<feature>/...`.

## Tests

Co-located in `app/analytics/tests/`. Run via `pytest app/analytics/tests/` from `backend/`. Shared DB fixtures come from `backend/tests/conftest.py`.

Every new report endpoint needs at minimum:
1. Role enforcement test (most reports are `staff`+ only)
2. Tenant isolation test (request from tenant A returns no data from tenant B)
3. Empty-state test (zero bookings → valid empty response, not 500)

## Documentation in this subtree

Domain-local docs in `app/analytics/docs/`:
- [REPORT_CATALOG.md](docs/REPORT_CATALOG.md) — every report, its SQL, its consumer
- [MATERIALIZED_VIEWS.md](docs/MATERIALIZED_VIEWS.md) — view definitions and refresh cadence
- [QUERY_PATTERNS.md](docs/QUERY_PATTERNS.md) — read replica usage, partition pruning, timezone handling

Schema state stays in central [/docs/DATA_MODEL.md](../../../docs/DATA_MODEL.md). Do not duplicate model definitions here.

## Sprint alignment

This subtree owns reporting work introduced in Sprints 5–6 (basic operational reports) and the heavier analytical work that accompanies AI features in Sprints 7–12 (e.g. AI inference dashboards, churn cohorts, campaign performance). Models for analytics tables live in the same `db/models/` tree as everything else.
