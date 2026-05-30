_Last updated: 2026-05-30_

# SmashBook — Data Model Target State

> **What this file is:** The complete target schema for SmashBook — every table, column, enum, index, and relationship that the platform will need across all sprints and phases. This is the architectural blueprint. It does not reflect what is in the database today.
>
> **What it is not:** A migration script. Nothing in this file should be applied directly. Every change moves through a SQLAlchemy model edit → `alembic revision --autogenerate` → reviewed migration file → `alembic upgrade head`.
>
> **Relationship to `DATA_MODEL.md`:** `DATA_MODEL.md` always reflects the live database state — it is updated only after a migration has been successfully applied and verified. This file is updated when new user stories are added or the target design evolves. The diff between the two files is your migration backlog at any given time.

---

## Design Principles

1. **AI-native from day one** — every table an AI feature touches has a direct FK back to `ai_inference_log`. No AI output enters the business layer without a log record.
2. **Club-scoped by default** — all operational data carries `club_id`. Service layer always filters by `club_id`, never by tenant alone.
3. **Append-only for audit and scoring tables** — `skill_level_history`, `player_engagement_scores`, and `ai_inference_log` are insert-only. Never upsert.
4. **Enums for finite state; JSONB for variable config** — status and type fields are PostgreSQL enums (tracked in Alembic). Rule sets, AI payloads, and feature configuration use JSONB.
5. **Graceful degradation encoded in schema** — `fallback_used` on `ai_inference_log` and `assigned_by ENUM(ai, staff)` on AI-driven tables permanently record whether a human or model made each decision.
6. **One source of truth per concept** — no duplicated state across tables. Foreign keys always reference the single authoritative record.
7. **Defer YAGNI tables** — features whose schema is unknown until a real customer asks for them are kept as columns or JSONB until a real shape emerges. Schema complexity is paid back later, never up front.

---

## Simplification Notes (May 2026 review)

This pass removed ~6–8 tables and one parallel system from the target state without touching any shipped code. Specific changes:

- **`notification_deliveries` and `campaign_deliveries` merged** into a single `message_deliveries` table. Both had ~80% column overlap; one inbox query instead of two. *(Was suggestion 1.)*
- **`chat_threads` / `chat_messages` dropped.** Casual chat and support are the same domain — both are threads of messages with senders, AI inference, and intent. `support_tickets` gets a `category` enum (`support`, `chat`, `booking_inquiry`); `support_messages` carries the chat fields. *(Was suggestion 2.)*
- **`membership_perks` table dropped.** Perks stay as columns on `membership_plans` (as they are today). `membership_plan_pricing` is kept — multiple billing intervals per plan is a real need. *(Was suggestion 4.)*
- **`player_segments`, `player_segment_memberships`, `campaign_messages` dropped.** A v1 campaigns table with a `target_filter` JSONB (saved query) covers the realistic first-50-clubs feature set. Structured segments can be re-introduced post-revenue when real club requests reveal what to segment by. *(Was suggestion 5.)*
- **`ai_feature_flags` is now the single source of feature gating for AI features.** Removed AI feature flag columns from `subscription_plans`; plan-level defaults live as seed rows in `ai_feature_flags`. `subscription_plans` keeps non-AI flags (clubs, courts, staff caps, tournaments_enabled, messaging_enabled, etc.). *(Was suggestion 6.)*
- **`tournament_matches` dropped.** A tournament match is a `bookings` row with `booking_type = 'tournament'` and a `tournament_id` FK. Players go in `booking_players`. Scores go in `match_results`. *(Was suggestion 7.)*

### Architectural note on `ai_recommendations`

The `ai_recommendations` table currently bundles 12 distinct recommendation types into one row shape with a JSONB `action_payload`. This works as a generic "staff inbox" but risks becoming a god-table over time, with every UI query branching on `recommendation_type` and every new AI feature widening the JSONB shape contract.

**Decision deferred to Sprint 10.** Before building this table, revisit whether it should be:
- *(Recommended)* Kept as a thin inbox (status / priority / title / rationale / ai_inference_id) that *links* to specialised tables that already own structured fields — `gap_detection_events`, `cancellation_predictions`. Each specialised table is the source of truth for its action; `ai_recommendations` is just the staff-facing review queue.
- *(Acceptable)* Kept as a unified table but with the type enum collapsed to 3–4 broad domains (`pricing`, `outreach`, `staffing`) so `action_payload` only needs a few documented schemas.

Look at this fresh when Sprint 10 work begins.

---

## Entity Relationship Overview

```
subscription_plans ──< tenants ──< clubs ──< courts ──< bookings ──< booking_players
                                      │                     │
                                      │                     ├──< payments
                                      │                     ├──< equipment_rentals ──> equipment_inventory
                                      │                     ├──< waitlist_entries
                                      │                     └──< match_results ──< match_result_players
                                      │
                                      ├──< operating_hours
                                      ├──< pricing_rules
                                      ├──< calendar_reservations
                                      ├──< staff_profiles ──< trainer_availability
                                      ├──< equipment_inventory
                                      ├──< membership_plans ──< membership_subscriptions
                                      │                     └──< membership_credit_logs
                                      ├──< membership_plan_pricing
                                      ├──< tournaments ──< tournament_registrations
                                      ├──< promo_codes
                                      ├──< campaigns
                                      ├──< notification_templates
                                      ├──< message_deliveries
                                      ├──< court_utilisation_snapshots
                                      ├──< gap_detection_events
                                      ├──< ai_recommendations
                                      ├──< announcements
                                      └──< support_tickets ──< support_messages

tenants ──< users ──< wallets ──< wallet_transactions
                 ├──< player_profiles (one per user per club)
                 ├──< player_engagement_scores
                 ├──< skill_level_history
                 └──< training_recommendations

tenants ──< ai_feature_flags

ai_inference_log ◄── referenced by: gap_detection_events, ai_recommendations,
                     player_engagement_scores, skill_level_history,
                     match_results, cancellation_predictions,
                     video_analyses,
                     competitor_price_snapshots, support_messages,
                     training_recommendations
```

---

## Migration Backlog Summary

Changes are grouped by the sprint that first needs them. Implement the group for a sprint before starting that sprint's feature work. All migrations are additive — columns are nullable or have server defaults unless noted.

**Status legend:** ✅ Applied (migration in `DATA_MODEL.md`) · 🚧 In progress · ❓ Pending verification (claimed applied but not reflected in `DATA_MODEL.md`) · ⬜ Not started

Update the **Status** column when a migration has been applied and verified. The rule: a group is only ✅ once `DATA_MODEL.md` has been updated to match. If you've run the migration but haven't yet updated `DATA_MODEL.md`, mark it 🚧 — the work isn't complete until the docs reflect reality.

| Group | Sprint needed | Status | What changes |
|---|---|---|---|
| G1 | Sprint 1 | ✅ Applied (`7f7915bed71a`) | `users`: add `phone`, `photo_url`, `is_suspended`, `suspension_reason`, `default_payment_method_id`, `preferred_notification_channel` |
| G2 | Sprint 2 | ✅ Applied (`17206ff810ef`) | `operating_hours`: add `valid_from`, `valid_until` for seasonal variations |
| G3 | Sprint 3 | ✅ Applied (`62a903cfb227`) | `bookings`: add `min_skill_level`, `max_skill_level`, `invite_confirmed`; `booking_players`: add `invite_status`; new table: `waitlist_entries` |
| G4 | Sprint 4 | ✅ Applied (`8582075732fe`) | `payments`: add `failure_reason`, `retry_count`, `next_retry_at`, `anomaly_flagged`, `dispute_status`, `club_id`; new table: `platform_fees`; `wallets`: add `auto_topup_enabled`, `auto_topup_threshold`, `auto_topup_amount`; `bookings`: add `discount_amount`, `discount_source`, `membership_subscription_id`; `booking_players`: add `discount_amount`, `discount_source` |
| G4.1 | Sprint 4 (court holds) | ✅ Applied (`92c0f1557d7e`) | Court hold expiry & auto-release: `bookings`: add `hold_expires_at`; `booking_players`: add `payment_deadline` + partial index `ix_booking_players_deadline (payment_deadline) WHERE payment_status = 'pending'` |
| G5 | Sprint 5 | ✅ Applied (`24a1464d08d9`; skill-filter cleanup `f80daf1c4ecb`) | `bookings`: add `parent_booking_id` (self-ref for recurring series), `recurrence_end_date`; new table: `calendar_reservations`; `clubs`: add `default_skill_range_above`, `default_skill_range_below`; `equipment_rentals`: add `damage_charge`, `payment_status`, `payment_id`. ~~`equipment_inventory`: `reorder_threshold`~~ **DESCOPED** (equipment AI dropped) — column was migrated and is **intentionally retained** in the DB (left in place rather than dropped); currently unused |
| G6 | Sprint 6 (**Foundation**) | ✅ Applied (`ae37b6ee82be`) | New tables: `promo_codes`, `announcements`, `support_tickets`, `support_messages`; `bookings`: add `promo_code_id`; `skill_level_history`: add `change_source`, `club_id`, `ai_inference_id` + make `assigned_by` nullable. **Prerequisite for the re-prioritised roadmap** — `promo_codes` backs the live `discount_source='promo_code'` enum and CRM campaigns; `skill_level_history` cols back skill-ELO (G11). Run alongside the G3/G5 table reconciliation. |
| G6.1 | Post-MVP | ✅ Applied (`32204403280f`) | Player registration email verification + free basic membership: `users`: add `email_verified_at`; `membership_plans`: add `is_default` with partial unique index per club |
| G6.2 | Post-MVP | ✅ Applied (`fa46b223afc9`) | Membership downgrade scheduling: `membership_subscriptions`: add `pending_plan_id` (FK → `membership_plans`, nullable) — scheduled downgrade target applied at `current_period_end` |
| G7 | Sprint 7 — **Analytics** | 🚧 Schema applied (`b210c7b03579`) | New table: `court_utilisation_snapshots`; `clubs`: add `timezone`; `users`: add `date_of_birth`, `gender`, `postcode`, `latitude`, `longitude` (all nullable, aspirational — fill Epic-2 demographics/catchment reports) — **all applied**. REPORT_CATALOG materialized views (revenue-by-site, active-players-30d, signups/month, player-LTV, coach popularity, RFV pre-aggregate) refreshed by the analytics worker are **not yet built** (worker-managed DDL, not ORM/autogenerate) — group stays 🚧 until they land |
| G8 | Sprint 8 — **AI infrastructure** | ⬜ Not started | New tables: `ai_inference_log`, `ai_feature_flags`; `subscription_plans`: add `tournaments_enabled`, `messaging_enabled` (non-AI flags only — AI flags live in `ai_feature_flags`); `clubs`: add `gap_detection_threshold_pct`, `max_gap_discount_pct`, `churn_inactive_days_threshold`. Features: dynamic pricing, payment anomaly detection, revenue forecasting |
| G9 | Sprint 9 — **CRM I** (profiles, scoring, delivery) | ⬜ Not started | New tables: `player_profiles` (with pgvector embedding), `player_engagement_scores`, `notification_templates`, `message_deliveries`, `gap_detection_events`, `cancellation_predictions`; `bookings`: add `cancellation_risk_score`, `campaign_id`. Features: gap detection, smart notifications, personalised slot suggestions, churn scoring, matchmaking/Fill-the-Court |
| G10 | Sprint 10 — **CRM II** (campaigns & recommendations) | ⬜ Not started | New tables: `campaigns`, `ai_recommendations` (inbox variant); membership v2: add `membership_plan_pricing` (perks stay as columns on `membership_plans`). Features: re-engagement campaigns, churn-prevention, membership tier suggestions, AI pricing/outreach recommendations |
| G11 | Sprint 11 — **Tournaments + match/skill** | ⬜ Not started | New tables: `tournaments`, `tournament_registrations`, `match_results`, `match_result_players`; `bookings`: add `tournament_id` FK, `tournament_round`, `tournament_match_label`; `booking_players`: add `team`. Features: skill auto-update (ELO), bracket auto-arrange |
| G12 | Sprint 12 — **Phase 3 (deferred)** | ⬜ Not started | New tables: `training_recommendations`, `video_analyses`, `competitor_price_snapshots`; `support_tickets`: add `category`; `support_messages`: add `intent`, `booking_id`, AI fields. Features: AI support chatbot, conversational booking, training recommendations, video analysis, competitor pricing intel |
| OOB | Out-of-band fix | ✅ Applied (`a3ad99663232`) | `payments`: add `stripe_destination_payment_id` (indexed) — connected-account-side payment id (`py_xxx`) so `payout.paid` can match destination-charge Connect payouts |

