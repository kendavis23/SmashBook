_Last updated: 2026-06-12 19:00 UTC_

# Materialized Views & Rollup Tables

The precomputed surfaces that back the report catalog. A live query against `bookings` is fine for a single club; by ten clubs it is not. Move expensive aggregations here early.

> **Snapshot tables are a third category.** `court_utilisation_snapshots` (G7) is neither a materialized view nor an event-driven rollup — it is a **physical snapshot** written nightly by `app/analytics/workers/snapshot_court_utilisation.py` because its `total_slots` / `revenue_potential` figures depend on operating-hours and pricing config *as they were at snapshot time* and cannot be recomputed from current config. Re-runs are idempotent via delete-then-insert per (court, snapshot_date) — a plain upsert would duplicate the `hour_of_day = NULL` daily-rollup row, since the `UNIQUE(court_id, snapshot_date, hour_of_day)` constraint treats NULLs as distinct. See [REPORT_CATALOG.md](REPORT_CATALOG.md) → "Booking utilisation by court".

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

### `mv_revenue_by_club_day_service` / `mv_revenue_by_club_day_cash`
- Purpose: back the "Revenue by club, period" report (financials-by-club, G7).
  Two **parallel views with identical schema** because revenue can be anchored
  on two dates: `…_service` buckets by `bookings.start_datetime` (accrual —
  when the court time is delivered); `…_cash` buckets by `payments.created_at`
  (when money moved). The API picks one via `?basis=service|cash`. A single view
  can't carry two bucket dates without exploding cardinality.
- Grain: one row per `(club_id, revenue_date, revenue_type, currency)`.
  `revenue_date` is club-local (`date_trunc(... AT TIME ZONE clubs.timezone)`).
  `revenue_type` ∈ {`regular`, `lesson_individual`, `lesson_group`,
  `corporate_event`, `tournament`, `equipment`}. Measures: `gross_amount`,
  `refund_amount`, `net_amount`, `transaction_count`.
- Source: `payments` (state `succeeded`/`refunded`/`partially_refunded`) ⋈
  `bookings` (for `booking_type`) ∪ embedded `equipment_rentals`, joined to
  `clubs` for timezone/currency. **Subtract-embedded** equipment split: since
  `payments.amount` already includes equipment (it's added to the player's
  `amount_due`), each payment is split into a court portion and an `equipment`
  portion so `SUM(types) == SUM(payments.amount)`. Refunds land on the
  booking-type portion. Membership MRR is excluded (Stripe-only). Full spec:
  [REPORT_CATALOG.md](REPORT_CATALOG.md) → "Revenue by club, period".
- Refresh cadence: nightly 03:00 UTC via `app/analytics/workers/refresh_views.py`
  (the first MV-refresh worker; logs every run to `analytics_refresh_log`).
