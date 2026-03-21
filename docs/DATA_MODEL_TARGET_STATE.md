_Last updated: 2026-03-21 00:00 UTC_

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
                                      ├──< court_blackouts (via courts)
                                      ├──< calendar_reservations
                                      ├──< staff_profiles ──< trainer_availability
                                      ├──< equipment_inventory ──< equipment_maintenance_log
                                      ├──< membership_plans ──< membership_subscriptions
                                      │                     └──< membership_credit_logs
                                      ├──< tournaments ──< tournament_registrations
                                      │               └──< tournament_matches
                                      ├──< promo_codes
                                      ├──< player_segments ──< player_segment_memberships
                                      ├──< campaigns ──< campaign_messages
                                      │            └──< campaign_deliveries
                                      ├──< notification_templates
                                      ├──< notification_deliveries
                                      ├──< court_utilisation_snapshots
                                      ├──< gap_detection_events
                                      ├──< ai_recommendations
                                      ├──< announcements
                                      ├──< support_tickets ──< support_messages
                                      └──< chat_threads ──< chat_messages

tenants ──< users ──< wallets ──< wallet_transactions
                 ├──< player_profiles (one per user per club)
                 ├──< player_engagement_scores
                 ├──< skill_level_history
                 └──< training_recommendations

ai_inference_log ◄── referenced by: gap_detection_events, ai_recommendations,
                     player_engagement_scores, player_segment_memberships,
                     skill_level_history, match_results, cancellation_predictions,
                     equipment_replacement_predictions, video_analyses,
                     competitor_price_snapshots, support_messages, chat_messages,
                     training_recommendations
```

---

## Migration Backlog Summary

Changes are grouped by the sprint that first needs them. Implement the group for a sprint before starting that sprint's feature work. All migrations are additive — columns are nullable or have server defaults unless noted.

| Group | Sprint needed | What changes |
|---|---|---|
| G1 | Sprint 1 | `users`: add `phone`, `photo_url`, `is_suspended`, `suspension_reason`, `default_payment_method_id`, `preferred_notification_channel` |
| G2 | Sprint 2 | `operating_hours`: add `valid_from`, `valid_until` for seasonal variations |
| G3 | Sprint 3 | `bookings`: add `min_skill_level`, `max_skill_level`, `invite_confirmed`; `booking_players`: add `invite_status`; new table: `waitlist_entries` |
| G4 | Sprint 4 | `payments`: add `failure_reason`, `retry_count`, `next_retry_at`, `anomaly_flagged`, `dispute_status`, `club_id`; new table: `platform_fees`; `wallets`: add `auto_topup_enabled`, `auto_topup_threshold`, `auto_topup_amount` |
| G5 | Sprint 5 | `bookings`: add `parent_booking_id` (self-ref for recurring series); new table: `calendar_reservations`; `equipment_rentals`: add `damage_charge`, `payment_status`, `payment_id`; `equipment_inventory`: add `reorder_threshold` |
| G6 | Sprint 6 | New tables: `promo_codes`, `announcements`, `support_tickets`, `support_messages`; `bookings`: add `promo_code_id`, `discount_amount`, `discount_source`; `skill_level_history`: add `change_source`, `club_id` |
| G7 | Sprint 7 | New tables: `ai_inference_log`, `ai_feature_flags`; `subscription_plans`: add AI feature flag columns; `clubs`: add `latitude`, `longitude`, `timezone`, `gap_detection_threshold_pct`, `max_gap_discount_pct`, `churn_inactive_days_threshold`, `weather_alerts_enabled` |
| G8 | Sprint 8 | New tables: `court_utilisation_snapshots`, `gap_detection_events`, `notification_templates`, `notification_deliveries`, `chat_threads`, `chat_messages`; `bookings`: add `cancellation_risk_score`, `weather_alert_sent`, `campaign_id` |
| G9 | Sprint 9 | New tables: `player_profiles` (with pgvector embedding), `player_engagement_scores`, `match_results`, `match_result_players`, `cancellation_predictions`; `bookings`: add `membership_subscription_id` |
| G10 | Sprint 10 | New tables: `player_segments`, `player_segment_memberships`, `campaigns`, `campaign_messages`, `campaign_deliveries`, `ai_recommendations`, `equipment_maintenance_log`, `equipment_replacement_predictions`; membership v2 split: add `membership_plan_pricing`, `membership_perks` |
| G11 | Sprint 11 | New tables: `training_recommendations`; `support_tickets`/`support_messages` AI fields; `chat_messages`: add `intent`, `ai_inference_id` |
| G12 | Sprint 12 | New tables: `tournaments`, `tournament_registrations`, `tournament_matches`, `video_analyses`, `competitor_price_snapshots` |

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
18. [Player Segmentation & Campaigns](#18-player-segmentation--campaigns)
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
**Changes from current:** Add AI feature flag columns and `tournaments_enabled`, `messaging_enabled`. *(Migration group G7)*

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
| `ai_dynamic_pricing` | BOOLEAN | **NEW** AI feature flag |
| `ai_gap_detection` | BOOLEAN | **NEW** AI feature flag |
| `ai_matchmaking` | BOOLEAN | **NEW** AI feature flag |
| `ai_churn_scoring` | BOOLEAN | **NEW** AI feature flag |
| `ai_conversational_booking` | BOOLEAN | **NEW** AI feature flag |
| `ai_video_analysis` | BOOLEAN | **NEW** AI feature flag |
| `price_per_month` | NUMERIC(10,2) | |
| `setup_fee` | NUMERIC(10,2) | Default `0` |
| `trial_days` | INTEGER | Default `0` |
| `booking_fee_pct` | NUMERIC(5,2) | Nullable |
| `revenue_share_pct` | NUMERIC(5,2) | Nullable |
| `third_party_revenue_share_pct` | NUMERIC(5,2) | Nullable |
| `overage_fee_per_booking` | NUMERIC(10,2) | Nullable |
| `max_api_calls_per_month` | INTEGER | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `tenants`
No changes from current state.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | VARCHAR(255) | |
| `subdomain` | VARCHAR(100) | UNIQUE |
| `custom_domain` | VARCHAR(255) | Nullable |
| `plan_id` | UUID | FK → `subscription_plans` |
| `is_active` | BOOLEAN | |
| `subscription_start_date` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 2. Users & Authentication

### `users`
**Changes from current:** Add `phone`, `photo_url`, `is_suspended`, `suspension_reason`, `default_payment_method_id`, `preferred_notification_channel`. *(Migration group G1)*

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
| `stripe_customer_id` | VARCHAR(255) | Nullable |
| `phone` | VARCHAR(50) | **NEW** Nullable |
| `photo_url` | VARCHAR(500) | **NEW** Nullable — GCS path |
| `is_suspended` | BOOLEAN | **NEW** Default `false` |
| `suspension_reason` | TEXT | **NEW** Nullable |
| `default_payment_method_id` | VARCHAR(255) | **NEW** Nullable — Stripe PaymentMethod ID |
| `preferred_notification_channel` | ENUM | **NEW** `push`, `email`, `sms`, `in_app` — default `push` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(tenant_id, email)`