> **🔁 Re-prioritisation (2026-05-29):** The post-MVP roadmap was re-sequenced to **Analytics → AI infrastructure → CRM → Tournaments**, with a Foundation step first. Groups G7–G12 were **redefined in place** (labels kept, contents and target sprints remapped) — G1–G6 are untouched. The driver is the analytics-first ROI story (see `Jamie Info` user stories: Site Performance + Player Analytics are HIGH priority). Two feature areas were **descoped entirely**: (1) all **weather** features/columns/flags, (2) all **equipment & maintenance AI**. See the "Descoped 2026-05-29" note below.

> **Note on G3/G5 reconciliation (completed 2026-05-30):** Resolved. Both tables are now built, migrated, and applied — `waitlist_entries` (G3, `62a903cfb227`) and `calendar_reservations` (G5, `24a1464d08d9`, with skill-filter cleanup `f80daf1c4ecb`) — and the corresponding column changes (`bookings.min_skill_level`/`max_skill_level`/`parent_booking_id`/`recurrence_end_date`, `booking_players.invite_status`, `clubs.default_skill_range_*`, `equipment_rentals` payment/damage fields) are live. `DATA_MODEL.md` now carries migration rows for all three revisions, and G3/G5 are flipped to ✅. **One deliberate deviation:** the descoped `equipment_inventory.reorder_threshold` column was **not** dropped — it was migrated in and is intentionally left in the DB (unused) rather than removed.

> **Descoped 2026-05-29 (do not reintroduce without revisiting this note):**
> - **Weather, all of it:** `clubs.weather_alerts_enabled`, `clubs.latitude`, `clubs.longitude`, `bookings.weather_alert_sent`, the `weather_aware_alerts` AI feature + flag, and any weather key in `cancellation_predictions.risk_factors`. *(`clubs.timezone` is **kept** — it serves analytics hour-bucketing, not weather.)*
> - **Equipment & maintenance AI:** tables `equipment_maintenance_log` and `equipment_replacement_predictions`; the `equipment_replacement_prediction` and `ai_maintenance_scheduling` feature flags; the `equipment_order` and `maintenance_schedule` values of `RecommendationType`; enums `MaintenanceEventType` and `EquipmentReplacementStatus`; and `equipment_inventory.reorder_threshold`. The operational `equipment_inventory` / `equipment_rentals` tables stay.

---

## Section Index

