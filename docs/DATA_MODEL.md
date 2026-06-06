_Last updated: 2026-06-05 18:00 UTC_

# SmashBook Data Model

## Overview

SmashBook uses a **multi-tenant PostgreSQL** database with SQLAlchemy ORM. All tables use UUID primary keys and timezone-aware timestamps. Tenant isolation is enforced at the service layer via `club_id` / `tenant_id` scoping on every query.

---

## Entity Relationship Summary

```
Tenant ──< Club ──< Court ──< Booking ──< BookingPlayer
              │                    │
              │                    ├──< Payment
              │                    └──< EquipmentRental ──> EquipmentInventory
              │
              ├──< OperatingHours
              ├──< PricingRule
              ├──< StaffProfile ──< TrainerAvailability
              └──< EquipmentInventory

Tenant ──< User ──< Wallet ──< WalletTransaction
               └──< SkillLevelHistory
               └──< MembershipSubscription ──> MembershipPlan
                                           └──< MembershipCreditLog

Club ──< MembershipPlan ──< MembershipSubscription
```

---

## Base Mixins

All models inherit from one or more base mixins defined in [backend/app/db/models/base.py](../backend/app/db/models/base.py).

| Mixin | Fields |
|---|---|
| `UUIDMixin` | `id: UUID` (PK, auto-generated) |
| `TimestampMixin` | `created_at: TIMESTAMPTZ`, `updated_at: TIMESTAMPTZ` |
| `TenantScopedMixin` | Marker — requires `tenant_id` FK on model |

---

## Models

### 1. Tenant & Subscription

#### `subscription_plans`
Controls feature gating and limits per tenant.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | VARCHAR(100) | e.g. "Starter", "Pro" |
| `max_clubs` | INTEGER | `-1` = unlimited |
| `max_courts_per_club` | INTEGER | `-1` = unlimited |
| `max_staff_users` | INTEGER | `-1` = unlimited |
| `open_games_feature` | BOOLEAN | Feature flag |
| `waitlist_feature` | BOOLEAN | Feature flag |
| `white_label_enabled` | BOOLEAN | Feature flag — custom branding |
| `analytics_enabled` | BOOLEAN | Feature flag — advanced reporting |
| `price_per_month` | NUMERIC(10,2) | |
| `setup_fee` | NUMERIC(10,2) | Default `0` |
| `trial_days` | INTEGER | Default `0` |
| `booking_fee_pct` | NUMERIC(5,2) | Nullable — % fee per court booking |
| `revenue_share_pct` | NUMERIC(5,2) | Nullable — % of total club revenue |
| `third_party_revenue_share_pct` | NUMERIC(5,2) | Nullable — % of lessons/retail/etc |
| `overage_fee_per_booking` | NUMERIC(10,2) | Nullable — flat fee beyond plan limits |
| `max_api_calls_per_month` | INTEGER | Nullable — `NULL` = unlimited |
| `stripe_price_id` | VARCHAR(255) | Nullable — Stripe Price object for SmashBook → org billing |

**Relationships:** `tenants` (1:many)

---