---

## 3. Clubs & Configuration

### `clubs`
**Changes from current:** Add `latitude`, `longitude`, `timezone` (for weather integration), and AI operational config fields. *(Migration group G7)*

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
| `open_games_enabled` | BOOLEAN | Default `true` |
| `min_players_to_confirm` | INTEGER | Default `4` |
| `auto_cancel_hours_before` | INTEGER | Nullable |
| `cancellation_notice_hours` | INTEGER | Default `48` |
| `cancellation_refund_pct` | INTEGER | Default `100` |
| `reminder_hours_before` | INTEGER | Default `24` |
| `waitlist_enabled` | BOOLEAN | Default `true` |
| `latitude` | NUMERIC(10,7) | **NEW** Nullable — for weather API |
| `longitude` | NUMERIC(10,7) | **NEW** Nullable |
| `timezone` | VARCHAR(50) | **NEW** Default `"Europe/London"` |
| `gap_detection_threshold_pct` | NUMERIC(5,2) | **NEW** Default `40.0` — utilisation % below which gap detection fires |
| `max_gap_discount_pct` | NUMERIC(5,2) | **NEW** Default `30.0` — cap on AI-generated discounts |
| `churn_inactive_days_threshold` | INTEGER | **NEW** Default `30` — days without booking before churn flag |
| `weather_alerts_enabled` | BOOLEAN | **NEW** Default `true` |
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

### `court_blackouts`
No changes from current state.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `court_id` | UUID | FK → `courts` |
| `start_datetime` | TIMESTAMPTZ | |
| `end_datetime` | TIMESTAMPTZ | |
| `reason` | TEXT | Nullable |

---

## 5. Bookings