1. [Tenant & Subscription](#1-tenant--subscription)
2. [Users & Authentication](#2-users--authentication)
3. [Clubs & Configuration](#3-clubs--configuration)
4. [Courts](#4-courts)
5. [Bookings](#5-bookings)
6. [Staff & Trainers](#6-staff--trainers)
7. [Equipment](#7-equipment)
8. [Payments & Billing](#8-payments--billing)
9. [Wallet](#9-wallet)
10. [Skill Tracking & Match Results](#10-skill-tracking--match-results)
11. [Memberships](#11-memberships)
12. [Tournaments](#12-tournaments)
13. [Messaging, Chat & Support](#13-messaging-chat--support)
14. [Discounts & Promo Codes](#14-discounts--promo-codes)
15. [Calendar Reservations](#15-calendar-reservations)
16. [AI Infrastructure](#16-ai-infrastructure)
17. [Player Profiles & Engagement Scoring](#17-player-profiles--engagement-scoring)
18. [Campaigns](#18-campaigns)
19. [Notifications & Outreach](#19-notifications--outreach)
20. [Utilisation & Gap Detection](#20-utilisation--gap-detection)
21. [AI Recommendations Engine](#21-ai-recommendations-engine)
22. [Cancellation Prediction](#22-cancellation-prediction)
23. [Video Analysis](#23-video-analysis)
24. [Market Intelligence](#24-market-intelligence)
25. [Enumerations](#25-enumerations)
26. [Indexes](#26-indexes)
27. [AI Feature → Table Mapping](#27-ai-feature--table-mapping)

---

## 1. Tenant & Subscription

### `subscription_plans`
**Changes from current:** Add `tournaments_enabled`, `messaging_enabled`. **AI feature flags are not stored here** — they live in `ai_feature_flags` (per-tenant) with plan-level defaults seeded as rows. *(Migration group G8)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | VARCHAR(100) | |
| `max_clubs` | INTEGER | `-1` = unlimited |
| `max_courts_per_club` | INTEGER | `-1` = unlimited |
| `max_staff_users` | INTEGER | `-1` = unlimited |
| `open_games_feature` | BOOLEAN | |
| `waitlist_feature` | BOOLEAN | |
| `white_label_enabled` | BOOLEAN | |
| `analytics_enabled` | BOOLEAN | |
| `tournaments_enabled` | BOOLEAN | **NEW** Default `false` |
| `messaging_enabled` | BOOLEAN | **NEW** Default `false` |
| `price_per_month` | NUMERIC(10,2) | |
| `setup_fee` | NUMERIC(10,2) | Default `0` |
| `trial_days` | INTEGER | Default `0` |
| `booking_fee_pct` | NUMERIC(5,2) | Nullable |
| `revenue_share_pct` | NUMERIC(5,2) | Nullable |
| `third_party_revenue_share_pct` | NUMERIC(5,2) | Nullable |
| `overage_fee_per_booking` | NUMERIC(10,2) | Nullable |
| `max_api_calls_per_month` | INTEGER | Nullable |
| `stripe_price_id` | VARCHAR(255) | Nullable — Stripe Price object for SmashBook → org billing |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

> **AI flag pattern:** When a tenant is provisioned on a plan, the seed routine writes one `ai_feature_flags` row per AI feature, with `is_enabled` set to the plan's default for that feature. Staff can then toggle individual features or supply config overrides without touching the plan.

---

### `tenants`
**Changes from current:** Add `stripe_customer_id`, `stripe_subscription_id`, `subscription_status` for SmashBook → org subscription billing. Add `trading_name` (public-facing brand); split `subdomain` into `player_subdomain` and `staff_subdomain` so player and staff portals can be hosted on distinct hosts (and so registration confirmation emails route back to the right portal).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | VARCHAR(255) | Legal / registration name (Stripe billing entity) |
| `trading_name` | VARCHAR(255) | Public-facing brand shown in club UI and confirmation emails |
| `player_subdomain` | VARCHAR(100) | UNIQUE — `<player_subdomain>.smashbook.app` for the player site |
| `staff_subdomain` | VARCHAR(100) | UNIQUE — `<staff_subdomain>.smashbook.app` for the staff portal |
| `custom_domain` | VARCHAR(255) | Nullable |
| `plan_id` | UUID | FK → `subscription_plans` |
| `is_active` | BOOLEAN | |
| `subscription_start_date` | TIMESTAMPTZ | Nullable |
| `stripe_customer_id` | VARCHAR(255) | Nullable — SmashBook's Stripe Customer for billing this org (distinct from `users.stripe_customer_id` which is for players) |
| `stripe_subscription_id` | VARCHAR(255) | Nullable — Stripe Subscription ID |
| `subscription_status` | ENUM | Nullable — `trialing`, `active`, `past_due`, `canceled`, `suspended` (synced from Stripe; `suspended` is SmashBook's own state) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:**
- CHECK `player_subdomain <> staff_subdomain` (single-row distinctness).
- Cross-row, cross-column uniqueness (a subdomain string can appear in at most one of `player_subdomain`/`staff_subdomain` across all tenants) is enforced in the application layer at write time.

---

## 2. Users & Authentication

### `users`
**Changes from current:** Add `phone`, `photo_url`, `is_suspended`, `suspension_reason`, `default_payment_method_id`, `preferred_notification_channel` *(Migration group G1)*; add `email_verified_at` for player email-verification registration flow *(Migration group G6.1)*; add `date_of_birth`, `gender`, `postcode`, `latitude`, `longitude` for player-analytics demographics + catchment reporting *(Migration group G7)*.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → `tenants` |
| `email` | VARCHAR(255) | UNIQUE per tenant |
| `full_name` | VARCHAR(255) | |
| `hashed_password` | VARCHAR(255) | bcrypt |
| `role` | ENUM | `owner`, `admin`, `staff`, `trainer`, `ops_lead`, `viewer`, `player` |
| `skill_level` | NUMERIC(3,1) | Nullable — current rating, denormalised for query speed |
| `skill_assigned_by` | UUID | FK → `users` (self-ref), nullable |
| `skill_assigned_at` | TIMESTAMPTZ | Nullable |
| `is_active` | BOOLEAN | |
| `email_verified_at` | TIMESTAMPTZ | **NEW** Nullable — set when the player clicks the verification link. Login is blocked while NULL. *(G6.1)* |
| `stripe_customer_id` | VARCHAR(255) | Nullable |
| `phone` | VARCHAR(50) | **NEW** Nullable |
| `photo_url` | VARCHAR(500) | **NEW** Nullable — GCS path |
| `is_suspended` | BOOLEAN | **NEW** Default `false` |
| `suspension_reason` | TEXT | **NEW** Nullable |
| `default_payment_method_id` | VARCHAR(255) | **NEW** Nullable — Stripe PaymentMethod ID |
| `preferred_notification_channel` | ENUM | **NEW** `push`, `email`, `sms`, `in_app` — default `push` |
| `date_of_birth` | DATE | **NEW** Nullable — aspirational; powers age-band demographics (Epic 2). Captured at registration if/when intake forms collect it *(G7)* |
| `gender` | ENUM | **NEW** Nullable — `male`, `female`, `other`, `prefer_not_to_say`; self-reported demographics *(G7)* |
| `postcode` | VARCHAR(20) | **NEW** Nullable — catchment-area reporting *(G7)* |
| `latitude` | NUMERIC(10,7) | **NEW** Nullable — player location for the catchment map (distinct from club coordinates) *(G7)* |
| `longitude` | NUMERIC(10,7) | **NEW** Nullable *(G7)* |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(tenant_id, email)`

> **Aspirational columns:** `date_of_birth`, `gender`, `postcode`, `latitude`, `longitude` are added nullable ahead of the intake flow that populates them. The Epic-2 demographics and catchment-map reports stay dark until player registration captures these — that capture is a separate product decision, not part of the G7 migration.

---

## 3. Clubs & Configuration

### `clubs`
**Changes from current:** Add `timezone` for analytics hour-of-day bucketing *(Migration group G7)*; add AI operational config fields *(Migration group G8)*. *(Weather columns `latitude`/`longitude`/`weather_alerts_enabled` were **descoped 2026-05-29** — weather features dropped.)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → `tenants` |
| `name` | VARCHAR(255) | |
| `address` | TEXT | Nullable |
| `stripe_connect_account_id` | VARCHAR(255) | Nullable |
| `currency` | VARCHAR(3) | Default `"GBP"` |
| `booking_duration_minutes` | INTEGER | Default `90` |
| `max_advance_booking_days` | INTEGER | Default `14` |
| `min_booking_notice_hours` | INTEGER | Default `2` |
| `max_bookings_per_player_per_week` | INTEGER | Nullable |
| `skill_level_min` | NUMERIC(3,1) | Default `1.0` |
| `skill_level_max` | NUMERIC(3,1) | Default `7.0` |
| `skill_range_allowed` | NUMERIC(3,1) | Default `1.5` |
| `default_skill_range_above` | NUMERIC(3,1) | **NEW** Default `0.5` — default points above anchor for calendar reservations; overridable per reservation *(Migration group G5)* |
| `default_skill_range_below` | NUMERIC(3,1) | **NEW** Default `1.0` — default points below anchor for calendar reservations; overridable per reservation *(Migration group G5)* |
| `open_games_enabled` | BOOLEAN | Default `true` |
| `min_players_to_confirm` | INTEGER | Default `4` |
| `auto_cancel_hours_before` | INTEGER | Nullable |
| `cancellation_notice_hours` | INTEGER | Default `48` |
| `cancellation_refund_pct` | INTEGER | Default `100` |
| `reminder_hours_before` | INTEGER | Default `24` |
| `waitlist_enabled` | BOOLEAN | Default `true` |
| `timezone` | VARCHAR(50) | **NEW** Default `"Europe/London"` — analytics hour/day bucketing *(G7)* |
| `gap_detection_threshold_pct` | NUMERIC(5,2) | **NEW** Default `40.0` — utilisation % below which gap detection fires *(G8)* |
| `max_gap_discount_pct` | NUMERIC(5,2) | **NEW** Default `30.0` — cap on AI-generated discounts *(G8)* |
| `churn_inactive_days_threshold` | INTEGER | **NEW** Default `30` — days without booking before churn flag *(G8)* |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `operating_hours`
**Changes from current:** Add `valid_from`, `valid_until` for seasonal hour variations. *(Migration group G2)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `day_of_week` | SMALLINT | 0 = Monday … 6 = Sunday |
| `open_time` | TIME | |
| `close_time` | TIME | |
| `valid_from` | DATE | **NEW** Nullable — seasonal start date |
| `valid_until` | DATE | **NEW** Nullable — seasonal end date |

---

### `pricing_rules`
No changes from current state.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `label` | VARCHAR(50) | |
| `day_of_week` | SMALLINT | 0 = Monday … 6 = Sunday |
| `start_time` | TIME | |
| `end_time` | TIME | |
| `valid_from` | DATE | Nullable |
| `valid_until` | DATE | Nullable |
| `is_active` | BOOLEAN | Default `true` |
| `price_per_slot` | NUMERIC(10,2) | |
| `surge_trigger_pct` | NUMERIC(5,2) | Nullable |
| `surge_max_pct` | NUMERIC(5,2) | Nullable |
| `low_demand_trigger_pct` | NUMERIC(5,2) | Nullable |
| `low_demand_min_pct` | NUMERIC(5,2) | Nullable |
| `incentive_price` | NUMERIC(10,2) | Nullable |
| `incentive_label` | VARCHAR(100) | Nullable |
| `incentive_expires_at` | TIMESTAMPTZ | Nullable |

---

## 4. Courts

### `courts`
No changes from current state.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `name` | VARCHAR(100) | |
| `surface_type` | ENUM | `indoor`, `outdoor`, `crystal`, `artificial_grass` |
| `has_lighting` | BOOLEAN | Default `false` |
| `lighting_surcharge` | NUMERIC(10,2) | Nullable |
| `is_active` | BOOLEAN | Default `true` |

---

## 5. Bookings

### `bookings`
**Changes from current:** Add skill level filters for open games, invite confirmation tracking, recurring series self-reference, discount attribution, AI scores, tournament linkage, and campaign linkage. A tournament match is just a booking with `booking_type = 'tournament'` and a `tournament_id` FK — there is no separate `tournament_matches` table. *(Migration groups G3, G4, G5, G6, G9, G11)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `court_id` | UUID | FK → `courts` |
| `booking_type` | ENUM | `regular`, `lesson_individual`, `lesson_group`, `corporate_event`, `tournament`, `open_game` — **NEW: `open_game`** |
| `status` | ENUM | `pending`, `confirmed`, `cancelled`, `completed` |
| `start_datetime` | TIMESTAMPTZ | |
| `end_datetime` | TIMESTAMPTZ | |
| `created_by_user_id` | UUID | FK → `users` |
| `staff_profile_id` | UUID | FK → `staff_profiles`, nullable |
| `tournament_id` | UUID | **NEW** FK → `tournaments`, nullable — set when `booking_type = 'tournament'` *(G11)* |
| `tournament_round` | INTEGER | **NEW** Nullable — tournament round number when applicable *(G11)* |
| `tournament_match_label` | VARCHAR(50) | **NEW** Nullable — e.g. `"Semi-final A"` *(G11)* |
| `parent_booking_id` | UUID | **NEW** FK → `bookings` (self-ref) — head of recurring series, nullable |
| `event_name` | VARCHAR(255) | Nullable |
| `contact_name` | VARCHAR(255) | Nullable |
| `contact_email` | VARCHAR(255) | Nullable |
| `contact_phone` | VARCHAR(50) | Nullable |
| `max_players` | INTEGER | Nullable |
| `min_skill_level` | NUMERIC(3,1) | **NEW** Nullable — open game floor |
| `max_skill_level` | NUMERIC(3,1) | **NEW** Nullable — open game ceiling |
| `notes` | TEXT | Nullable |
| `total_price` | NUMERIC(10,2) | Nullable |
| `is_open_game` | BOOLEAN | Default `false` |
| `is_recurring` | BOOLEAN | Default `false` |
| `recurrence_rule` | TEXT | iCal RRULE, nullable |
| `recurrence_end_date` | DATE | Nullable — inclusive end date for the recurring series; null = indefinite |
| `video_upload_path` | VARCHAR(500) | GCS path, nullable |
| `discount_amount` | NUMERIC(10,2) | **NEW** Nullable *(G4)* |
| `discount_source` | ENUM | **NEW** Nullable — `membership`, `campaign`, `promo_code`, `staff_manual`, `ai_gap_offer` *(G4)* |
| `hold_expires_at` | TIMESTAMPTZ | **NEW** Nullable — court-level hold deadline (created `now()+5min`); cleared when the first player pays. Null = live booking with a paid player or a staff booking (always blocks the court). Drives conflict-check exclusion + sweep cancellation *(G4.1)* |
| `promo_code_id` | UUID | **NEW** FK → `promo_codes`, nullable |
| `membership_subscription_id` | UUID | **NEW** FK → `membership_subscriptions`, nullable *(G4)* |
| `campaign_id` | UUID | **NEW** FK → `campaigns`, nullable |
| `cancellation_risk_score` | NUMERIC(4,3) | **NEW** Nullable — AI prediction 0–1, denormalised from `cancellation_predictions` *(G9)* |
| `cancellation_risk_scored_at` | TIMESTAMPTZ | **NEW** Nullable *(G9)* |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes (existing + new):**
- `ix_bookings_court_window (court_id, start_datetime, end_datetime)` — conflict detection *(existing)*
- `ix_bookings_club_status (club_id, status)` *(existing)*
- `ix_bookings_club_start (club_id, start_datetime)` *(existing)*
- `ix_bookings_cancellation_risk (club_id, cancellation_risk_score DESC) WHERE cancellation_risk_score > 0.6` **NEW**
- `ix_bookings_tournament (tournament_id, tournament_round)` — fast lookup of all matches in a tournament round **NEW** *(G11)*

---

### `booking_players`
**Changes from current:** Add `invite_status` *(G3)*; add `discount_amount`, `discount_source` *(G4 — implemented Sprint 5)*. Tournament partners use the same `booking_players` rows — no separate partner table.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK → `bookings` |
| `user_id` | UUID | FK → `users` |
| `role` | ENUM | `organiser`, `player` |
| `payment_status` | ENUM | `pending`, `paid`, `refunded` |
| `amount_due` | NUMERIC(10,2) | |
| `discount_amount` | NUMERIC(10,2) | **NEW** Nullable — per-player discount applied at invite/booking time *(G4)* |
| `discount_source` | ENUM | **NEW** Nullable — `membership`, `campaign`, `promo_code`, `staff_manual`, `ai_gap_offer` *(G4)* |
| `invite_status` | ENUM | **NEW** `pending`, `accepted`, `declined` — default `accepted` for organiser *(G3)* |
| `team` | ENUM | **NEW** Nullable — `team1`, `team2` — used for tournament/doubles match bookings *(G11)* |
| `payment_deadline` | TIMESTAMPTZ | **NEW** Nullable — slot-level hold deadline (set `now()+5min` when a player commits an unpaid slot); cleared on payment. Drives freeing the slot only (booking survives if another player has paid). Staff/credit-paid slots get none *(G4.1)* |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(booking_id, user_id)`

**Indexes (new):**
- `ix_booking_players_deadline (payment_deadline) WHERE payment_status = 'pending'` — partial index; serves the expiry-sweep hot path *(G4.1)*

---

### `waitlist_entries` *(NEW TABLE — Migration group G3)*
Players queuing for a slot. Notified automatically when a matching slot opens.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `court_id` | UUID | FK → `courts`, nullable — null = any court |
| `user_id` | UUID | FK → `users` |
| `desired_date` | DATE | |
| `desired_start_time` | TIME | Nullable — null = any time on that date |
| `desired_end_time` | TIME | Nullable |
| `status` | ENUM | `waiting`, `offered`, `booked`, `expired` |
| `offered_booking_id` | UUID | FK → `bookings`, nullable — slot offered |
| `offer_expires_at` | TIMESTAMPTZ | Nullable |
| `notified_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 6. Staff & Trainers

### `staff_profiles`
No changes from current state.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `club_id` | UUID | FK → `clubs` |
| `role` | ENUM | `trainer`, `ops_lead`, `admin`, `front_desk` |
| `bio` | TEXT | Nullable |
| `is_active` | BOOLEAN | Default `true` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `trainer_availability`
No changes from current state.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `staff_profile_id` | UUID | FK → `staff_profiles` |
| `day_of_week` | SMALLINT | 0 = Monday … 6 = Sunday |
| `start_time` | TIME | |
| `end_time` | TIME | |
| `set_by_user_id` | UUID | FK → `users` |
| `effective_from` | DATE | |
| `effective_until` | DATE | Nullable |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 7. Equipment

### `equipment_inventory`
**Changes from current:** None in scope. *(The `reorder_threshold` column — added for AI purchase-order prediction — was **descoped 2026-05-29**. Per the G5 reconciliation decision (2026-05-30), it is **intentionally retained** in the model and DB rather than dropped; it is currently unused.)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `item_type` | ENUM | `racket`, `ball_tube`, `other` |
| `name` | VARCHAR(100) | |
| `quantity_total` | INTEGER | |
| `quantity_available` | INTEGER | |
| `rental_price` | NUMERIC(10,2) | |
| `condition` | ENUM | `good`, `fair`, `damaged`, `retired` |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

> **Descoped 2026-05-29:** `reorder_threshold` (`INTEGER` Nullable) was added for AI purchase-order prediction, which is no longer on the roadmap. Per the G5 reconciliation decision (2026-05-30), the column is **intentionally retained** in the DB (unused) rather than dropped.

---

### `equipment_rentals`
**Changes from current:** Add `damage_charge` for in-app recovery billing, `payment_status`, `payment_id`. *(Migration group G5)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK → `bookings` |
| `equipment_id` | UUID | FK → `equipment_inventory` |
| `user_id` | UUID | FK → `users` |
| `quantity` | INTEGER | |
| `charge` | NUMERIC(10,2) | |
| `payment_status` | ENUM | **NEW** `pending`, `paid`, `refunded` |
| `payment_id` | UUID | **NEW** FK → `payments`, nullable |
| `damage_reported` | BOOLEAN | Default `false` |
| `damage_notes` | TEXT | Nullable |
| `damage_charge` | NUMERIC(10,2) | **NEW** Nullable — recovery cost charged to player |
| `returned_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

> **Descoped 2026-05-29:** `equipment_maintenance_log` and `equipment_replacement_predictions` (both formerly G10) are removed from the target state — all equipment & maintenance AI is dropped from the roadmap. Reintroduce only if a real customer asks, revisiting this note first.

---

## 8. Payments & Billing

### `payments`
**Changes from current:** Add `club_id` (for scoping), `failure_reason`, `retry_count`, `next_retry_at` (for auto-retry), `anomaly_flagged`, `anomaly_reason` (AI fraud detection), `dispute_status`. *(Migration group G4)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK → `bookings` |
| `user_id` | UUID | FK → `users` |
| `club_id` | UUID | **NEW** FK → `clubs` — denormalised for scoping |
| `stripe_payment_intent_id` | VARCHAR(255) | Nullable |
| `stripe_charge_id` | VARCHAR(255) | Nullable — platform-side charge id (`ch_xxx`) |
| `stripe_destination_payment_id` | VARCHAR(255) | Nullable — connected-account-side payment id (`py_xxx`) for destination-charge Connect flow; indexed; used by `payout.paid` to stamp `stripe_payout_id` |
| `amount` | NUMERIC(10,2) | |
| `currency` | VARCHAR(3) | Default `"GBP"` |
| `payment_method` | ENUM | `stripe_card`, `wallet`, `cash`, `account_credit` |
| `state` | ENUM | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded` |
| `refund_amount` | NUMERIC(10,2) | Nullable |
| `notes` | TEXT | Nullable |
| `stripe_invoice_id` | VARCHAR(255) | Nullable |
| `stripe_receipt_url` | VARCHAR(500) | Nullable |
| `pdf_storage_path` | VARCHAR(500) | Nullable |
| `failure_reason` | TEXT | **NEW** Nullable |
| `retry_count` | INTEGER | **NEW** Default `0` |
| `next_retry_at` | TIMESTAMPTZ | **NEW** Nullable |
| `anomaly_flagged` | BOOLEAN | **NEW** Default `false` |
| `anomaly_reason` | TEXT | **NEW** Nullable |
| `dispute_status` | ENUM | **NEW** Nullable — `open`, `under_review`, `won`, `lost` |
| `stripe_payout_id` | VARCHAR(255) | **NEW** Nullable — populated via `payout.paid` webhook; indexed |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `platform_fees` *(NEW TABLE — Migration group G4)*
SmashBook's fee ledger per transaction. Enables per-tenant revenue reconciliation.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → `tenants` |
| `payment_id` | UUID | FK → `payments` |
| `fee_type` | ENUM | `booking_fee`, `revenue_share`, `third_party_share` |
| `amount` | NUMERIC(10,2) | |
| `pct_applied` | NUMERIC(5,2) | Rate at time of transaction |
| `created_at` | TIMESTAMPTZ | |

---

## 9. Wallet

### `wallets`
**Changes from current:** Add auto-topup fields to support the AI membership tier suggestion feature. *(Migration group G4)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users`, UNIQUE |
| `balance` | NUMERIC(10,2) | Default `0.00` |
| `currency` | VARCHAR(3) | Default `"GBP"` |
| `auto_topup_enabled` | BOOLEAN | **NEW** Default `false` |
| `auto_topup_threshold` | NUMERIC(10,2) | **NEW** Nullable — top up when balance falls below this |
| `auto_topup_amount` | NUMERIC(10,2) | **NEW** Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `wallet_transactions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `wallet_id` | UUID | FK → `wallets` |
| `transaction_type` | ENUM | `top_up`, `debit`, `refund`, `adjustment` |
| `amount` | NUMERIC(10,2) | Always positive |
| `balance_after` | NUMERIC(10,2) | Snapshot |
| `reference` | VARCHAR(255) | Nullable |
| `notes` | TEXT | Nullable |
| `source_type` | ENUM | **NEW** `booking`, `membership`, `invoice`, `manual` — migration `80803a6bae79` ✅ Applied |
| `source_id` | UUID | **NEW** Nullable — no DB FK; points to the source record — migration `80803a6bae79` ✅ Applied |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `wallet_club_debts` **NEW** ✅ Applied (`3a758d32ab8d`)
Platform's obligation to transfer wallet-debit funds to club Stripe Connect accounts.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | **NEW** FK → `clubs`, indexed |
| `tenant_id` | UUID | **NEW** FK → `tenants` |
| `wallet_transaction_id` | UUID | **NEW** FK → `wallet_transactions`, unique |
| `amount` | NUMERIC(10,2) | **NEW** Gross amount owed to club |
| `platform_fee_amount` | NUMERIC(10,2) | **NEW** Platform's cut (`tenant.booking_fee_pct`) |
| `stripe_transfer_id` | VARCHAR(255) | **NEW** Nullable — filled on settlement |
| `settled_at` | TIMESTAMPTZ | **NEW** Nullable — null = outstanding |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 10. Skill Tracking & Match Results

### `skill_level_history`
**Changes from current:** Add `club_id` (was removed in last simplification, needed for club-scoped skill queries), `change_source` enum, `ai_inference_id`. *(Migration group G6)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `club_id` | UUID | **NEW** FK → `clubs` |
| `previous_level` | NUMERIC(3,1) | Nullable |
| `new_level` | NUMERIC(3,1) | |
| `change_source` | ENUM | **NEW** `staff_manual`, `ai_auto`, `match_result` |
| `assigned_by` | UUID | FK → `users`, nullable — null when `change_source = ai_auto` |
| `ai_inference_id` | UUID | **NEW** FK → `ai_inference_log`, nullable |
| `reason` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `match_results` *(NEW TABLE — Migration group G11)*
Post-match outcome record. Source of truth for ELO/TrueSkill updates and AI training recommendations. Used for both regular bookings and tournament-bracket bookings.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK → `bookings` |
| `club_id` | UUID | FK → `clubs` |
| `recorded_by` | UUID | FK → `users` |
| `score_team1` | VARCHAR(50) | e.g. "6-4, 7-5" |
| `score_team2` | VARCHAR(50) | |
| `winner_side` | ENUM | `team1`, `team2`, `draw` |
| `duration_minutes` | INTEGER | Nullable |
| `notes` | TEXT | Nullable |
| `ai_inference_id` | UUID | FK → `ai_inference_log`, nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `match_result_players` *(NEW TABLE — Migration group G11)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `match_result_id` | UUID | FK → `match_results` |
| `user_id` | UUID | FK → `users` |
| `team` | ENUM | `team1`, `team2` |
| `skill_before` | NUMERIC(3,1) | Snapshot at match time |
| `skill_after` | NUMERIC(3,1) | Nullable — set after ELO pipeline runs |
| `skill_delta` | NUMERIC(4,2) | Nullable |
| `created_at` | TIMESTAMPTZ | |

---

### `training_recommendations` *(NEW TABLE — Migration group G12)*
AI-generated per-player training suggestions from match analysis (Phase 3).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `club_id` | UUID | FK → `clubs` |
| `match_result_id` | UUID | FK → `match_results`, nullable |
| `recommendation_text` | TEXT | Natural language from Anthropic API |
| `focus_areas` | TEXT[] | e.g. `["net play", "backhand volley"]` |
| `status` | ENUM | `draft`, `sent`, `read`, `dismissed` |
| `ai_inference_id` | UUID | FK → `ai_inference_log` |
| `created_at` | TIMESTAMPTZ | |

---

## 11. Memberships

### `membership_plans`
**Changes from current:** Add `is_default` to mark the free basic plan auto-assigned at player registration *(Migration group G6.1)*; add `sort_order` for display. Pricing moves out to `membership_plan_pricing` (multiple billing intervals per plan). Perks **stay as columns** — no separate perks table until a real customer asks for a perk that can't be expressed in a column. *(Migration group G10)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `name` | VARCHAR(100) | |
| `description` | TEXT | Nullable |
| `booking_credits_per_period` | INTEGER | Not null — `0` = no credits |
| `guest_passes_per_period` | INTEGER | Nullable |
| `discount_pct` | NUMERIC(5,2) | Nullable — % off court bookings |
| `priority_booking_days` | INTEGER | Nullable — extra advance-booking window beyond club default |
| `max_active_members` | INTEGER | Nullable — enrollment cap; `NULL` = unlimited |
| `trial_days` | INTEGER | Default `0` |
| `is_default` | BOOLEAN | **NEW** Default `false` — exactly one per club is the free "basic" plan auto-assigned at player registration. Enforced by partial unique index `(club_id) WHERE is_default = TRUE`. *(G6.1)* |
| `is_active` | BOOLEAN | Default `true` |
| `sort_order` | INTEGER | **NEW** For display ordering |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

> **Migration note:** The current `billing_period`, `price`, and `stripe_price_id` columns will be migrated to `membership_plan_pricing` (one row per interval per plan), then dropped. Perks (`discount_pct`, `booking_credits_per_period`, `guest_passes_per_period`, `priority_booking_days`, `max_active_members`, `trial_days`) **remain on this table** — they cover the perk shapes padel clubs actually use. If a customer later asks for a perk that needs structure (e.g. tiered discounts by court type), introduce a perks table at that point, not pre-emptively.

---

### `membership_plan_pricing` *(NEW TABLE — Migration group G10)*
One row per billing interval per plan. Replaces monolithic price/billing fields on `membership_plans`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `membership_plan_id` | UUID | FK → `membership_plans` |
| `interval` | ENUM | `monthly`, `quarterly`, `annual` |
| `price` | NUMERIC(10,2) | |
| `currency` | VARCHAR(3) | Default `"GBP"` |
| `stripe_price_id` | VARCHAR(255) | Nullable — Stripe recurring Price ID |
| `is_active` | BOOLEAN | Default `true` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(membership_plan_id, interval)`

---

### `membership_subscriptions`
**Changes from current:** Add `pending_plan_id` to record a scheduled downgrade target applied at `current_period_end` *(Migration group G6.2 — applied `fa46b223afc9`)*. Add `plan_pricing_id` to reference which pricing tier the subscriber chose. *(Migration group G10)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `plan_id` | UUID | FK → `membership_plans` |
| `plan_pricing_id` | UUID | **NEW** FK → `membership_plan_pricing` |
| `club_id` | UUID | FK → `clubs` |
| `status` | ENUM | `trialing`, `active`, `paused`, `cancelled`, `expired` |
| `current_period_start` | TIMESTAMPTZ | |
| `current_period_end` | TIMESTAMPTZ | |
| `cancel_at_period_end` | BOOLEAN | Default `false` |
| `cancelled_at` | TIMESTAMPTZ | Nullable |
| `credits_remaining` | INTEGER | Not null — `0` = none remaining |
| `guest_passes_remaining` | INTEGER | Nullable |
| `stripe_subscription_id` | VARCHAR(255) | Nullable |
| `pending_plan_id` | UUID | FK → `membership_plans`, nullable — scheduled downgrade target, applied at `current_period_end` *(G6.2)* |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Partial unique index:** `UNIQUE(user_id, club_id) WHERE status = 'active'`

---

### `membership_credit_logs`
No changes from current state.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `subscription_id` | UUID | FK → `membership_subscriptions` |
| `booking_id` | UUID | FK → `bookings`, nullable |
| `credit_type` | ENUM | `booking_credit`, `guest_pass` |
| `delta` | INTEGER | Negative = used; positive = restored |
| `balance_after` | INTEGER | Snapshot |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |

---

## 12. Tournaments

A tournament is a parent record. Each match within a tournament is a regular `bookings` row with `booking_type = 'tournament'`, a `tournament_id` FK, and optionally `tournament_round` / `tournament_match_label`. Players and partners go in `booking_players` with the `team` field set. Scores go in `match_results`. There is **no** separate `tournament_matches` table.

### `tournaments` *(NEW TABLE — Migration group G11)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `name` | VARCHAR(255) | |
| `description` | TEXT | Nullable |
| `format` | ENUM | `round_robin`, `single_elimination`, `double_elimination`, `americano`, `mexicano` |
| `status` | ENUM | `draft`, `open`, `in_progress`, `completed`, `cancelled` |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `registration_deadline` | TIMESTAMPTZ | Nullable |
| `min_skill_level` | NUMERIC(3,1) | Nullable |
| `max_skill_level` | NUMERIC(3,1) | Nullable |
| `max_participants` | INTEGER | Nullable |
| `entry_fee` | NUMERIC(10,2) | Default `0.00` |
| `prize_description` | TEXT | Nullable |
| `created_by` | UUID | FK → `users` |
| `auto_arrange_matches` | BOOLEAN | Default `false` — AI auto-arranges draw when true |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `tournament_registrations` *(NEW TABLE — Migration group G11)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tournament_id` | UUID | FK → `tournaments` |
| `user_id` | UUID | FK → `users` |
| `partner_user_id` | UUID | FK → `users`, nullable — doubles partner |
| `status` | ENUM | `registered`, `waitlisted`, `withdrawn`, `disqualified` |
| `payment_status` | ENUM | `pending`, `paid`, `refunded` |
| `payment_id` | UUID | FK → `payments`, nullable |
| `seed` | INTEGER | Nullable |
| `registered_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 13. Messaging, Chat & Support

Support tickets and casual player↔club chat are the **same domain** — both are threads of messages between players, staff, and the AI assistant. The `category` field on `support_tickets` distinguishes the use cases: `support` (formal ticket), `chat` (casual conversation), `booking_inquiry` (booking-related Q&A that may resolve into a booking). One inbox model, one query path.

### `announcements` *(NEW TABLE — Migration group G6)*
Club-wide posts visible to all players.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `author_user_id` | UUID | FK → `users` |
| `title` | VARCHAR(255) | |
| `body` | TEXT | |
| `is_published` | BOOLEAN | Default `false` |
| `published_at` | TIMESTAMPTZ | Nullable |
| `expires_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `support_tickets` *(NEW TABLE — Migration group G6; `category` and supporting fields added in G12)*
Unified threads table for support, casual chat, and booking inquiries.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `user_id` | UUID | FK → `users` |
| `booking_id` | UUID | FK → `bookings`, nullable |
| `category` | ENUM | **NEW** *(G12)* `support`, `chat`, `booking_inquiry` — default `support` |
| `subject` | VARCHAR(255) | Nullable — required for `support`, optional for `chat` |
| `status` | ENUM | `open`, `in_progress`, `resolved`, `closed` |
| `priority` | ENUM | `low`, `medium`, `high` — `medium` default for `support`, ignored for `chat` |
| `assigned_to` | UUID | FK → `users`, nullable |
| `handled_by` | ENUM | `staff`, `ai`, `hybrid` — default `staff` |
| `resolution_summary` | TEXT | Nullable |
| `resolved_at` | TIMESTAMPTZ | Nullable |
| `last_message_at` | TIMESTAMPTZ | **NEW** *(G12)* Nullable — denormalised for inbox sort |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

> **Inbox queries:** Staff inbox filters by `category` and `status`. The player-facing chat UI loads tickets where `category IN ('chat', 'booking_inquiry')`. The support dashboard loads tickets where `category = 'support'`.

---

### `support_messages` *(NEW TABLE — Migration group G6; `intent` and `booking_id` added in G12 for chat use cases)*
Single message table covering support replies, chat messages, and AI-assistant turns.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `ticket_id` | UUID | FK → `support_tickets` |
| `sender_user_id` | UUID | FK → `users`, nullable — null = AI agent |
| `sender_type` | ENUM | `player`, `staff`, `ai` |
| `body` | TEXT | |
| `intent` | VARCHAR(100) | **NEW** *(G12)* Nullable — e.g. `"book_court"`, `"cancel_booking"`, `"faq"` — extracted by AI on inbound player messages |
| `booking_id` | UUID | **NEW** *(G12)* FK → `bookings`, nullable — set when a booking was created via this message |
| `ai_inference_id` | UUID | FK → `ai_inference_log`, nullable — set when `sender_type = ai` or when AI extracted an intent |
| `created_at` | TIMESTAMPTZ | |

> **AI note:** When a player sends an inbound message, the Anthropic API extracts an `intent` and writes it on the message row. Intent drives routing: `book_court` invokes the booking service (and links the resulting booking via `booking_id`), `faq` invokes the knowledge base, `support` keeps the message in-thread for staff response. There is no separate `chat_messages` table.

---

## 14. Discounts & Promo Codes

### `promo_codes` *(NEW TABLE — Migration group G6)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `code` | VARCHAR(50) | UNIQUE per club |
| `description` | TEXT | Nullable |
| `discount_type` | ENUM | `percentage`, `fixed_amount` |
| `discount_value` | NUMERIC(10,2) | |
| `max_uses` | INTEGER | Nullable — null = unlimited |
| `uses_count` | INTEGER | Default `0` |
| `max_uses_per_player` | INTEGER | Nullable |
| `valid_from` | TIMESTAMPTZ | Nullable |
| `valid_until` | TIMESTAMPTZ | Nullable |
| `applies_to` | ENUM | `all`, `off_peak`, `open_game`, `lesson`, `tournament` |
| `min_booking_value` | NUMERIC(10,2) | Nullable |
| `is_active` | BOOLEAN | Default `true` |
| `created_by` | UUID | FK → `users` |
| `campaign_id` | UUID | FK → `campaigns`, nullable — if generated by a campaign |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(club_id, code)`

---

## 15. Calendar Reservations

### `calendar_reservations` *(NEW TABLE — Migration group G5)*
Staff-created blocks that restrict booking on the calendar. The `maintenance` type fully blocks a court (replacing the former `court_blackouts` table). Supports training blocks, private hire, maintenance windows, tournament holds, and recurring reservations. All reservation types are blocking.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `court_id` | UUID | FK → `courts`, nullable — null = applies to all courts |
| `reservation_type` | ENUM | `training_block`, `private_hire`, `maintenance`, `tournament_hold` |
| `title` | VARCHAR(255) | |
| `start_datetime` | TIMESTAMPTZ | |
| `end_datetime` | TIMESTAMPTZ | |
| `allowed_booking_types` | TEXT[] | Nullable — null = all types permitted |
| `is_recurring` | BOOLEAN | Default `false` |
| `recurrence_rule` | TEXT | iCal RRULE, nullable |
| `recurrence_end_date` | DATE | Nullable — inclusive end date for the recurring series; null = indefinite |
| `created_by` | UUID | FK → `users` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 16. AI Infrastructure

### `ai_inference_log` *(NEW TABLE — Migration group G8)*
Every call to any AI model is logged here before its output is used. **Append-only. Partition by `created_at` month in production from day one — adding partitioning to a large existing table later is painful.** Archive payloads to Cloud Storage after 90 days; retain metadata rows indefinitely.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs`, nullable — null for tenant-level calls |
| `tenant_id` | UUID | FK → `tenants` |
| `feature` | VARCHAR(100) | e.g. `"dynamic_pricing"`, `"gap_detection"`, `"churn_scoring"` |
| `model_provider` | ENUM | `anthropic`, `vertex_ai`, `internal` |
| `model_name` | VARCHAR(100) | e.g. `"claude-sonnet-4-20250514"` |
| `model_version` | VARCHAR(50) | Nullable |
| `prompt_tokens` | INTEGER | Nullable |
| `completion_tokens` | INTEGER | Nullable |
| `total_tokens` | INTEGER | Nullable |
| `latency_ms` | INTEGER | |
| `input_hash` | VARCHAR(64) | SHA-256 of input — for dedup and cache detection |
| `input_payload` | JSONB | Full input |
| `output_payload` | JSONB | Full output |
| `fallback_used` | BOOLEAN | Default `false` — true when model was unavailable and rule-based fallback ran |
| `error` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |

---

### `ai_feature_flags` *(NEW TABLE — Migration group G8)*
**Sole source of truth** for AI feature gating. Plan-level defaults are seeded as rows when a tenant is provisioned (one row per AI feature, `is_enabled` set from plan default). Staff can then toggle features or tune parameters per tenant without a schema change.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → `tenants` |
| `feature` | VARCHAR(100) | Must match values used in `ai_inference_log.feature` |
| `is_enabled` | BOOLEAN | Default `false` |
| `config` | JSONB | Nullable — e.g. `{"min_gap_hours": 2, "max_discount_pct": 25}` |
| `enabled_at` | TIMESTAMPTZ | Nullable |
| `enabled_by` | UUID | FK → `users`, nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(tenant_id, feature)`

> **Recognised AI features (seed list, extensible without schema change):** `dynamic_pricing`, `payment_anomaly_detection`, `revenue_forecasting`, `gap_detection`, `smart_notifications`, `personalised_slot_suggestions`, `cancellation_prediction`, `skill_auto_update`, `matchmaking`, `churn_scoring`, `re_engagement_campaigns`, `ai_staffing_recommendations`, `membership_tier_suggestions`, `ai_support_chatbot`, `conversational_booking`, `training_recommendations`, `video_analysis`, `competitor_pricing_intel`. *(Descoped 2026-05-29: `weather_aware_alerts`, `equipment_replacement_prediction`, `ai_maintenance_scheduling`.)*

---

## 17. Player Profiles & Engagement Scoring

### `player_profiles` *(NEW TABLE — Migration group G9)*
AI-managed preference and behaviour profile — one per user per club. Built automatically from booking history and match results. The `embedding` column is the input to matchmaking and Fill the Court.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `club_id` | UUID | FK → `clubs` |
| `preferred_days` | INTEGER[] | Day-of-week values the player typically books (0=Mon…6=Sun) |
| `preferred_start_hour` | SMALLINT | Nullable — 0–23 |
| `preferred_end_hour` | SMALLINT | Nullable |
| `preferred_surface` | ENUM | Nullable — `SurfaceType` |
| `avg_bookings_per_month` | NUMERIC(5,2) | Computed by scoring pipeline |
| `last_booking_at` | TIMESTAMPTZ | Nullable — denormalised from `bookings` for churn query speed |
| `lifetime_bookings` | INTEGER | Default `0` |
| `lifetime_spend` | NUMERIC(12,2) | Default `0.00` |
| `embedding` | vector(384) | pgvector — generated nightly by Vertex AI text-embedding model |
| `embedding_updated_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(user_id, club_id)`

**Index:** `ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` — approximate nearest-neighbour search for matchmaking

> **Prerequisite:** Requires `CREATE EXTENSION IF NOT EXISTS vector` in the migration. On Cloud SQL, enable the `cloudsql.enable_pgvector` flag before running this migration.

---

### `player_engagement_scores` *(NEW TABLE — Migration group G9)*
Append-only. One row per daily scoring run per player per club. Never upsert — historical scores are retained for model evaluation.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `club_id` | UUID | FK → `clubs` |
| `churn_risk_score` | NUMERIC(4,3) | 0.000–1.000 — AI-generated by Vertex AI |
| `engagement_score` | NUMERIC(4,3) | Composite of recency, frequency, spend |
| `days_since_booking` | INTEGER | Snapshot at score time |
| `bookings_last_30d` | INTEGER | |
| `bookings_last_90d` | INTEGER | |
| `avg_spend_last_90d` | NUMERIC(10,2) | Nullable |
| `score_version` | VARCHAR(20) | Model version string — for evaluation tracking |
| `ai_inference_id` | UUID | FK → `ai_inference_log` |
| `scored_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

**Index:** `ix_engagement_club_churn (club_id, churn_risk_score DESC) WHERE churn_risk_score > 0.5`

---

### `cancellation_predictions` *(NEW TABLE — Migration group G9)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK → `bookings` |
| `club_id` | UUID | FK → `clubs` |
| `risk_score` | NUMERIC(4,3) | 0–1 |
| `risk_factors` | JSONB | Nullable — e.g. `{"lead_time_short": true, "first_time_player": false, "prior_cancellations": 2}` |
| `player_prompted_at` | TIMESTAMPTZ | Nullable — when player was asked to confirm/release |
| `player_response` | ENUM | Nullable — `confirmed`, `released` |
| `player_responded_at` | TIMESTAMPTZ | Nullable |
| `waitlist_notified` | BOOLEAN | Default `false` |
| `ai_inference_id` | UUID | FK → `ai_inference_log` |
| `scored_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

---

## 18. Campaigns

> **Scope decision (May 2026 simplification):** v1 campaigns is a **single table** with a saved-query `target_filter` JSONB. Structured player segmentation (separate `player_segments` and `player_segment_memberships` tables) is deferred until real club demand reveals what to segment by. Campaign messages and delivery tracking go through the unified `message_deliveries` table — there is no `campaign_messages` and no `campaign_deliveries`.

### `campaigns` *(NEW TABLE — Migration group G10)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `name` | VARCHAR(255) | |
| `campaign_type` | ENUM | `re_engagement`, `flash_sale`, `waitlist_fill`, `onboarding`, `churn_prevention`, `custom` |
| `status` | ENUM | `draft`, `scheduled`, `running`, `completed`, `cancelled` |
| `trigger_type` | ENUM | `manual`, `scheduled`, `ai_triggered`, `event_driven` |
| `trigger_event` | VARCHAR(100) | Nullable — e.g. `"gap_detected"`, `"churn_risk_threshold"` |
| `target_filter` | JSONB | Saved query — e.g. `{"churn_score_gte": 0.6, "last_booking_before": "2026-03-01", "tags": ["competitive"]}`. Empty = all players. |
| `min_churn_score` | NUMERIC(4,3) | Nullable — convenience column also reflected in `target_filter` |
| `max_churn_score` | NUMERIC(4,3) | Nullable |
| `channel` | ENUM | `push`, `email`, `sms`, `in_app` — primary send channel |
| `subject` | VARCHAR(255) | Nullable — email only |
| `body_text` | TEXT | Message body |
| `body_html` | TEXT | Nullable |
| `discount_pct` | NUMERIC(5,2) | Nullable |
| `promo_code_id` | UUID | FK → `promo_codes`, nullable |
| `ai_drafted` | BOOLEAN | Default `false` — true when Anthropic drafted the message |
| `ai_audience_selected` | BOOLEAN | Default `false` — true when AI built the `target_filter` |
| `ai_prompt_used` | TEXT | Nullable — prompt that generated the draft |
| `ai_model_version` | VARCHAR(50) | Nullable |
| `is_approved` | BOOLEAN | Default `false` — must be approved before send |
| `scheduled_at` | TIMESTAMPTZ | Nullable |
| `sent_at` | TIMESTAMPTZ | Nullable |
| `created_by` | UUID | FK → `users` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

> **Delivery tracking:** Per-player send results are written to `message_deliveries` with `source = 'campaign'` and `campaign_id` set. To compute open/click/conversion rates for a campaign, aggregate `message_deliveries WHERE campaign_id = ?`.

---

## 19. Notifications & Outreach

### `notification_templates` *(NEW TABLE — Migration group G9)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs`, nullable — null = platform-level default |
| `template_key` | VARCHAR(100) | Unique per club — e.g. `"booking_confirmed"`, `"gap_offer"` |
| `channel` | ENUM | `push`, `email`, `sms`, `in_app` |
| `subject` | VARCHAR(255) | Nullable — email only |
| `body_template` | TEXT | Handlebars-style `{{variable}}` substitution |
| `available_vars` | JSONB | Schema of valid interpolation variables |
| `is_ai_generated` | BOOLEAN | Default `false` |
| `version` | INTEGER | Auto-incremented on each edit |
| `is_active` | BOOLEAN | Default `true` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `message_deliveries` *(NEW TABLE — Migration group G9)*
**Unified delivery record** for every outbound message — system notifications (template-driven) and campaign sends alike. Replaces the separate `notification_deliveries` and `campaign_deliveries` tables in the previous design.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `club_id` | UUID | FK → `clubs` |
| `source` | ENUM | `template`, `campaign` — distinguishes which subsystem generated this send |
| `template_id` | UUID | FK → `notification_templates`, nullable — set when `source = 'template'` |
| `campaign_id` | UUID | FK → `campaigns`, nullable — set when `source = 'campaign'` |
| `channel` | ENUM | `push`, `email`, `sms`, `in_app` |
| `notification_type` | VARCHAR(100) | e.g. `"booking_reminder"`, `"gap_offer"`, `"churn_winback"`, `"campaign_send"` |
| `subject` | VARCHAR(255) | Nullable — rendered |
| `body` | TEXT | Rendered with variables substituted |
| `status` | ENUM | `pending`, `sent`, `delivered`, `opened`, `clicked`, `bounced`, `unsubscribed`, `failed` |
| `sent_at` | TIMESTAMPTZ | Nullable |
| `delivered_at` | TIMESTAMPTZ | Nullable |
| `opened_at` | TIMESTAMPTZ | Nullable |
| `clicked_at` | TIMESTAMPTZ | Nullable |
| `converted_at` | TIMESTAMPTZ | Nullable — e.g. made a booking after a campaign send |
| `conversion_type` | VARCHAR(50) | Nullable — e.g. `"booking"` |
| `external_id` | VARCHAR(255) | Nullable — provider message ID |
| `error` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:**
- `UNIQUE(campaign_id, user_id) WHERE campaign_id IS NOT NULL` — one send per player per campaign
- `CHECK ((source = 'template' AND template_id IS NOT NULL) OR (source = 'campaign' AND campaign_id IS NOT NULL))`

**Indexes:**
- `ix_msg_user_club (user_id, club_id, notification_type, created_at DESC)` — player inbox
- `ix_msg_campaign (campaign_id) WHERE campaign_id IS NOT NULL` — campaign analytics rollup

---

## 20. Utilisation & Gap Detection

### `court_utilisation_snapshots` *(NEW TABLE — Migration group G7)*
Hourly utilisation snapshots per court. Primary input to gap detection and dynamic pricing models. Written by a scheduled worker, never by the API request path.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `court_id` | UUID | FK → `courts` |
| `snapshot_date` | DATE | |
| `hour_of_day` | SMALLINT | 0–23; null = daily rollup |
| `day_of_week` | SMALLINT | 0=Mon … 6=Sun |
| `total_slots` | INTEGER | Available bookable slots in this window |
| `booked_slots` | INTEGER | |
| `utilisation_pct` | NUMERIC(5,2) | Computed: `booked / total * 100` |
| `revenue_actual` | NUMERIC(10,2) | |
| `revenue_potential` | NUMERIC(10,2) | Revenue at 100% base rate |
| `avg_booking_lead_time_h` | NUMERIC(6,1) | Avg hours in advance bookings were made |
| `created_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(court_id, snapshot_date, hour_of_day)`

> **Why a physical snapshot here (but not for the other analytics reports):** `total_slots` and `revenue_potential` depend on operating-hours and pricing config *as they were at snapshot time*. If a club later changes hours or prices, those historical figures can't be reconstructed — so they must be captured. This is the **one** analytics table that needs to be a snapshot.

> **Analytics reports = materialized views, not snapshot tables (G7):** The remaining analytics reports (revenue-by-site, rolling-30-day active players, new sign-ups/month, player LTV, most-active players, churner list, coach popularity + return rate, community-event participation, RFV pre-aggregate) all read immutable operational rows (`payments`, `bookings`, `booking_players`, `users`, `membership_subscriptions`) and are served by **materialized views refreshed by the analytics worker** — no new ORM tables. Per design principle #7, add a physical rollup table (e.g. `club_metrics_daily`) only if MV refresh latency is measured to be a problem. Full report specs live in [`app/analytics/docs/REPORT_CATALOG.md`](../backend/app/analytics/docs/REPORT_CATALOG.md) and [`MATERIALIZED_VIEWS.md`](../backend/app/analytics/docs/MATERIALIZED_VIEWS.md). The Epic-2 demographics and catchment-map reports additionally depend on the aspirational `users.date_of_birth` / `gender` / `postcode` / `latitude` / `longitude` columns (also G7).

---

### `gap_detection_events` *(NEW TABLE — Migration group G9)*
An AI-detected gap event triggers the discount and notification pipeline. The `status` lifecycle tracks the gap from detection through to outcome.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `court_id` | UUID | FK → `courts` |
| `gap_start` | TIMESTAMPTZ | Start of underbooked window |
| `gap_end` | TIMESTAMPTZ | End of underbooked window |
| `utilisation_at_detect` | NUMERIC(5,2) | % booked when detected |
| `status` | ENUM | `detected`, `offer_generated`, `notified`, `filled`, `expired` |
| `discount_offer_pct` | NUMERIC(5,2) | Nullable — AI-generated discount |
| `offer_expires_at` | TIMESTAMPTZ | Nullable |
| `players_notified` | INTEGER | Default `0` |
| `bookings_generated` | INTEGER | Default `0` |
| `revenue_recovered` | NUMERIC(10,2) | Default `0.00` |
| `ai_inference_id` | UUID | FK → `ai_inference_log` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 21. AI Recommendations Engine

> **Architectural decision deferred to Sprint 10.** See the "Simplification Notes" section at the top of this file. The shape below is a placeholder for the **inbox-only** variant of `ai_recommendations` — staff-facing review queue, with structured action data living in the feature-specific tables (`gap_detection_events`, `cancellation_predictions`). Confirm the final design before writing the G10 migration.

### `ai_recommendations` *(NEW TABLE — Migration group G10)*
Staff-facing inbox for AI-generated suggestions across every feature type. The structured action data lives in the originating feature table; this row is the review queue entry. `source_event_id` is the foreign key into that feature table.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `recommendation_type` | ENUM | `price_adjustment`, `gap_discount`, `re_engagement_outreach`, `staffing_change`, `membership_upsell`, `competitor_price_alert`, `anomaly_alert`, `cancellation_risk_alert`, `training_recommendation` *(equipment/maintenance values descoped 2026-05-29)* |
| `status` | ENUM | `pending`, `approved`, `rejected`, `actioned`, `expired` |
| `priority` | ENUM | `low`, `medium`, `high`, `critical` |
| `title` | VARCHAR(255) | |
| `rationale` | TEXT | Natural language explanation from AI |
| `source_event_id` | UUID | Nullable — FK to originating feature row (gap, churn score, etc.). Resolves polymorphically based on `recommendation_type`. |
| `expected_impact` | JSONB | Nullable — e.g. `{"revenue_uplift": 120.00, "confidence": 0.82}` |
| `reviewed_by` | UUID | FK → `users`, nullable |
| `reviewed_at` | TIMESTAMPTZ | Nullable |
| `actioned_at` | TIMESTAMPTZ | Nullable |
| `expires_at` | TIMESTAMPTZ | Nullable |
| `ai_inference_id` | UUID | FK → `ai_inference_log` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 22. Video Analysis

### `video_analyses` *(NEW TABLE — Migration group G12)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK → `bookings` |
| `club_id` | UUID | FK → `clubs` |
| `video_path` | VARCHAR(500) | GCS path to source footage |
| `status` | ENUM | `queued`, `processing`, `completed`, `failed` |
| `highlights_path` | VARCHAR(500) | Nullable — edited highlights clip on GCS |
| `rally_count` | INTEGER | Nullable |
| `avg_rally_length` | NUMERIC(5,1) | Nullable — shots per rally |
| `top_speed_kmh` | NUMERIC(5,1) | Nullable |
| `analysis_json` | JSONB | Full structured output from Vertex AI Vision |
| `summary_text` | TEXT | Nullable — Anthropic-generated NL summary |
| `ai_inference_id` | UUID | FK → `ai_inference_log` |
| `processed_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 23. Market Intelligence

### `competitor_price_snapshots` *(NEW TABLE — Migration group G12)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` — the SmashBook club this intel is for |
| `competitor_name` | VARCHAR(255) | |
| `competitor_url` | VARCHAR(500) | Nullable |
| `surface_type` | ENUM | Nullable — `SurfaceType` |
| `price_per_slot` | NUMERIC(10,2) | |
| `slot_duration_minutes` | INTEGER | |
| `day_type` | ENUM | `weekday`, `weekend`, `peak`, `off_peak` |
| `snapshot_at` | TIMESTAMPTZ | |
| `source` | ENUM | `web_scrape`, `manual_entry`, `api` |
| `ai_inference_id` | UUID | FK → `ai_inference_log`, nullable |
| `created_at` | TIMESTAMPTZ | |

---

## 24. Enumerations

All new enums must be created in Alembic migrations **before** the columns that use them.

| Enum | Values | Migration group |
|---|---|---|
| `TenantUserRole` | `owner`, `admin`, `staff`, `trainer`, `ops_lead`, `viewer`, `player` | existing |
| `StaffRole` | `trainer`, `ops_lead`, `admin`, `front_desk` | existing |
| `SurfaceType` | `indoor`, `outdoor`, `crystal`, `artificial_grass` | existing |
| `BookingType` | `regular`, `lesson_individual`, `lesson_group`, `corporate_event`, `tournament`, **`open_game`** | G3 — add `open_game` |
| `BookingStatus` | `pending`, `confirmed`, `cancelled`, `completed` | existing |
| `PlayerRole` | `organiser`, `player` | existing |
| `PaymentStatus` | `pending`, `paid`, `refunded` | existing |
| `PaymentMethod` | `stripe_card`, `wallet`, `cash`, `account_credit` | existing |
| `PaymentState` | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded` | existing |
| `WalletTransactionType` | `top_up`, `debit`, `refund`, `adjustment` | existing |
| `WalletTransactionSource` | `booking`, `membership`, `invoice`, `manual` | migration `80803a6bae79` ✅ Applied |
| `ItemType` | `racket`, `ball_tube`, `other` | existing |
| `ItemCondition` | `good`, `fair`, `damaged`, `retired` | existing |
| `BillingPeriod` | `monthly`, `annual` — **kept for backwards compatibility; new pricing uses `MembershipInterval`** | existing |
| `MembershipStatus` | `trialing`, `active`, `paused`, `cancelled`, `expired` | existing |
| `CreditType` | `booking_credit`, `guest_pass` | existing |
| `NotificationChannel` | `push`, `email`, `sms`, `in_app` | G1 |
| `Gender` | `male`, `female`, `other`, `prefer_not_to_say` | G7 |
| `InviteStatus` | `pending`, `accepted`, `declined` | G3 |
| `WaitlistStatus` | `waiting`, `offered`, `booked`, `expired` | G3 |
| `DiscountSource` | `membership`, `campaign`, `promo_code`, `staff_manual`, `ai_gap_offer` | G4 |
| `DisputeStatus` | `open`, `under_review`, `won`, `lost` | G4 |
| `PlatformFeeType` | `booking_fee`, `revenue_share`, `third_party_share` | G4 |
| `PromoDiscountType` | `percentage`, `fixed_amount` | G6 |
| `PromoAppliesTo` | `all`, `off_peak`, `open_game`, `lesson`, `tournament` | G6 |
| `CalendarReservationType` | `training_block`, `private_hire`, `maintenance`, `tournament_hold` | G5 |
| `SupportTicketStatus` | `open`, `in_progress`, `resolved`, `closed` | G6 |
| `SupportTicketPriority` | `low`, `medium`, `high` | G6 |
| `SupportTicketCategory` | `support`, `chat`, `booking_inquiry` | G12 |
| `SupportHandledBy` | `staff`, `ai`, `hybrid` | G6 |
| `MessageSenderType` | `player`, `staff`, `ai` | G6 |
| `MessageDeliverySource` | `template`, `campaign` | G9 |
| `ModelProvider` | `anthropic`, `vertex_ai`, `internal` | G8 |
| `SkillChangeSource` | `staff_manual`, `ai_auto`, `match_result` | G6 |
| `GapStatus` | `detected`, `offer_generated`, `notified`, `filled`, `expired` | G9 |
| `CampaignType` | `re_engagement`, `flash_sale`, `waitlist_fill`, `onboarding`, `churn_prevention`, `custom` | G10 |
| `CampaignStatus` | `draft`, `scheduled`, `running`, `completed`, `cancelled` | G10 |
| `CampaignTriggerType` | `manual`, `scheduled`, `ai_triggered`, `event_driven` | G10 |
| `DeliveryStatus` | `pending`, `sent`, `delivered`, `opened`, `clicked`, `bounced`, `unsubscribed`, `failed` | G9 |
| `RecommendationType` | `price_adjustment`, `gap_discount`, `re_engagement_outreach`, `staffing_change`, `membership_upsell`, `competitor_price_alert`, `anomaly_alert`, `cancellation_risk_alert`, `training_recommendation` | G10 |
| `RecommendationStatus` | `pending`, `approved`, `rejected`, `actioned`, `expired` | G10 |
| `RecommendationPriority` | `low`, `medium`, `high`, `critical` | G10 |
| `MembershipInterval` | `monthly`, `quarterly`, `annual` | G10 |
| `TournamentFormat` | `round_robin`, `single_elimination`, `double_elimination`, `americano`, `mexicano` | G11 |
| `TournamentStatus` | `draft`, `open`, `in_progress`, `completed`, `cancelled` | G11 |
| `TournamentRegistrationStatus` | `registered`, `waitlisted`, `withdrawn`, `disqualified` | G11 |
| `MatchWinnerSide` | `team1`, `team2`, `draw` | G11 |
| `MatchTeam` | `team1`, `team2` | G11 |
| `PlayerCancellationResponse` | `confirmed`, `released` | G9 |
| `TrainingRecommendationStatus` | `draft`, `sent`, `read`, `dismissed` | G12 |
| `VideoAnalysisStatus` | `queued`, `processing`, `completed`, `failed` | G12 |
| `CompetitorDataSource` | `web_scrape`, `manual_entry`, `api` | G12 |
| `CompetitorDayType` | `weekday`, `weekend`, `peak`, `off_peak` | G12 |

**Enums removed in May 2026 simplification (no longer used):** `SegmentType`, `ChatThreadStatus`, `TournamentMatchStatus`, `PerkType` — their parent tables (`player_segments`, `chat_threads`, `tournament_matches`, `membership_perks`) were dropped from the target state.

**Enums removed in the 2026-05-29 re-prioritisation:** `MaintenanceEventType`, `EquipmentReplacementStatus` — their parent tables (`equipment_maintenance_log`, `equipment_replacement_predictions`) were descoped along with all equipment & maintenance AI. The `equipment_order` and `maintenance_schedule` values were also removed from `RecommendationType`.

---

## 24a. Enumerations — Alembic Creation Pattern

New enums require explicit creation before the column. Always use this pattern:

```python
from sqlalchemy.dialects import postgresql

def upgrade():
    # 1. Create enum type
    my_enum = postgresql.ENUM('val1', 'val2', name='myenumname')
    my_enum.create(op.get_bind())

    # 2. Add column using it
    op.add_column('table', sa.Column(
        'col', sa.Enum('val1', 'val2', name='myenumname'), nullable=True
    ))

def downgrade():
    op.drop_column('table', 'col')
    op.execute('DROP TYPE IF EXISTS myenumname')
```

---

## 25. Indexes

Priority indexes to add alongside the tables that need them.

| Table | Index | Migration group |
|---|---|---|
| `bookings` | `ix_bookings_cancellation_risk (club_id, cancellation_risk_score DESC) WHERE cancellation_risk_score > 0.6` | G9 |
| `bookings` | `ix_bookings_tournament (tournament_id, tournament_round)` | G11 |
| `player_engagement_scores` | `ix_engagement_club_churn (club_id, churn_risk_score DESC) WHERE churn_risk_score > 0.5` | G9 |
| `player_engagement_scores` | `ix_engagement_user_club (user_id, club_id)` | G9 |
| `court_utilisation_snapshots` | `UNIQUE (court_id, snapshot_date, hour_of_day)` | G7 |
| `gap_detection_events` | `ix_gap_club_status (club_id, status) WHERE status IN ('detected','offer_generated','notified')` | G9 |
| `ai_recommendations` | `ix_rec_club_status_priority (club_id, status, priority)` | G10 |
| `ai_inference_log` | `ix_inference_club_feature (club_id, feature, created_at DESC)` | G8 |
| `message_deliveries` | `UNIQUE (campaign_id, user_id) WHERE campaign_id IS NOT NULL` | G9 |
| `message_deliveries` | `ix_msg_user_club (user_id, club_id, notification_type, created_at DESC)` | G9 |
| `message_deliveries` | `ix_msg_campaign (campaign_id) WHERE campaign_id IS NOT NULL` | G9 |
| `membership_subscriptions` | `UNIQUE (user_id, club_id) WHERE status = 'active'` — partial unique index | G10 |
| `membership_plan_pricing` | `UNIQUE (membership_plan_id, interval)` | G10 |
| `waitlist_entries` | `ix_waitlist_club_date (club_id, desired_date, status)` | G3 |
| `promo_codes` | `UNIQUE (club_id, code)` | G6 |
| `player_profiles` | `ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` | G9 |
| `ai_feature_flags` | `UNIQUE (tenant_id, feature)` | G8 |
| `support_tickets` | `ix_ticket_club_status (club_id, status, priority)` | G6 |
| `support_tickets` | `ix_ticket_category_last_msg (club_id, category, last_message_at DESC)` — inbox sort | G12 |

---

## 26. AI Feature → Table Mapping

Quick reference for Claude Code when implementing AI features: which tables to read from and write to.

| AI Feature | Sprint | Reads from | Writes to |
|---|---|---|---|
| Dynamic pricing | 8 | `pricing_rules`, `court_utilisation_snapshots` | `ai_inference_log` (price in-memory) |
| Payment anomaly detection | 8 | `payments` | `payments.anomaly_flagged`, `ai_recommendations`, `ai_inference_log` |
| Revenue forecasting | 8 | `court_utilisation_snapshots`, `payments` | `ai_recommendations`, `ai_inference_log` |
| Gap detection | 9 | `court_utilisation_snapshots`, `clubs` (config columns) | `gap_detection_events`, `ai_inference_log` |
| Smart notifications | 9 | `gap_detection_events`, `player_profiles` | `message_deliveries`, `ai_inference_log` |
| Personalised slot suggestions | 9 | `player_profiles`, `court_utilisation_snapshots` | `message_deliveries`, `ai_inference_log` |
| Cancellation prediction | 9 | `bookings`, `player_profiles` | `cancellation_predictions`, `bookings.cancellation_risk_score`, `ai_inference_log` |
| Matchmaking / Fill the Court | 9 | `player_profiles` (embedding), `bookings` | `bookings` (new record), `ai_inference_log` |
| Churn scoring | 9 | `bookings`, `player_profiles` | `player_engagement_scores`, `ai_inference_log` |
| Re-engagement campaigns | 10 | `player_engagement_scores`, `player_profiles`, `bookings` | `campaigns`, `message_deliveries`, `ai_inference_log` |
| AI staffing recommendations | 10 | `court_utilisation_snapshots`, `staff_profiles`, `trainer_availability` | `ai_recommendations`, `ai_inference_log` |
| Membership tier suggestions | 10 | `membership_subscriptions`, `player_profiles`, `wallet_transactions` | `ai_recommendations`, `message_deliveries`, `ai_inference_log` |
| Skill auto-update (ELO) | 11 | `match_results`, `match_result_players` | `users.skill_level`, `skill_level_history`, `ai_inference_log` |
| AI support chatbot | 12 | `support_tickets`, `support_messages`, `bookings` | `support_messages`, `support_tickets.handled_by`, `ai_inference_log` |
| Conversational booking | 12 | `bookings`, `courts`, `player_profiles` | `bookings`, `support_messages` (with `intent` + `booking_id`), `ai_inference_log` |
| Training recommendations | 12 | `match_results`, `skill_level_history` | `training_recommendations`, `ai_inference_log` |
| Video analysis | 12 | `video_analyses.video_path` (GCS) | `video_analyses`, `ai_inference_log` |
| Competitor pricing intel | 12 | external scrape | `competitor_price_snapshots`, `ai_recommendations`, `ai_inference_log` |

*(Descoped 2026-05-29: Weather-aware alerts, Equipment replacement prediction, AI maintenance scheduling.)*
