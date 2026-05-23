_Last updated: 2026-05-23 00:00 UTC_

# Inference Logging

Every AI call writes a row to `ai_inference_log` before returning, including on fallback. This document defines the schema contract and write rules. The model definition itself lives in [/backend/app/db/models/](../../db/models/).

## Schema contract

`ai_inference_log` is range-partitioned by `created_at` month. The partition DDL is hand-written in the migration; autogenerate does not produce it.

Required columns (see the model for full definitions):

| Column | Purpose |
|---|---|
| `id` | UUID primary key |
| `tenant_id` | Always set, even on fallback |
| `club_id` | Set when the feature is club-scoped (most features) |
| `feature` | Enum: `dynamic_pricing`, `gap_detection`, `smart_notification`, ... |
| `provider` | Enum: `anthropic`, `vertex`, `pgvector`, `none` (fallback) |
| `input_hash` | SHA-256 of normalized input, used for dedup cache lookup |
| `input_payload` | JSONB, the actual input (PII-redacted at write time) |
| `output_payload` | JSONB, the model output (or fallback output) |
| `fallback_used` | Boolean — true if the model was bypassed |
| `fallback_reason` | Enum: `flag_off`, `provider_error`, `provider_timeout`, `dedup_cache_hit_stale`, `n/a` |
| `latency_ms` | End-to-end including provider call |
| `tokens_input` / `tokens_output` | Nullable; populated for Anthropic |
| `model_id` | Pinned model identifier (e.g. `claude-opus-4-7`) |
| `cost_usd` | Computed at write time from token counts × model rate |
| `created_at` | Partition key |

## Write rules

1. **Always write.** Success, fallback, cache hit, provider error — every code path through `ai_inference_service.run()` writes exactly one row.
2. **Write before returning.** If the row write fails, the caller gets an error. Do not silently drop inference logs.
3. **Hash before storing.** `input_hash` is computed on a normalized, key-sorted JSON serialization of inputs. Identical logical inputs must produce identical hashes regardless of dict ordering.
4. **Redact PII at write time.** Player names, email addresses, and phone numbers go through `redact_pii()` before `input_payload` and `output_payload` are stored. Tenant/club IDs are not PII.
5. **Cost is computed at write time, not at read time.** Use the pinned `model_id` to look up the rate. If the rate is unknown, `cost_usd` is null and a warning is logged.

## Dedup cache

Before calling the provider, `ai_inference_service` looks up the most recent row with matching `input_hash`, `feature`, and `tenant_id` within the dedup TTL window (default 24h, configurable per feature). On hit, it returns the cached `output_payload` and writes a new row with `fallback_used = false`, `provider = "cache"`. Yes, the cache hit still writes a row — read patterns and cost attribution depend on it.

## Querying the log

- Always filter on `created_at` first so the planner prunes partitions.
- Always filter on `tenant_id` — never query unscoped.
- Aggregations for cost dashboards go through the analytics subtree, not here.

## Retention

Partitions older than 90 days are dropped by a nightly worker. If a feature needs longer retention (audit, ML training), copy rows to a long-term table — do not extend log retention globally.