### `bookings`
**Changes from current:** Add skill level filters for open games, invite confirmation tracking, recurring series self-reference, discount attribution, AI scores, and campaign linkage. *(Migration groups G3, G5, G6, G8, G9)*

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
| `tournament_id` | UUID | **NEW** FK → `tournaments`, nullable |
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
| `video_upload_path` | VARCHAR(500) | GCS path, nullable |
| `discount_amount` | NUMERIC(10,2) | **NEW** Nullable |
| `discount_source` | ENUM | **NEW** Nullable — `membership`, `campaign`, `promo_code`, `staff_manual`, `ai_gap_offer` |
| `promo_code_id` | UUID | **NEW** FK → `promo_codes`, nullable |
| `membership_subscription_id` | UUID | **NEW** FK → `membership_subscriptions`, nullable |
| `campaign_id` | UUID | **NEW** FK → `campaigns`, nullable |
| `cancellation_risk_score` | NUMERIC(4,3) | **NEW** Nullable — AI prediction 0–1, denormalised from `cancellation_predictions` |
| `cancellation_risk_scored_at` | TIMESTAMPTZ | **NEW** Nullable |
| `weather_alert_sent` | BOOLEAN | **NEW** Default `false` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes (existing + new):**
- `ix_bookings_court_window (court_id, start_datetime, end_datetime)` — conflict detection *(existing)*
- `ix_bookings_club_status (club_id, status)` *(existing)*
- `ix_bookings_club_start (club_id, start_datetime)` *(existing)*
- `ix_bookings_cancellation_risk (club_id, cancellation_risk_score DESC) WHERE cancellation_risk_score > 0.6` **NEW**

---

### `booking_players`
**Changes from current:** Add `invite_status` to track whether invited players have accepted. *(Migration group G3)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK → `bookings` |
| `user_id` | UUID | FK → `users` |
| `role` | ENUM | `organiser`, `player` |
| `payment_status` | ENUM | `pending`, `paid`, `refunded` |
| `amount_due` | NUMERIC(10,2) | |
| `invite_status` | ENUM | **NEW** `pending`, `accepted`, `declined` — default `accepted` for organiser |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(booking_id, user_id)`

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
**Changes from current:** Add `reorder_threshold` for AI purchase order prediction. *(Migration group G5)*

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
| `reorder_threshold` | INTEGER | **NEW** Nullable — quantity below which AI triggers a purchase order |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

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

### `equipment_maintenance_log` *(NEW TABLE — Migration group G10)*
Maintenance events per piece of equipment or court. AI-initiated records carry `ai_inference_id`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `equipment_id` | UUID | FK → `equipment_inventory`, nullable — null = court-level event |
| `court_id` | UUID | FK → `courts`, nullable |
| `event_type` | ENUM | `routine_maintenance`, `repair`, `replacement`, `inspection`, `ai_recommendation` |
| `description` | TEXT | |
| `scheduled_at` | TIMESTAMPTZ | Nullable |
| `completed_at` | TIMESTAMPTZ | Nullable |
| `cost` | NUMERIC(10,2) | Nullable |
| `logged_by` | UUID | FK → `users`, nullable — null = AI-initiated |
| `ai_inference_id` | UUID | FK → `ai_inference_log`, nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `equipment_replacement_predictions` *(NEW TABLE — Migration group G10)*
AI-generated predictions for when equipment will need replacement or reorder.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `equipment_id` | UUID | FK → `equipment_inventory` |
| `predicted_replacement_date` | DATE | |
| `confidence_score` | NUMERIC(4,3) | 0–1 |
| `reasoning` | TEXT | Nullable — NL explanation |
| `status` | ENUM | `pending`, `approved`, `actioned`, `dismissed` |
| `ai_inference_id` | UUID | FK → `ai_inference_log` |
| `created_at` | TIMESTAMPTZ | |

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
| `stripe_charge_id` | VARCHAR(255) | Nullable |
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
No changes from current state.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `wallet_id` | UUID | FK → `wallets` |
| `transaction_type` | ENUM | `top_up`, `debit`, `refund`, `adjustment` |
| `amount` | NUMERIC(10,2) | Always positive |
| `balance_after` | NUMERIC(10,2) | Snapshot |
| `reference` | VARCHAR(255) | Nullable |
| `notes` | TEXT | Nullable |
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

### `match_results` *(NEW TABLE — Migration group G9)*
Post-match outcome record. Source of truth for ELO/TrueSkill updates and AI training recommendations.

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

### `match_result_players` *(NEW TABLE — Migration group G9)*

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

### `training_recommendations` *(NEW TABLE — Migration group G11)*
AI-generated per-player training suggestions from match analysis (Sprint 12).

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
**Changes from current:** Strip monolithic columns; pricing moves to `membership_plan_pricing`, perks move to `membership_perks`. The plan row itself becomes lean. *(Migration group G10)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `name` | VARCHAR(100) | |
| `description` | TEXT | Nullable |
| `is_active` | BOOLEAN | Default `true` |
| `sort_order` | INTEGER | **NEW** For display ordering |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

> **Migration note:** The columns `billing_period`, `price`, `trial_days`, `booking_credits_per_period`, `guest_passes_per_period`, `discount_pct`, `priority_booking_days`, `max_active_members`, `stripe_price_id` will be migrated to `membership_plan_pricing` and `membership_perks`. This is a destructive change — plan carefully, migrate data before dropping old columns.

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

---

### `membership_perks` *(NEW TABLE — Migration group G10)*
Defines the benefits of a plan. Replaces single discount_pct with a flexible perk system.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `membership_plan_id` | UUID | FK → `membership_plans` |
| `perk_type` | ENUM | `booking_discount`, `free_bookings_per_month`, `equipment_rental_discount`, `guest_passes`, `priority_booking_window` |
| `value` | NUMERIC(10,2) | Discount %, count, or days — interpreted by `perk_type` |
| `cap_per_month` | INTEGER | Nullable |
| `applies_to` | VARCHAR(100) | Nullable — e.g. `"off_peak"`, `"all"` |
| `description` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |

---

### `membership_subscriptions`
**Changes from current:** Add `plan_pricing_id` to reference which pricing tier the subscriber chose. *(Migration group G10)*

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
| `credits_remaining` | INTEGER | Nullable |
| `guest_passes_remaining` | INTEGER | Nullable |
| `stripe_subscription_id` | VARCHAR(255) | Nullable |
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

### `tournaments` *(NEW TABLE — Migration group G12)*

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

### `tournament_registrations` *(NEW TABLE — Migration group G12)*

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

### `tournament_matches` *(NEW TABLE — Migration group G12)*
Auto-generated when `auto_arrange_matches = true`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tournament_id` | UUID | FK → `tournaments` |
| `booking_id` | UUID | FK → `bookings`, nullable — scheduled court slot |
| `round` | INTEGER | |
| `match_label` | VARCHAR(50) | Nullable — e.g. "Semi-final A" |
| `player1_user_id` | UUID | FK → `users` |
| `player2_user_id` | UUID | FK → `users`, nullable — byes |
| `player1_partner_id` | UUID | FK → `users`, nullable |
| `player2_partner_id` | UUID | FK → `users`, nullable |
| `winner_user_id` | UUID | FK → `users`, nullable |
| `score` | VARCHAR(100) | Nullable |
| `status` | ENUM | `scheduled`, `in_progress`, `completed`, `walkover` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 13. Messaging, Chat & Support

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

