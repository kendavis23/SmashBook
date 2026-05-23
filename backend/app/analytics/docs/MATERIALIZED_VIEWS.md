_Last updated: 2026-05-23 00:00 UTC_

# Materialized Views & Rollup Tables

The precomputed surfaces that back the report catalog. A live query against `bookings` is fine for a single club; by ten clubs it is not. Move expensive aggregations here early.

## Materialized views vs rollup tables

| Use a materialized view when | Use a rollup table when |
|---|---|
| The query is pure SQL over existing tables | The aggregation requires application logic or external lookups |
| `REFRESH MATERIALIZED VIEW CONCURRENTLY` is acceptable cadence | Need event-driven updates (Pub/Sub on every booking, etc.) |
| Read-only result | Need to update individual rows |

## Refresh policy

- Materialized views refresh via a scheduled Cloud Run job (`app/analytics/workers/refresh_views.py`). Default cadence: nightly at 03:00 UTC. Per-view overrides below.
- Always `REFRESH MATERIALIZED VIEW CONCURRENTLY` — never block readers.
- Refresh failures publish to the `analytics-alerts` Pub/Sub topic and write a row to `analytics_refresh_log`.

## View / table index

> Fill in as each view ships. Migration changes go through `/backend/app/db/migrations/` like everything else — materialized views are not exempt from the schema workflow.

### `mv_booking_utilisation_daily`
- Purpose: _TBD_
- Source: _TBD_
- Refresh cadence: _TBD_
- Indexes: _TBD_

### `mv_revenue_by_club_month`
- Purpose: _TBD_
- Source: _TBD_
- Refresh cadence: _TBD_
- Indexes: _TBD_

### `rollup_ai_cost_by_feature_day`
- Purpose: daily cost rollup of `ai_inference_log`, scoped to (tenant_id, feature, day)
- Source: `ai_inference_log` (range-partitioned)
- Update trigger: nightly worker
- Indexes: (tenant_id, day desc), (tenant_id, feature, day desc)

### `rollup_campaign_performance`
- Purpose: per-campaign opens/clicks/conversions/revenue
- Source: `campaigns`, `message_deliveries`
- Update trigger: _TBD_
- Indexes: _TBD_

## Anti-patterns

- Don't add a materialized view "just in case." Each one adds refresh cost and storage. Wait until the query is actually slow.
- Don't refresh on every write. The whole point of a materialized view is to amortize aggregation; per-write refresh defeats it. Use a rollup table for that pattern.
- Don't read materialized views from the operational hot path (booking creation, payment). They are stale by definition.