#### `tenants`
Top-level organizational unit. Each tenant is a sports club operator.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | VARCHAR(255) | Legal / registration name (e.g. Stripe billing entity) |
| `trading_name` | VARCHAR(255) | Public-facing brand shown in club UI and confirmation emails |
| `player_subdomain` | VARCHAR(100) | UNIQUE — hosts the player site at `<player_subdomain>.smashbook.app` |
| `staff_subdomain` | VARCHAR(100) | UNIQUE — hosts the staff portal at `<staff_subdomain>.smashbook.app` |
| `custom_domain` | VARCHAR(255) | Nullable |
| `plan_id` | UUID | FK → `subscription_plans` |
| `is_active` | BOOLEAN | |
| `subscription_start_date` | TIMESTAMPTZ | Nullable — `NULL` until tenant goes live |
| `stripe_customer_id` | VARCHAR(255) | Nullable — SmashBook's Stripe Customer for billing this org (distinct from `users.stripe_customer_id` which is for players) |
| `stripe_subscription_id` | VARCHAR(255) | Nullable — Stripe Subscription ID |
| `subscription_status` | ENUM | Nullable — `trialing`, `active`, `past_due`, `canceled`, `suspended` (synced from Stripe; `suspended` is SmashBook's own state) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:**
- CHECK `player_subdomain <> staff_subdomain` (a single row cannot reuse the same value across both columns).
- Cross-row, cross-column uniqueness (a subdomain string can appear in **at most one** of `player_subdomain`/`staff_subdomain` across **all** tenants) is enforced in the application layer at `POST /admin/onboard` and `PATCH /admin/tenants/{id}` — the per-column UNIQUE constraints alone do not catch a string moving between columns on different tenants.

**Relationships:** `plan`, `clubs`, `users`, `tenant_users`

---

### 2. Users & Authentication

#### `users`
Role is stored directly on the user row (no separate `tenant_users` join table).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → `tenants` |
| `email` | VARCHAR(255) | UNIQUE per tenant |
| `full_name` | VARCHAR(255) | |
| `hashed_password` | VARCHAR(255) | bcrypt |
| `role` | ENUM | `owner`, `admin`, `staff`, `trainer`, `ops_lead`, `viewer`, `player` — default `player` |
| `skill_level` | NUMERIC(3,1) | Nullable; e.g. `3.5` |
| `skill_assigned_by` | UUID | FK → `users` (self-ref), nullable |
| `skill_assigned_at` | TIMESTAMPTZ | Nullable |
| `is_active` | BOOLEAN | |
| `email_verified_at` | TIMESTAMPTZ | Nullable — set when the player clicks the verification link. Login is blocked while NULL. |
| `stripe_customer_id` | VARCHAR(255) | Nullable |
| `phone` | VARCHAR(50) | Nullable |
| `photo_url` | VARCHAR(500) | Nullable — GCS path |
| `is_suspended` | BOOLEAN | Default `false` |
| `suspension_reason` | TEXT | Nullable |
| `default_payment_method_id` | VARCHAR(255) | Nullable — Stripe PaymentMethod ID |
| `preferred_notification_channel` | ENUM | `push`, `email`, `sms`, `in_app` — default `push` |
| `date_of_birth` | DATE | Nullable — aspirational; age-band demographics (Epic 2). Captured at registration if/when intake forms collect it |
| `gender` | ENUM | Nullable — `male`, `female`, `other`, `prefer_not_to_say`; self-reported demographics |
| `postcode` | VARCHAR(20) | Nullable — catchment-area reporting |
| `latitude` | NUMERIC(10,7) | Nullable — player location for the catchment map (distinct from club coordinates) |
| `longitude` | NUMERIC(10,7) | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(tenant_id, email)`

> The five demographic columns (`date_of_birth`, `gender`, `postcode`, `latitude`, `longitude`) are aspirational — added nullable ahead of the registration intake flow that populates them. The Epic-2 demographics + catchment-map reports stay dark until that capture exists (G7).

**Relationships:** `tenant`, `wallet`, `booking_players`, `skill_history`, `membership_subscriptions`

---

### 3. Clubs

#### `clubs`
Club settings are stored directly on this table (no separate `club_settings` table).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → `tenants` |
| `name` | VARCHAR(255) | |
| `address` | TEXT | Nullable |
| `stripe_connect_account_id` | VARCHAR(255) | Nullable — Stripe Connect |
| `currency` | VARCHAR(3) | Default `"GBP"` |
| `timezone` | VARCHAR(50) | Default `"Europe/London"` — analytics hour/day bucketing |
| `booking_duration_minutes` | INTEGER | Default `90` |
| `max_advance_booking_days` | INTEGER | Default `14` |
| `min_booking_notice_hours` | INTEGER | Default `2` |
| `max_bookings_per_player_per_week` | INTEGER | Nullable |
| `skill_level_min` | NUMERIC(3,1) | Default `1.0` |
| `skill_level_max` | NUMERIC(3,1) | Default `7.0` |
| `skill_range_allowed` | NUMERIC(3,1) | Default `1.5` — max spread between players |
| `open_games_enabled` | BOOLEAN | Default `true` |
| `min_players_to_confirm` | INTEGER | Default `4` |
| `auto_cancel_hours_before` | INTEGER | Nullable |
| `cancellation_notice_hours` | INTEGER | Default `48` |
| `cancellation_refund_pct` | INTEGER | Default `100` (0–100) |
| `reminder_hours_before` | INTEGER | Default `24` |
| `waitlist_enabled` | BOOLEAN | Default `true` |
| `default_skill_range_above` | NUMERIC(3,1) | Default `0.5` — default points above anchor for calendar reservations |
| `default_skill_range_below` | NUMERIC(3,1) | Default `1.0` — default points below anchor for calendar reservations |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** `tenant`, `operating_hours`, `pricing_rules`, `courts`, `staff_profiles`, `bookings`, `equipment`, `membership_plans`, `membership_subscriptions`, `calendar_reservations`

---

#### `operating_hours`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `day_of_week` | SMALLINT | 0 = Monday … 6 = Sunday |
| `open_time` | TIME | |
| `close_time` | TIME | |
| `valid_from` | DATE | Nullable — seasonal start date |
| `valid_until` | DATE | Nullable — seasonal end date |

---

#### `pricing_rules`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `session_type` | `bookingtype` enum | Activity this price applies to: `regular`, `lesson_individual`, `lesson_group`, `train_and_play`, `corporate_event`, `tournament`. Reuses the `bookingtype` enum (shared with `bookings.booking_type`). Default `regular`. Orthogonal to `label` — a club may price each session type within the same time window |
| `label` | `pricinglabel` enum | Pricing tier: `peak`, `off_peak`, `standard`. Fixed set — extend via enum `ALTER` + model |
| `day_of_week` | SMALLINT | 0 = Monday … 6 = Sunday |
| `start_time` | TIME | |
| `end_time` | TIME | |
| `valid_from` | DATE | Nullable — rule effective start date |
| `valid_until` | DATE | Nullable — rule effective end date |
| `is_active` | BOOLEAN | Default `true` |
| `price_per_slot` | NUMERIC(10,2) | Base price |
| `surge_trigger_pct` | NUMERIC(5,2) | Nullable — activates when utilisation ≥ this % |
| `surge_max_pct` | NUMERIC(5,2) | Nullable — max surge multiplier (%) |
| `low_demand_trigger_pct` | NUMERIC(5,2) | Nullable — activates when utilisation ≤ this % |
| `low_demand_min_pct` | NUMERIC(5,2) | Nullable — floor discount multiplier (%) |
| `incentive_price` | NUMERIC(10,2) | Nullable — flat promotional override price |
| `incentive_label` | VARCHAR(100) | Nullable — e.g. "Happy Hour" |
| `incentive_expires_at` | TIMESTAMPTZ | Nullable — incentive expiry |

---

### 4. Courts

#### `courts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `name` | VARCHAR(100) | |
| `surface_type` | ENUM | `indoor`, `outdoor`, `crystal`, `artificial_grass` |
| `has_lighting` | BOOLEAN | Default `false` |
| `lighting_surcharge` | NUMERIC(10,2) | Nullable |
| `is_active` | BOOLEAN | Default `true` |

**Relationships:** `club`, `bookings`, `calendar_reservations`

---

#### `calendar_reservations`
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
| `recurrence_end_date` | DATE | Nullable — inclusive end date for recurring series |
| `created_by` | UUID | FK → `users` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** `club`, `court`

---

### 5. Bookings

#### `bookings`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `court_id` | UUID | FK → `courts` |
| `booking_type` | ENUM | `regular`, `lesson_individual`, `lesson_group`, `corporate_event`, `tournament` |
| `status` | ENUM | `pending`, `confirmed`, `cancelled`, `completed` |
| `start_datetime` | TIMESTAMPTZ | |
| `end_datetime` | TIMESTAMPTZ | |
| `created_by_user_id` | UUID | FK → `users` |
| `staff_profile_id` | UUID | FK → `staff_profiles`, nullable |
| `event_name` | VARCHAR(255) | Nullable — for corporate/tournament |
| `contact_name` | VARCHAR(255) | Nullable |
| `contact_email` | VARCHAR(255) | Nullable |
| `contact_phone` | VARCHAR(50) | Nullable |
| `max_players` | INTEGER | Nullable |
| `min_skill_level` | NUMERIC(3,1) | Nullable — lower bound for join eligibility |
| `max_skill_level` | NUMERIC(3,1) | Nullable — upper bound for join eligibility |
| `notes` | TEXT | Nullable |
| `total_price` | NUMERIC(10,2) | Nullable |
| `is_open_game` | BOOLEAN | Default `false` |
| `is_recurring` | BOOLEAN | Default `false` |
| `recurrence_rule` | TEXT | iCal RRULE string, nullable |
| `recurrence_end_date` | DATE | Nullable — inclusive end date for recurring series |
| `parent_booking_id` | UUID | FK → `bookings` (self-ref), nullable — head of recurring series |
| `video_upload_path` | VARCHAR(500) | GCS path, nullable |
| `discount_amount` | NUMERIC(10,2) | Nullable |
| `discount_source` | ENUM | Nullable — `membership`, `campaign`, `promo_code`, `staff_manual`, `ai_gap_offer` |
| `membership_subscription_id` | UUID | FK → `membership_subscriptions`, nullable |
| `promo_code_id` | UUID | FK → `promo_codes`, nullable — promo code applied to this booking (G6) |
| `hold_expires_at` | TIMESTAMPTZ | Nullable — court-level hold deadline; cleared when the first player pays. Null = live/staff booking that always blocks the court |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:**
- `ix_bookings_court_window (court_id, start_datetime, end_datetime)` — conflict detection
- `ix_bookings_club_status (club_id, status)` — dashboard filtering
- `ix_bookings_club_start (club_id, start_datetime)` — calendar queries

**Relationships:** `club`, `court`, `staff_profile`, `players`, `equipment_rentals`, `payments`

---

#### `booking_players`
Links players to a booking and tracks their individual payment status.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK → `bookings` |
| `user_id` | UUID | FK → `users` |
| `role` | ENUM | `organiser`, `player` |
| `invite_status` | ENUM | `pending`, `accepted`, `declined` — default `accepted` |
| `payment_status` | ENUM | `pending`, `paid`, `refunded` |
| `amount_due` | NUMERIC(10,2) | |
| `discount_amount` | NUMERIC(10,2) | Nullable — per-player discount applied at invite time |
| `discount_source` | ENUM | Nullable — `membership`, `campaign`, `promo_code`, `staff_manual`, `ai_gap_offer` |
| `payment_deadline` | TIMESTAMPTZ | Nullable — slot-level hold deadline; cleared on payment. Staff/credit-paid slots get none |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(booking_id, user_id)`

**Indexes:**
- `ix_booking_players_deadline (payment_deadline) WHERE payment_status = 'pending'` — partial index serving the expiry-sweep query

---

#### `waitlist_entries`
Tracks players waiting for a slot on a specific date/time.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `court_id` | UUID | FK → `courts`, nullable |
| `user_id` | UUID | FK → `users` |
| `desired_date` | DATE | |
| `desired_start_time` | TIME | Nullable |
| `desired_end_time` | TIME | Nullable |
| `status` | ENUM | `waiting`, `offered`, `booked`, `expired` |
| `offered_booking_id` | UUID | FK → `bookings`, nullable |
| `offer_expires_at` | TIMESTAMPTZ | Nullable |
| `notified_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 6. Staff

#### `staff_profiles`

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

**Relationships:** `club`, `availability`, `bookings`

---

#### `trainer_availability`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `staff_profile_id` | UUID | FK → `staff_profiles` |
| `day_of_week` | SMALLINT | 0 = Monday … 6 = Sunday |
| `start_time` | TIME | |
| `end_time` | TIME | |
| `set_by_user_id` | UUID | FK → `users` |
| `effective_from` | DATE | |
| `effective_until` | DATE | Nullable — open-ended if null |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 7. Equipment

#### `equipment_inventory`

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
| `reorder_threshold` | INTEGER | Nullable — originally for AI purchase-order prediction (**descoped 2026-05-29**); column intentionally retained in the DB but currently unused |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

#### `equipment_rentals`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK → `bookings` |
| `equipment_id` | UUID | FK → `equipment_inventory` |
| `user_id` | UUID | FK → `users` |
| `quantity` | INTEGER | |
| `charge` | NUMERIC(10,2) | |
| `damage_reported` | BOOLEAN | Default `false` |
| `damage_notes` | TEXT | Nullable |
| `returned_at` | TIMESTAMPTZ | Nullable |
| `payment_status` | ENUM | Nullable — `pending`, `paid`, `refunded` |
| `payment_id` | UUID | FK → `payments`, nullable |
| `damage_charge` | NUMERIC(10,2) | Nullable — recovery cost charged to player |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 8. Payments & Billing

#### `payments`
Invoice fields are stored directly on this table (no separate `invoices` table).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK → `bookings` |
| `club_id` | UUID | FK → `clubs`, nullable |
| `user_id` | UUID | FK → `users` |
| `stripe_payment_intent_id` | VARCHAR(255) | Nullable |
| `stripe_charge_id` | VARCHAR(255) | Nullable — platform-side charge id (`ch_xxx`) |
| `stripe_destination_payment_id` | VARCHAR(255) | Nullable — connected-account-side payment id (`py_xxx`) for destination-charge Connect flow; indexed; used by `payout.paid` webhook to stamp `stripe_payout_id` |
| `amount` | NUMERIC(10,2) | |
| `currency` | VARCHAR(3) | Default `"GBP"` |
| `payment_method` | ENUM | `stripe_card`, `wallet`, `cash`, `account_credit` |
| `state` | ENUM | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded` |
| `refund_amount` | NUMERIC(10,2) | Nullable |
| `notes` | TEXT | Nullable |
| `stripe_invoice_id` | VARCHAR(255) | Nullable |
| `stripe_receipt_url` | VARCHAR(500) | Nullable |
| `pdf_storage_path` | VARCHAR(500) | GCS path, nullable |
| `failure_reason` | TEXT | Nullable |
| `retry_count` | INTEGER | Default `0` |
| `next_retry_at` | TIMESTAMPTZ | Nullable |
| `anomaly_flagged` | BOOLEAN | Default `false` |
| `anomaly_reason` | TEXT | Nullable |
| `dispute_status` | ENUM | Nullable — `open`, `under_review`, `won`, `lost` |
| `stripe_payout_id` | VARCHAR(255) | Nullable — populated via `payout.paid` webhook; indexed |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** `booking`, `platform_fees`

---

#### `platform_fees`
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

### 9. Wallet

#### `wallets`
One wallet per user, holds a pre-paid credit balance.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users`, UNIQUE |
| `balance` | NUMERIC(10,2) | Default `0.00` |
| `currency` | VARCHAR(3) | Default `"GBP"` |
| `auto_topup_enabled` | BOOLEAN | Default `false` |
| `auto_topup_threshold` | NUMERIC(10,2) | Nullable — top up when balance falls below this |
| `auto_topup_amount` | NUMERIC(10,2) | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

#### `wallet_transactions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `wallet_id` | UUID | FK → `wallets` |
| `transaction_type` | ENUM | `top_up`, `debit`, `refund`, `adjustment` |
| `amount` | NUMERIC(10,2) | Always positive; direction set by `transaction_type` |
| `balance_after` | NUMERIC(10,2) | Snapshot for audit trail |
| `reference` | VARCHAR(255) | Nullable — e.g. Stripe Payment Intent ID |
| `notes` | TEXT | Nullable |
| `source_type` | ENUM | Nullable — `booking`, `membership`, `invoice`, `manual` |
| `source_id` | UUID | Nullable — FK to the source record (no DB constraint) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

#### `wallet_club_debts`
Platform's obligation to transfer wallet-debit funds to each club's Stripe Connect account. One row per wallet debit. Settled asynchronously via admin-triggered `POST /payments/wallet/settle-debts`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs`, indexed |
| `tenant_id` | UUID | FK → `tenants` |
| `wallet_transaction_id` | UUID | FK → `wallet_transactions`, unique |
| `amount` | NUMERIC(10,2) | Gross amount owed to club |
| `platform_fee_amount` | NUMERIC(10,2) | Platform's cut (from `tenant.booking_fee_pct`) |
| `stripe_transfer_id` | VARCHAR(255) | Nullable — filled when settled |
| `settled_at` | TIMESTAMPTZ | Nullable — null means outstanding |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 10. Skill Tracking

#### `skill_level_history`
Immutable audit log of player skill changes.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `club_id` | UUID | FK → `clubs`, NOT NULL — restored in G6 for club-scoped skill queries |
| `previous_level` | NUMERIC(3,1) | Nullable — null on first assignment |
| `new_level` | NUMERIC(3,1) | |
| `change_source` | ENUM | `staff_manual`, `ai_auto`, `match_result` — default `staff_manual` (G6) |
| `assigned_by` | UUID | FK → `users`, nullable — null when `change_source = ai_auto` (made nullable in G6) |
| `ai_inference_id` | UUID | Nullable — FK → `ai_inference_log` deferred to G8; plain UUID for now (G6) |
| `reason` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 11. Memberships

#### `membership_plans`
Club-defined subscription tiers (e.g. Silver, Gold, Platinum).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `name` | VARCHAR(100) | e.g. "Gold" |
| `description` | TEXT | Nullable |
| `billing_period` | ENUM | `monthly`, `annual` |
| `price` | NUMERIC(10,2) | |
| `trial_days` | INTEGER | Default `0` |
| `booking_credits_per_period` | INTEGER | Not null — `0` = no credits |
| `guest_passes_per_period` | INTEGER | Nullable — `NULL` = none |
| `discount_pct` | NUMERIC(5,2) | Nullable — % off court bookings |
| `priority_booking_days` | INTEGER | Nullable — extra advance-booking window beyond club default |
| `max_active_members` | INTEGER | Nullable — enrollment cap; `NULL` = unlimited |
| `is_default` | BOOLEAN | Default `false` — exactly one per club marks the free basic plan auto-attached to a player on email verification. Enforced by partial unique index `uq_membership_plans_one_default_per_club` on `(club_id) WHERE is_default = TRUE`. |
| `is_active` | BOOLEAN | Default `true` |
| `stripe_price_id` | VARCHAR(255) | Nullable — Stripe recurring Price ID |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** `club`, `subscriptions`

---

#### `membership_subscriptions`
A player's active subscription to a `MembershipPlan`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `plan_id` | UUID | FK → `membership_plans` |
| `club_id` | UUID | FK → `clubs` — denormalised for tenant-scoping |
| `status` | ENUM | `trialing`, `active`, `paused`, `cancelled`, `expired` |
| `current_period_start` | TIMESTAMPTZ | |
| `current_period_end` | TIMESTAMPTZ | |
| `cancel_at_period_end` | BOOLEAN | Default `false` |
| `cancelled_at` | TIMESTAMPTZ | Nullable |
| `credits_remaining` | INTEGER | Not null — `0` = none remaining |
| `guest_passes_remaining` | INTEGER | Nullable — `NULL` when plan has no guest passes |
| `stripe_subscription_id` | VARCHAR(255) | Nullable |
| `pending_plan_id` | UUID | FK → `membership_plans`, nullable — non-null when a downgrade is scheduled; the target plan is applied at `current_period_end` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** `user`, `plan`, `club`, `credit_logs`

---

#### `membership_credit_logs`
Immutable audit log for booking-credit and guest-pass usage. Mirrors the `wallet_transactions` pattern.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `subscription_id` | UUID | FK → `membership_subscriptions` |
| `booking_id` | UUID | FK → `bookings`, nullable |
| `credit_type` | ENUM | `booking_credit`, `guest_pass` |
| `delta` | INTEGER | Negative = used; positive = restored/reset |
| `balance_after` | INTEGER | Snapshot for audit trail |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |

**Relationships:** `subscription`, `booking`

---

### 12. Discounts & Promo Codes

#### `promo_codes`
Club-scoped promotional discount codes. Backs the `discount_source = 'promo_code'` path on bookings.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `code` | VARCHAR(50) | Unique per club |
| `description` | TEXT | Nullable |
| `discount_type` | ENUM | `percentage`, `fixed_amount` |
| `discount_value` | NUMERIC(10,2) | |
| `max_uses` | INTEGER | Nullable — NULL = unlimited |
| `uses_count` | INTEGER | Default `0` |
| `max_uses_per_player` | INTEGER | Nullable |
| `valid_from` | TIMESTAMPTZ | Nullable |
| `valid_until` | TIMESTAMPTZ | Nullable |
| `applies_to` | ENUM | `all`, `off_peak`, `open_game`, `lesson`, `tournament` — default `all` |
| `min_booking_value` | NUMERIC(10,2) | Nullable |
| `is_active` | BOOLEAN | Default `true` |
| `created_by` | UUID | FK → `users` |
| `campaign_id` | UUID | Nullable — FK → `campaigns` deferred to G10; plain UUID for now |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(club_id, code)` (`uq_promo_codes_club_code`)

**Indexes:** `ix_promo_codes_club_id (club_id)`

**Relationships:** `club`

---

### 13. Messaging, Chat & Support

#### `announcements`
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

**Indexes:** `ix_announcements_club_id (club_id)`

**Relationships:** `club`

---

#### `support_tickets`
Unified thread table for support, casual chat, and booking inquiries. (`category`, `last_message_at` and chat-specific fields are added in G12.)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `user_id` | UUID | FK → `users` |
| `booking_id` | UUID | FK → `bookings`, nullable |
| `subject` | VARCHAR(255) | Nullable |
| `status` | ENUM | `open`, `in_progress`, `resolved`, `closed` — default `open` |
| `priority` | ENUM | `low`, `medium`, `high` — default `medium` |
| `assigned_to` | UUID | FK → `users`, nullable |
| `handled_by` | ENUM | `staff`, `ai`, `hybrid` — default `staff` |
| `resolution_summary` | TEXT | Nullable |
| `resolved_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:** `ix_ticket_club_status (club_id, status, priority)`

**Relationships:** `club`, `messages`

---

#### `support_messages`
A single message within a support/chat thread. (`intent` and `booking_id` are added in G12 for chat use cases.)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `ticket_id` | UUID | FK → `support_tickets` |
| `sender_user_id` | UUID | FK → `users`, nullable — null = AI agent |
| `sender_type` | ENUM | `player`, `staff`, `ai` |
| `body` | TEXT | |
| `ai_inference_id` | UUID | Nullable — FK → `ai_inference_log` deferred to G8; plain UUID for now |
| `created_at` | TIMESTAMPTZ | |

**Indexes:** `ix_support_messages_ticket_id (ticket_id)`

**Relationships:** `ticket`

---

### 14. Analytics

#### `court_utilisation_snapshots`
Hourly (and daily-rollup) court utilisation snapshots written by the analytics worker — never by the API request path. A **physical snapshot** (not a materialized view) because `total_slots` and `revenue_potential` depend on operating-hours and pricing config *as they were at snapshot time*; those historical figures can't be reconstructed if a club later changes hours or prices.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `court_id` | UUID | FK → `courts` |
| `snapshot_date` | DATE | |
| `hour_of_day` | SMALLINT | Nullable — 0–23; null = daily rollup |
| `day_of_week` | SMALLINT | 0=Mon … 6=Sun |
| `total_slots` | INTEGER | Available bookable slots in this window |
| `booked_slots` | INTEGER | |
| `utilisation_pct` | NUMERIC(5,2) | Computed: `booked / total * 100` |
| `revenue_actual` | NUMERIC(10,2) | |
| `revenue_potential` | NUMERIC(10,2) | Revenue at 100% base rate |
| `avg_booking_lead_time_h` | NUMERIC(6,1) | Nullable — avg hours in advance bookings were made |
| `created_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(court_id, snapshot_date, hour_of_day)` (`uq_court_utilisation_court_date_hour`)

**Relationships:** `club`, `court`

#### `analytics_refresh_log`
Audit trail for materialized-view refreshes run by `app/analytics/workers/refresh_views.py` — one row per (view, refresh attempt). Not tenant-scoped (views are tenant-wide aggregates; refresh is a platform operation). On failure the worker also publishes to the `analytics-alerts` Pub/Sub topic.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `view_name` | VARCHAR(100) | Which materialized view was refreshed |
| `status` | ENUM `refreshstatus` | `success` \| `failed` |
| `started_at` | TIMESTAMPTZ | |
| `completed_at` | TIMESTAMPTZ | Nullable |
| `duration_ms` | INTEGER | Nullable |
| `row_count` | INTEGER | Nullable — rows in the view after refresh |
| `error` | TEXT | Nullable — exception text on failure |
| `triggered_by` | VARCHAR(50) | Nullable — event_type or `"manual"` |
| `created_at` | TIMESTAMPTZ | Default `now()` |

**Indexes:** `ix_analytics_refresh_log_view_started (view_name, started_at)`

#### Materialized views: `mv_revenue_by_club_day_service` / `mv_revenue_by_club_day_cash`
Back the "Revenue by club, period" report (G7). **Materialized views, not ORM tables** — created by hand-written DDL in migration `a04c76851993`, refreshed nightly by `app/analytics/workers/refresh_views.py`. Two parallel views with identical schema: `…_service` buckets by `bookings.start_datetime` (accrual), `…_cash` by `payments.created_at` (cash); the API selects via `?basis=`. Grain: one row per `(club_id, revenue_date, revenue_type, currency)` — `revenue_date` is club-local; `revenue_type` is the five `booking_type`s plus `equipment`; measures `gross_amount`, `refund_amount`, `net_amount`, `transaction_count`. Computed from `payments` ⋈ `bookings` ∪ embedded `equipment_rentals` (subtract-embedded split so totals reconcile to `SUM(payments.amount)`; membership MRR excluded). `UNIQUE (club_id, revenue_date, revenue_type, currency)` on each (required for `REFRESH … CONCURRENTLY`). Full spec: [`REPORT_CATALOG.md`](../backend/app/analytics/docs/REPORT_CATALOG.md) and [`MATERIALIZED_VIEWS.md`](../backend/app/analytics/docs/MATERIALIZED_VIEWS.md).

#### Materialized view: `mv_player_value`
Backs the "Player value" report (G7, workstream B — per-player LTV, most-active players, inactive members). **Materialized view, not an ORM table** — created by hand-written DDL in migration `fd3c5c3192ab`, refreshed nightly by `app/analytics/workers/refresh_views.py`. Grain: one row per `(club_id, user_id)` — a point-in-time stock. Three sub-aggregates stitched on `(club_id, user_id)` via a union-of-keys: **activity** (`booking_players` ⋈ `bookings`, non-cancelled + already-started) → `first_played_at`, `last_played_at`, `bookings_played`, `played_last_30d`, `played_last_90d`; **spend** (`payments` by `user_id`, states `succeeded`/`refunded`/`partially_refunded`) → `lifetime_gross`, `lifetime_refunds`, `lifetime_spend` (net), `payments_count`, `currency`; **member** (`membership_subscriptions` ⋈ `membership_plans`, `active` + `price > 0`) → `is_paid_member`, `membership_plan_name`. Display names join `users` live (no PII in the view). `UNIQUE (club_id, user_id)` (required for `REFRESH … CONCURRENTLY`). Full spec: [`REPORT_CATALOG.md`](../backend/app/analytics/docs/REPORT_CATALOG.md) and [`MATERIALIZED_VIEWS.md`](../backend/app/analytics/docs/MATERIALIZED_VIEWS.md).

#### Materialized views: `mv_club_active_player_day` / `mv_club_signups_day`
Back the club-level "Active players & member sign-ups" report (G7, workstream A). **Materialized views, not ORM tables** — created by hand-written DDL in migration `4d439313634d`, refreshed nightly by `app/analytics/workers/refresh_views.py`. `mv_club_active_player_day` (grain `(club_id, activity_date, user_id)`) is a presence set — one row per player per club-local day on court (`booking_players` ⋈ `bookings`, non-cancelled + already-started); the service derives the trailing-window active KPI and the calendar WAP/MAP timeseries from it via `COUNT(DISTINCT user_id)`. `mv_club_signups_day` (grain `(club_id, signup_date)`) is an additive count of new paid membership subscription starts (`membership_subscriptions.created_at`, `membership_plans.price > 0`). `UNIQUE (club_id, activity_date, user_id)` / `UNIQUE (club_id, signup_date)` (required for `REFRESH … CONCURRENTLY`). Backs `/api/v1/analytics/players/clubs/{club_id}/{active,active/timeseries,signups}`. Full spec: [`REPORT_CATALOG.md`](../backend/app/analytics/docs/REPORT_CATALOG.md) and [`MATERIALIZED_VIEWS.md`](../backend/app/analytics/docs/MATERIALIZED_VIEWS.md).

> The remaining G7 analytics reports (coach popularity, RFV pre-aggregate) are served by **materialized views refreshed by the analytics worker**, not ORM tables — they are not yet built and do not appear here.

---

## Enumerations

| Enum | Values |
|---|---|
| `TenantUserRole` | `owner`, `admin`, `staff`, `trainer`, `ops_lead`, `viewer`, `player` — used for `users.role` |
| `NotificationChannel` | `push`, `email`, `sms`, `in_app` |
| `Gender` | `male`, `female`, `other`, `prefer_not_to_say` — `users.gender` |
| `StaffRole` | `trainer`, `ops_lead`, `admin`, `front_desk` |
| `SurfaceType` | `indoor`, `outdoor`, `crystal`, `artificial_grass` |
| `BookingType` | `regular`, `lesson_individual`, `lesson_group`, `train_and_play`, `corporate_event`, `tournament` |
| `BookingStatus` | `pending`, `confirmed`, `cancelled`, `completed` |
| `PlayerRole` | `organiser`, `player` |
| `PaymentStatus` | `pending`, `paid`, `refunded` |
| `PaymentMethod` | `stripe_card`, `wallet`, `cash`, `account_credit` |
| `PaymentState` | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded` |
| `WalletTransactionType` | `top_up`, `debit`, `refund`, `adjustment` |
| `WalletTransactionSource` | `booking`, `membership`, `invoice`, `manual` |
| `ItemType` | `racket`, `ball_tube`, `other` |
| `ItemCondition` | `good`, `fair`, `damaged`, `retired` |
| `BillingPeriod` | `monthly`, `annual` |
| `MembershipStatus` | `trialing`, `active`, `paused`, `cancelled`, `expired` |
| `CreditType` | `booking_credit`, `guest_pass` |
| `DisputeStatus` | `open`, `under_review`, `won`, `lost` |
| `PlatformFeeType` | `booking_fee`, `revenue_share`, `third_party_share` |
| `DiscountSource` | `membership`, `campaign`, `promo_code`, `staff_manual`, `ai_gap_offer` |
| `CalendarReservationType` | `training_block`, `private_hire`, `maintenance`, `tournament_hold` |
| `SkillChangeSource` | `staff_manual`, `ai_auto`, `match_result` |
| `PromoDiscountType` | `percentage`, `fixed_amount` |
| `PromoAppliesTo` | `all`, `off_peak`, `open_game`, `lesson`, `tournament` |
| `SupportTicketStatus` | `open`, `in_progress`, `resolved`, `closed` |
| `SupportTicketPriority` | `low`, `medium`, `high` |
| `SupportHandledBy` | `staff`, `ai`, `hybrid` |
| `MessageSenderType` | `player`, `staff`, `ai` |
| `RefreshStatus` | `success`, `failed` — `analytics_refresh_log.status` (G7) |

---

## Multi-Tenancy

Tenant isolation is enforced at the **service layer** — every query is scoped by `tenant_id` or `club_id`. There is no PostgreSQL row-level security.

```
Request → TenantMiddleware (resolves subdomain → Tenant)
        → Route handler passes tenant context to service
        → Service filters all queries by tenant_id / club_id
```

See [backend/app/middleware/tenant.py](../backend/app/middleware/tenant.py) for the middleware implementation.

---

## Database Migrations

Managed with **Alembic**. Migration files live in [backend/app/db/migrations/versions/](../backend/app/db/migrations/versions/).

| Version | Description |
|---|---|
| `4f3a53db6bd2` | Initial schema — FK relationships, PostgreSQL ENUMs |
| `b9e1f2a3c4d5` | Fix datetime types to TIMESTAMPTZ, TIME; add composite indexes on `bookings` |
| `c1d2e3f4a5b6` | Pricing rule discount and dynamic pricing |
| `d2e3f4a5b6c7` | Add subscription plan commercial fields |
| `e3f4a5b6c7d8` | Add `subscription_start_date` to tenants |
| `f4a5b6c7d8e9` | Full dynamic pricing (surge, low-demand, incentives, seasonal) |
| `a1b2c3d4e5f6` | Add membership schema — `membership_plans`, `membership_subscriptions`, `membership_credit_logs` |
| `7d4d380...` | Table simplification — merge `club_settings` into `clubs`; merge `invoices` into `payments`; merge `tenant_users` role into `users`; drop `club_id` from `skill_level_history` and `trainer_availability` |
| `7f7915bed71a` | G1 — Add `phone`, `photo_url`, `is_suspended`, `suspension_reason`, `default_payment_method_id`, `preferred_notification_channel` to `users`; add `notificationchannel` enum |
| `17206ff810ef` | G2 — Add `valid_from`, `valid_until` to `operating_hours` for seasonal hour variations |
| `62a903cfb227` | G3 — `bookings`: add `min_skill_level`, `max_skill_level`; `booking_players`: add `invite_status` (`invitestatus` enum, default `accepted`); new table `waitlist_entries` (`waitliststatus` enum) |
| `8582075732fe` | G4 — `payments`: add `club_id`, `failure_reason`, `retry_count`, `next_retry_at`, `anomaly_flagged`, `anomaly_reason`, `dispute_status`; new table `platform_fees`; `wallets`: add `auto_topup_enabled`, `auto_topup_threshold`, `auto_topup_amount`; `bookings`: add `discount_amount`, `discount_source`, `membership_subscription_id` |
| `24a1464d08d9` | G5 — new table `calendar_reservations` (`calendarreservationtype` enum); `bookings`: add `recurrence_end_date`, `parent_booking_id` (self-ref for recurring series); `clubs`: add `default_skill_range_above` (default `0.5`), `default_skill_range_below` (default `1.0`); `equipment_inventory`: add `reorder_threshold` (descoped but retained — see note); `equipment_rentals`: add `payment_status`, `payment_id`, `damage_charge` |
| `f80daf1c4ecb` | Drop `calendar_reservations.anchor_skill_level`, `skill_range_above`, `skill_range_below`; remove the `skill_filter` value from the `calendarreservationtype` enum |
| `80803a6bae79` | Add `source_type` (`wallettransactionsource` enum) and `source_id` (UUID) to `wallet_transactions` |
| `3a758d32ab8d` | New table `wallet_club_debts` — deferred settlement of wallet debits to club Stripe Connect accounts |
| `0fcac3948b73` | Add `stripe_price_id` to `subscription_plans`; add `stripe_customer_id`, `stripe_subscription_id`, `subscription_status` (`subscriptionstatus` enum) to `tenants` for SmashBook → org subscription billing |
| `a3ad99663232` | Add `stripe_destination_payment_id` (indexed) to `payments` — connected-account-side payment id (`py_xxx`) so the `payout.paid` webhook can match destination-charge Connect payouts |
| `32204403280f` | G6.1 — Player email-verification registration flow: `users`: add `email_verified_at` (back-filled to `NOW()` for existing rows); `membership_plans`: add `is_default` with partial unique index `uq_membership_plans_one_default_per_club` on `(club_id) WHERE is_default = TRUE` |
| `ac339fc8a081` | `tenants`: add `trading_name` (back-filled from `name`); rename `subdomain` → `player_subdomain`; add `staff_subdomain` (back-filled as `<player_subdomain>-staff`); add CHECK constraint `player_subdomain <> staff_subdomain` |
| `fa46b223afc9` | `membership_subscriptions`: add `pending_plan_id` (FK → `membership_plans`, nullable) — records the target plan for a scheduled downgrade that applies at `current_period_end` |
| `92c0f1557d7e` | G4.1 — Court hold expiry & auto-release: `bookings`: add `hold_expires_at` (court-level hold); `booking_players`: add `payment_deadline` (slot-level hold) + partial index `ix_booking_players_deadline (payment_deadline) WHERE payment_status = 'pending'` |
| `ae37b6ee82be` | G6 — New tables `promo_codes`, `announcements`, `support_tickets`, `support_messages`; `bookings`: add `promo_code_id` (FK → `promo_codes`); `skill_level_history`: add `club_id` (FK → `clubs`, NOT NULL), `change_source` (`skillchangesource` enum, default `staff_manual`), `ai_inference_id` (UUID, FK deferred to G8), and make `assigned_by` nullable. New enums: `promodiscounttype`, `promoappliesto`, `supportticketstatus`, `supportticketpriority`, `supporthandledby`, `messagesendertype`, `skillchangesource` |
| `8800a16daf16` | G3 reconcile — add index `ix_waitlist_club_date (club_id, desired_date, status)` on `waitlist_entries`. Closes a doc-vs-DB gap: the index was listed in `DATA_MODEL_TARGET_STATE.md` (tagged G3) but was never carried into the model or the original G3 migration `62a903cfb227`. Serves the waitlist-sweep query (waiting entries for a club on a date) |
| `b210c7b03579` | G7 (Analytics) — new table `court_utilisation_snapshots` (`UNIQUE(court_id, snapshot_date, hour_of_day)`); `clubs`: add `timezone` (default `"Europe/London"`); `users`: add aspirational demographics `date_of_birth`, `gender` (`gender` enum), `postcode`, `latitude`, `longitude` (all nullable). REPORT_CATALOG materialized views are worker-managed and not part of this migration |
| `a04c76851993` | G7 (Analytics) — revenue-by-club report: new materialized views `mv_revenue_by_club_day_service` (bucketed by booking start) and `mv_revenue_by_club_day_cash` (bucketed by payment date), each with `UNIQUE(club_id, revenue_date, revenue_type, currency)` for `REFRESH … CONCURRENTLY`. Hand-written DDL (views aren't ORM models). Subtract-embedded equipment split; membership MRR excluded |
| `520ea227119a` | G7 (Analytics) — new table `analytics_refresh_log` (`refreshstatus` enum) recording every materialized-view refresh run by `app/analytics/workers/refresh_views.py`; index `ix_analytics_refresh_log_view_started (view_name, started_at)` |
| `fd3c5c3192ab` | G7 (Analytics) — player-value report (workstream B): new materialized view `mv_player_value`, grain `(club_id, user_id)`, `UNIQUE(club_id, user_id)` for `REFRESH … CONCURRENTLY`. Hand-written DDL (views aren't ORM models). Stitches activity (`booking_players` ⋈ `bookings`), net spend (`payments` by `user_id`), and paid-membership flag (`membership_subscriptions` ⋈ `membership_plans`) per player. Backs `/api/v1/analytics/players/...` (LTV, most-active, inactive-members) |
| `4d439313634d` | G7 (Analytics) — club player-flow report (workstream A): new materialized views `mv_club_active_player_day` (presence, grain `(club_id, activity_date, user_id)`, `UNIQUE(club_id, activity_date, user_id)`) and `mv_club_signups_day` (flow, grain `(club_id, signup_date)`, `UNIQUE(club_id, signup_date)`), both for `REFRESH … CONCURRENTLY`. Hand-written DDL. Active = distinct on-court players (`booking_players` ⋈ `bookings`); signups = new paid subscription starts (`membership_subscriptions` ⋈ `membership_plans`, price > 0). Backs `/api/v1/analytics/players/clubs/{id}/{active,active/timeseries,signups}` |
| `da94effd108c` | `pricing_rules.label` tightened from free-text `VARCHAR(50)` to new `pricinglabel` enum (`peak`, `off_peak`, `standard`). Legacy values remapped in-migration by time-of-day semantics before the cast: `off_peak` ← `Off-Peak`, `Wknd AM`; `peak` ← `Peak`, `Evening`, `Weekend`, `Wknd PM`, `Wknd Eve`; `standard` ← catch-all. Extend the tier set by `ALTER TYPE pricinglabel ADD VALUE` + a model member |
| `360c29cd9c05` | Per-activity pricing: new `pricing_rules.session_type` column (`bookingtype` enum, default `regular`, `NOT NULL`), letting a club price each session type within the same time window. Adds `train_and_play` to the existing `bookingtype` enum via `ALTER TYPE … ADD VALUE` inside an `autocommit_block()` (committed before the column references it); column added with `create_type=False` since `bookingtype` already exists. Existing rows backfill to `regular` via `server_default`. Downgrade drops the column but leaves `train_and_play` on the enum (Postgres cannot drop an enum value) |

To run migrations:
```bash
cd backend
alembic upgrade head
```