### `support_tickets` *(NEW TABLE — Migration group G6)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `user_id` | UUID | FK → `users` |
| `booking_id` | UUID | FK → `bookings`, nullable |
| `subject` | VARCHAR(255) | |
| `status` | ENUM | `open`, `in_progress`, `resolved`, `closed` |
| `priority` | ENUM | `low`, `medium`, `high` |
| `assigned_to` | UUID | FK → `users`, nullable |
| `handled_by` | ENUM | `staff`, `ai`, `hybrid` — default `staff` |
| `resolution_summary` | TEXT | Nullable |
| `resolved_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `support_messages` *(NEW TABLE — Migration group G6)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `ticket_id` | UUID | FK → `support_tickets` |
| `sender_user_id` | UUID | FK → `users`, nullable — null = AI agent |
| `sender_type` | ENUM | `player`, `staff`, `ai` |
| `body` | TEXT | |
| `ai_inference_id` | UUID | FK → `ai_inference_log`, nullable — set when `sender_type = ai` |
| `created_at` | TIMESTAMPTZ | |

---

### `chat_threads` *(NEW TABLE — Migration group G8)*
Direct message threads between a player and the club (staff or AI chatbot).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `player_user_id` | UUID | FK → `users` |
| `subject` | VARCHAR(255) | Nullable |
| `status` | ENUM | `active`, `closed` |
| `last_message_at` | TIMESTAMPTZ | Nullable — denormalised for inbox sort |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `chat_messages` *(NEW TABLE — Migration group G8)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `thread_id` | UUID | FK → `chat_threads` |
| `sender_user_id` | UUID | FK → `users`, nullable — null = AI |
| `sender_type` | ENUM | `player`, `staff`, `ai` |
| `body` | TEXT | |
| `booking_id` | UUID | FK → `bookings`, nullable — booking created via this message |
| `intent` | VARCHAR(100) | Nullable — e.g. `"book_court"`, `"cancel_booking"`, `"faq"` — extracted by AI |
| `ai_inference_id` | UUID | FK → `ai_inference_log`, nullable |
| `created_at` | TIMESTAMPTZ | |

> **AI note:** `intent` is extracted by the Anthropic API on every inbound player message. It drives routing: booking intents go to the booking service, FAQ intents to the knowledge base, support intents raise a `support_ticket`.

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
Staff-created blocks that filter or restrict booking types on the calendar. Distinct from `court_blackouts` (which blocks all bookings on a court). Supports skill-level filters, training blocks, private hire, and recurring reservations.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `court_id` | UUID | FK → `courts`, nullable — null = applies to all courts |
| `reservation_type` | ENUM | `skill_filter`, `training_block`, `private_hire`, `maintenance`, `tournament_hold` |
| `title` | VARCHAR(255) | |
| `start_datetime` | TIMESTAMPTZ | |
| `end_datetime` | TIMESTAMPTZ | |
| `min_skill_level` | NUMERIC(3,1) | Nullable — only allow bookings at or above this level |
| `max_skill_level` | NUMERIC(3,1) | Nullable |
| `allowed_booking_types` | TEXT[] | Nullable — null = all types permitted |
| `is_recurring` | BOOLEAN | Default `false` |
| `recurrence_rule` | TEXT | iCal RRULE, nullable |
| `created_by` | UUID | FK → `users` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 16. AI Infrastructure

### `ai_inference_log` *(NEW TABLE — Migration group G7)*
Every call to any AI model is logged here before its output is used. **Append-only. Partition by `created_at` month in production.** Archive payloads to Cloud Storage after 90 days; retain metadata rows indefinitely.

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

### `ai_feature_flags` *(NEW TABLE — Migration group G7)*
Per-tenant, per-feature runtime on/off switch with optional config overrides. Extends `subscription_plans` AI flags with the ability to tune parameters per tenant without a schema change.

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
| `risk_factors` | JSONB | Nullable — e.g. `{"weather": true, "lead_time_short": false}` |
| `player_prompted_at` | TIMESTAMPTZ | Nullable — when player was asked to confirm/release |
| `player_response` | ENUM | Nullable — `confirmed`, `released` |
| `player_responded_at` | TIMESTAMPTZ | Nullable |
| `waitlist_notified` | BOOLEAN | Default `false` |
| `ai_inference_id` | UUID | FK → `ai_inference_log` |
| `scored_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