- Indexes: `UNIQUE (club_id, revenue_date, revenue_type, currency)` on each view
  — required for `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- Migration: `a04c76851993` (hand-written DDL — views aren't ORM models).

> **Adding a new view to the refresh worker:** append its name to
> `REFRESH_VIEWS` in `app/analytics/workers/refresh_views.py`. Refresh requests
> are intersected with that list, so only registered views are ever executed.
> Failures write a `failed` row to `analytics_refresh_log` and publish to the
> `analytics-alerts` topic (`PUBSUB_TOPIC_ANALYTICS_ALERTS`).

### `mv_player_value`
- Purpose: back the "Player value" report (G7, workstream B) — per-player LTV,
  most-active players, and inactive members, all from one view.
- Grain: one row per `(club_id, user_id)` — a point-in-time **stock**, not a
  dated flow. Columns: `first_played_at`, `last_played_at`, `bookings_played`,
  `played_last_30d`, `played_last_90d`, `lifetime_gross`, `lifetime_refunds`,
  `lifetime_spend` (net), `payments_count`, `currency`, `is_paid_member`,
  `membership_plan_name`.
- Source: three sub-aggregates stitched on `(club_id, user_id)` via a
  union-of-keys — **activity** (`booking_players` ⋈ `bookings`, non-cancelled
  and already-started), **spend** (`payments` by `user_id`, states
  `succeeded`/`refunded`/`partially_refunded`, net of refunds), **member**
  (`membership_subscriptions` ⋈ `membership_plans`, `active` + `price > 0`). A
  paid member with no activity/spend still appears. Display names are **not** in
  the view — the service joins `users` live. Full spec:
  [REPORT_CATALOG.md](REPORT_CATALOG.md) → "Player value".
- Refresh cadence: nightly 03:00 UTC via `app/analytics/workers/refresh_views.py`.
  Note the `played_last_30d` / `played_last_90d` windows use `now()`, so they are
  relative to refresh time (acceptable at nightly cadence). Inactivity is instead
  derived at query time from `last_played_at`, so any day threshold works.
- Indexes: `UNIQUE (club_id, user_id)` — required for `REFRESH … CONCURRENTLY`.
- Migration: `fd3c5c3192ab` (hand-written DDL — views aren't ORM models).

### `mv_club_active_player_day` / `mv_club_signups_day`
- Purpose: back the club-level "Active players & member sign-ups" report (G7,
  workstream A).
- Grains:
  - `mv_club_active_player_day` — `(club_id, activity_date, user_id)`: a
    **presence** set, one row per player per club-local day they were on court
    (`booking_players` ⋈ `bookings`, non-cancelled + already-started). Deliberately
    presence rows, **not** a precomputed rolling count: the service derives both
    the trailing-window active KPI (`COUNT(DISTINCT)` over the last N days) and
    the calendar WAP/MAP timeseries (`COUNT(DISTINCT) GROUP BY date_trunc`) from
    it, so the window stays flexible at query time.
  - `mv_club_signups_day` — `(club_id, signup_date, signups)`: additive count of
    new **paid** membership subscription starts per club-local day
    (`membership_subscriptions.created_at`, `membership_plans.price > 0`).
- Source: `booking_players`, `bookings`, `membership_subscriptions`,
  `membership_plans`, `clubs` (for timezone). Both bucket dates club-local. Full
  spec: [REPORT_CATALOG.md](REPORT_CATALOG.md) → "Active players & member sign-ups".
- Refresh cadence: nightly 03:00 UTC via `app/analytics/workers/refresh_views.py`.
  The active view's `start_datetime <= now()` filter makes its trailing edge
  refresh-time-relative (acceptable at nightly cadence).
- Indexes: `UNIQUE (club_id, activity_date, user_id)` and
  `UNIQUE (club_id, signup_date)` respectively — required for `REFRESH …
  CONCURRENTLY`.
- Migration: `4d439313634d` (hand-written DDL — views aren't ORM models).

### `mv_coach_popularity`
- Purpose: back the "Coach popularity" report (G7) — which coaches run the most
  lessons, how many distinct players they coach, how many of those come back, and
  the revenue their lessons generate.
- Grain: one row per `(club_id, staff_profile_id)` — a point-in-time **stock**. A
  "coaching session" is a lesson booking led by a staff member: `bookings` with
  `booking_type IN (lesson_individual, lesson_group, train_and_play)` and a
  non-null `staff_profile_id`, restricted (like the player views) to non-cancelled
  bookings that have already started (`status IN (confirmed, completed)` and
  `start_datetime <= now()`).
- Columns: `sessions`, `first_session_at`, `last_session_at`, `sessions_last_30d`,
  `sessions_last_90d`, `distinct_players`, `repeat_players` (players with ≥2
  lessons with this coach), `total_attendances`, `lesson_revenue` (net realised,
  `payments` by `booking_id`, states `succeeded`/`refunded`/`partially_refunded`),
  `currency`. **`return_rate` is not stored** — it is `repeat_players /
  distinct_players`, derived by the service (same rule as the revenue view's
  avg-per-transaction: keep numerator and denominator separate). Coach display
  names join `users` via `staff_profiles` live — no PII in the view.
- Source: `bookings`, `booking_players`, `payments`, `staff_profiles` (the last
  only for serving-time name joins, not the view body). Membership MRR excluded,
  matching the revenue and player-value views.
- Refresh cadence: nightly 03:00 UTC via `app/analytics/workers/refresh_views.py`.
  The `start_datetime <= now()` / 30-90d windows are refresh-time-relative.
- Indexes: `UNIQUE (club_id, staff_profile_id)` — required for `REFRESH …
  CONCURRENTLY`.
- Migration: `1f0263eec44b` (hand-written DDL — views aren't ORM models).

### `mv_player_rfv`
- Purpose: the RFV (Recency / Frequency / Value) **pre-aggregate** (G7) — the
  precomputed scoring substrate for player-value cuts and later AI churn/segmentation.
- Grain: one row per `(club_id, user_id)`, restricted to *engaged* players
  (`bookings_played > 0 OR lifetime_spend > 0`). Columns: raw inputs
  (`last_played_at`, `bookings_played`, `lifetime_spend`) plus `recency_score`,
  `frequency_score`, `value_score` (each `smallint` 1–5), `rfv_total` (their sum),
  and `rfv_cell` (the three scores concatenated, e.g. `"543"`, as a stable grouping
  key).
- **Scope — pre-aggregate, not a taxonomy.** Scores are per-club `ntile(5)`
  quintiles (1 = lowest .. 5 = highest); recency orders by `last_played_at` ascending
  `NULLS FIRST` so the longest-gone score lowest. The view deliberately does **not**
  name segments or build a cohort taxonomy — structured player segmentation stays
  deferred (see the dropped `player_segments` decision). Naming is left to consumers.
- Source: **`mv_player_value`** (a derivation, not the base tables). ⚠️ **Refresh
  ordering:** this view reads `mv_player_value`, so it MUST refresh after it. It is
  registered immediately after `mv_player_value` in `REFRESH_VIEWS`, and the worker
  refreshes the list sequentially, so each run scores against the fresh values.
- Refresh cadence: nightly 03:00 UTC via `app/analytics/workers/refresh_views.py`.
- Consumer: LEFT-joined onto every `PlayerValueRow` by `PlayerValueService`
  (nullable, display-only scores on the `value`/`most-active`/`inactive-members`
  reports); future AI churn/segmentation input. No dedicated endpoint.
- Indexes: `UNIQUE (club_id, user_id)` — required for `REFRESH … CONCURRENTLY`.
- Migration: `dff4cf6de626` (hand-written DDL — views aren't ORM models).

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