---

## 18. Player Segmentation & Campaigns

### `player_segments` *(NEW TABLE — Migration group G10)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `name` | VARCHAR(100) | e.g. `"Casual"`, `"Competitive"`, `"Corporate"`, `"At Risk"` |
| `description` | TEXT | Nullable |
| `segment_type` | ENUM | `manual`, `ai_generated`, `hybrid` |
| `color_hex` | VARCHAR(7) | Nullable — UI badge colour |
| `is_active` | BOOLEAN | Default `true` |
| `auto_assign_rules` | JSONB | Nullable — AI classifier rule set; null = manual only |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `player_segment_memberships` *(NEW TABLE — Migration group G10)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `club_id` | UUID | FK → `clubs` |
| `segment_id` | UUID | FK → `player_segments` |
| `assigned_by` | ENUM | `ai`, `staff` |
| `assigned_by_user_id` | UUID | FK → `users`, nullable — null when `assigned_by = ai` |
| `confidence_score` | NUMERIC(4,3) | Nullable — AI assignments only, 0–1 |
| `is_active` | BOOLEAN | Default `true` |
| `assigned_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

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
| `target_segment_ids` | UUID[] | FK → `player_segments` — empty = all players |
| `min_churn_score` | NUMERIC(4,3) | Nullable — only include players above this threshold |
| `max_churn_score` | NUMERIC(4,3) | Nullable — upper bound |
| `discount_pct` | NUMERIC(5,2) | Nullable |
| `promo_code_id` | UUID | FK → `promo_codes`, nullable |
| `scheduled_at` | TIMESTAMPTZ | Nullable |
| `sent_at` | TIMESTAMPTZ | Nullable |
| `created_by` | UUID | FK → `users` |
| `ai_drafted` | BOOLEAN | Default `false` — true when Anthropic drafted the message |
| `ai_audience_selected` | BOOLEAN | Default `false` — true when AI selected the audience |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `campaign_messages` *(NEW TABLE — Migration group G10)*

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `campaign_id` | UUID | FK → `campaigns` |
| `channel` | ENUM | `push`, `email`, `sms`, `in_app` |
| `subject` | VARCHAR(255) | Nullable — email only |
| `body_text` | TEXT | |
| `body_html` | TEXT | Nullable |
| `ai_prompt_used` | TEXT | Nullable — prompt that generated this draft |
| `ai_model_version` | VARCHAR(50) | Nullable |
| `edited_by_user_id` | UUID | FK → `users`, nullable — last staff editor |
| `is_approved` | BOOLEAN | Default `false` — must be approved before send |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `campaign_deliveries` *(NEW TABLE — Migration group G10)*
One row per player per campaign send. Full delivery, open, click, and conversion tracking.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `campaign_id` | UUID | FK → `campaigns` |
| `user_id` | UUID | FK → `users` |
| `channel` | ENUM | `push`, `email`, `sms`, `in_app` |
| `status` | ENUM | `pending`, `sent`, `delivered`, `opened`, `clicked`, `bounced`, `unsubscribed` |
| `sent_at` | TIMESTAMPTZ | Nullable |
| `opened_at` | TIMESTAMPTZ | Nullable |
| `clicked_at` | TIMESTAMPTZ | Nullable |
| `converted_at` | TIMESTAMPTZ | Nullable — e.g. made a booking after the campaign |
| `conversion_type` | VARCHAR(50) | Nullable — e.g. `"booking"` |
| `external_msg_id` | VARCHAR(255) | Nullable — provider message ID |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(campaign_id, user_id)`

---

## 19. Notifications & Outreach

### `notification_templates` *(NEW TABLE — Migration group G8)*

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

### `notification_deliveries` *(NEW TABLE — Migration group G8)*
Single delivery record for every notification sent — system and campaign alike.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `club_id` | UUID | FK → `clubs` |
| `template_id` | UUID | FK → `notification_templates`, nullable |
| `campaign_id` | UUID | FK → `campaigns`, nullable |
| `channel` | ENUM | `push`, `email`, `sms`, `in_app` |
| `notification_type` | VARCHAR(100) | e.g. `"booking_reminder"`, `"gap_offer"`, `"churn_winback"` |
| `subject` | VARCHAR(255) | Nullable — rendered |
| `body` | TEXT | Rendered with variables substituted |
| `status` | ENUM | `pending`, `sent`, `delivered`, `opened`, `clicked`, `bounced`, `failed` |
| `sent_at` | TIMESTAMPTZ | Nullable |
| `delivered_at` | TIMESTAMPTZ | Nullable |
| `opened_at` | TIMESTAMPTZ | Nullable |
| `external_id` | VARCHAR(255) | Nullable — provider message ID |
| `error` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 20. Utilisation & Gap Detection

### `court_utilisation_snapshots` *(NEW TABLE — Migration group G8)*
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

---

### `gap_detection_events` *(NEW TABLE — Migration group G8)*
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

### `ai_recommendations` *(NEW TABLE — Migration group G10)*
Unified store for all AI-generated recommendations across every feature type. Staff review and action recommendations via this table.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `recommendation_type` | ENUM | `price_adjustment`, `gap_discount`, `re_engagement_outreach`, `staffing_change`, `equipment_order`, `maintenance_schedule`, `segment_reassignment`, `membership_upsell`, `competitor_price_alert`, `anomaly_alert`, `cancellation_risk_alert`, `training_recommendation` |
| `status` | ENUM | `pending`, `approved`, `rejected`, `actioned`, `expired` |
| `priority` | ENUM | `low`, `medium`, `high`, `critical` |
| `title` | VARCHAR(255) | |
| `rationale` | TEXT | Natural language explanation from AI |
| `action_payload` | JSONB | Structured action data (schema varies by `recommendation_type`) |
| `expected_impact` | JSONB | Nullable — e.g. `{"revenue_uplift": 120.00, "confidence": 0.82}` |
| `reviewed_by` | UUID | FK → `users`, nullable |
| `reviewed_at` | TIMESTAMPTZ | Nullable |
| `actioned_at` | TIMESTAMPTZ | Nullable |
| `expires_at` | TIMESTAMPTZ | Nullable |
| `ai_inference_id` | UUID | FK → `ai_inference_log` |
| `source_event_id` | UUID | Nullable — FK to originating event (gap, churn score, etc.) |
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
| `ItemType` | `racket`, `ball_tube`, `other` | existing |
| `ItemCondition` | `good`, `fair`, `damaged`, `retired` | existing |
| `BillingPeriod` | `monthly`, `annual` | existing — extended by `quarterly` in G10 |
| `MembershipStatus` | `trialing`, `active`, `paused`, `cancelled`, `expired` | existing |
| `CreditType` | `booking_credit`, `guest_pass` | existing |
| `NotificationChannel` | `push`, `email`, `sms`, `in_app` | G1 |
| `InviteStatus` | `pending`, `accepted`, `declined` | G3 |
| `WaitlistStatus` | `waiting`, `offered`, `booked`, `expired` | G3 |
| `DiscountSource` | `membership`, `campaign`, `promo_code`, `staff_manual`, `ai_gap_offer` | G6 |
| `DisputeStatus` | `open`, `under_review`, `won`, `lost` | G4 |
| `PlatformFeeType` | `booking_fee`, `revenue_share`, `third_party_share` | G4 |
| `PromoDiscountType` | `percentage`, `fixed_amount` | G6 |
| `PromoAppliesTo` | `all`, `off_peak`, `open_game`, `lesson`, `tournament` | G6 |
| `CalendarReservationType` | `skill_filter`, `training_block`, `private_hire`, `maintenance`, `tournament_hold` | G5 |
| `SupportTicketStatus` | `open`, `in_progress`, `resolved`, `closed` | G6 |
| `SupportTicketPriority` | `low`, `medium`, `high` | G6 |
| `SupportHandledBy` | `staff`, `ai`, `hybrid` | G6 |
| `MessageSenderType` | `player`, `staff`, `ai` | G6 |
| `ModelProvider` | `anthropic`, `vertex_ai`, `internal` | G7 |
| `SkillChangeSource` | `staff_manual`, `ai_auto`, `match_result` | G6 |
| `GapStatus` | `detected`, `offer_generated`, `notified`, `filled`, `expired` | G8 |
| `CampaignType` | `re_engagement`, `flash_sale`, `waitlist_fill`, `onboarding`, `churn_prevention`, `custom` | G10 |
| `CampaignStatus` | `draft`, `scheduled`, `running`, `completed`, `cancelled` | G10 |
| `CampaignTriggerType` | `manual`, `scheduled`, `ai_triggered`, `event_driven` | G10 |
| `SegmentType` | `manual`, `ai_generated`, `hybrid` | G10 |
| `DeliveryStatus` | `pending`, `sent`, `delivered`, `opened`, `clicked`, `bounced`, `unsubscribed`, `failed` | G10 |
| `RecommendationType` | `price_adjustment`, `gap_discount`, `re_engagement_outreach`, `staffing_change`, `equipment_order`, `maintenance_schedule`, `segment_reassignment`, `membership_upsell`, `competitor_price_alert`, `anomaly_alert`, `cancellation_risk_alert`, `training_recommendation` | G10 |
| `RecommendationStatus` | `pending`, `approved`, `rejected`, `actioned`, `expired` | G10 |
| `RecommendationPriority` | `low`, `medium`, `high`, `critical` | G10 |
| `MaintenanceEventType` | `routine_maintenance`, `repair`, `replacement`, `inspection`, `ai_recommendation` | G10 |
| `EquipmentReplacementStatus` | `pending`, `approved`, `actioned`, `dismissed` | G10 |
| `MembershipInterval` | `monthly`, `quarterly`, `annual` | G10 |
| `PerkType` | `booking_discount`, `free_bookings_per_month`, `equipment_rental_discount`, `guest_passes`, `priority_booking_window` | G10 |
| `TournamentFormat` | `round_robin`, `single_elimination`, `double_elimination`, `americano`, `mexicano` | G12 |
| `TournamentStatus` | `draft`, `open`, `in_progress`, `completed`, `cancelled` | G12 |
| `TournamentMatchStatus` | `scheduled`, `in_progress`, `completed`, `walkover` | G12 |
| `MatchWinnerSide` | `team1`, `team2`, `draw` | G9 |
| `MatchTeam` | `team1`, `team2` | G9 |
| `PlayerCancellationResponse` | `confirmed`, `released` | G9 |
| `TrainingRecommendationStatus` | `draft`, `sent`, `read`, `dismissed` | G11 |
| `VideoAnalysisStatus` | `queued`, `processing`, `completed`, `failed` | G12 |
| `CompetitorDataSource` | `web_scrape`, `manual_entry`, `api` | G12 |
| `CompetitorDayType` | `weekday`, `weekend`, `peak`, `off_peak` | G12 |
| `ChatThreadStatus` | `active`, `closed` | G8 |

---

## 25. Enumerations — Alembic Creation Pattern

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

## 26. Indexes

Priority indexes to add alongside the tables that need them.

| Table | Index | Migration group |
|---|---|---|
| `bookings` | `ix_bookings_cancellation_risk (club_id, cancellation_risk_score DESC) WHERE cancellation_risk_score > 0.6` | G8 |
| `player_engagement_scores` | `ix_engagement_club_churn (club_id, churn_risk_score DESC) WHERE churn_risk_score > 0.5` | G9 |
| `player_engagement_scores` | `ix_engagement_user_club (user_id, club_id)` | G9 |
| `court_utilisation_snapshots` | `UNIQUE (court_id, snapshot_date, hour_of_day)` | G8 |
| `gap_detection_events` | `ix_gap_club_status (club_id, status) WHERE status IN ('detected','offer_generated','notified')` | G8 |
| `ai_recommendations` | `ix_rec_club_status_priority (club_id, status, priority)` | G10 |
| `ai_inference_log` | `ix_inference_club_feature (club_id, feature, created_at DESC)` | G7 |
| `campaign_deliveries` | `UNIQUE (campaign_id, user_id)` | G10 |
| `player_segment_memberships` | `ix_segment_active (user_id, club_id) WHERE is_active = true` | G10 |
| `membership_subscriptions` | `UNIQUE (user_id, club_id) WHERE status = 'active'` — partial unique index | G10 |
| `notification_deliveries` | `ix_notif_user_club (user_id, club_id, notification_type, created_at DESC)` | G8 |
| `waitlist_entries` | `ix_waitlist_club_date (club_id, desired_date, status)` | G3 |
| `promo_codes` | `UNIQUE (club_id, code)` | G6 |
| `player_profiles` | `ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` | G9 |
| `ai_feature_flags` | `UNIQUE (tenant_id, feature)` | G7 |
| `support_tickets` | `ix_ticket_club_status (club_id, status, priority)` | G6 |

---

## 27. AI Feature → Table Mapping

Quick reference for Claude Code when implementing AI features: which tables to read from and write to.

| AI Feature | Sprint | Reads from | Writes to |
|---|---|---|---|
| Dynamic pricing | 7 | `pricing_rules`, `court_utilisation_snapshots` | `ai_inference_log` (price in-memory) |
| Payment anomaly detection | 7 | `payments` | `payments.anomaly_flagged`, `ai_recommendations`, `ai_inference_log` |
| Revenue forecasting | 7 | `court_utilisation_snapshots`, `payments` | `ai_recommendations`, `ai_inference_log` |
| Gap detection | 8 | `court_utilisation_snapshots`, `club_settings (clubs)` | `gap_detection_events`, `ai_inference_log` |
| Smart notifications | 8 | `gap_detection_events`, `player_profiles`, `player_segment_memberships` | `notification_deliveries`, `ai_inference_log` |
| Personalised slot suggestions | 8 | `player_profiles`, `court_utilisation_snapshots` | `notification_deliveries`, `ai_inference_log` |
| Weather-aware alerts | 8 | `bookings`, weather API (external) | `notification_deliveries`, `bookings.weather_alert_sent`, `ai_inference_log` |
| Cancellation prediction | 9 | `bookings`, `player_profiles` | `cancellation_predictions`, `bookings.cancellation_risk_score`, `ai_inference_log` |
| Skill auto-update (ELO) | 9 | `match_results`, `match_result_players` | `users.skill_level`, `skill_level_history`, `ai_inference_log` |
| Matchmaking / Fill the Court | 9 | `player_profiles` (embedding), `bookings` | `bookings` (new record), `ai_inference_log` |
| Churn scoring | 10 | `bookings`, `player_profiles` | `player_engagement_scores`, `ai_inference_log` |
| Player segmentation | 10 | `player_engagement_scores`, `bookings` | `player_segment_memberships`, `ai_inference_log` |
| Re-engagement campaigns | 10 | `player_segment_memberships`, `player_engagement_scores` | `campaigns`, `campaign_messages`, `campaign_deliveries`, `ai_inference_log` |
| Equipment replacement prediction | 10 | `equipment_inventory`, `equipment_rentals`, `equipment_maintenance_log` | `equipment_replacement_predictions`, `ai_recommendations`, `ai_inference_log` |
| AI maintenance scheduling | 10 | `court_utilisation_snapshots`, `equipment_maintenance_log` | `ai_recommendations`, `ai_inference_log` |
| AI staffing recommendations | 10 | `court_utilisation_snapshots`, `staff_profiles`, `trainer_availability` | `ai_recommendations`, `ai_inference_log` |
| Membership tier suggestions | 10 | `membership_subscriptions`, `player_profiles`, `wallet_transactions` | `ai_recommendations`, `notification_deliveries`, `ai_inference_log` |
| AI support chatbot | 11 | `support_tickets`, `support_messages`, `bookings` | `support_messages`, `support_tickets.handled_by`, `ai_inference_log` |
| Conversational booking | 11 | `bookings`, `courts`, `player_profiles` | `bookings`, `chat_messages`, `ai_inference_log` |
| Training recommendations | 12 | `match_results`, `skill_level_history` | `training_recommendations`, `ai_inference_log` |
| Video analysis | 12 | `video_analyses.video_path` (GCS) | `video_analyses`, `ai_inference_log` |
| Competitor pricing intel | 12 | external scrape | `competitor_price_snapshots`, `ai_recommendations`, `ai_inference_log` |
