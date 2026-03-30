_Last updated: 2026-03-30 17:00 UTC_

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

**Relationships:** `tenants` (1:many)

---

#### `tenants`
Top-level organizational unit. Each tenant is a sports club operator.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | VARCHAR(255) | |
| `subdomain` | VARCHAR(100) | UNIQUE — used for routing |
| `custom_domain` | VARCHAR(255) | Nullable |
| `plan_id` | UUID | FK → `subscription_plans` |
| `is_active` | BOOLEAN | |
| `subscription_start_date` | TIMESTAMPTZ | Nullable — `NULL` until tenant goes live |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

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
| `stripe_customer_id` | VARCHAR(255) | Nullable |
| `phone` | VARCHAR(50) | Nullable |
| `photo_url` | VARCHAR(500) | Nullable — GCS path |
| `is_suspended` | BOOLEAN | Default `false` |
| `suspension_reason` | TEXT | Nullable |
| `default_payment_method_id` | VARCHAR(255) | Nullable — Stripe PaymentMethod ID |
| `preferred_notification_channel` | ENUM | `push`, `email`, `sms`, `in_app` — default `push` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(tenant_id, email)`

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
| `label` | VARCHAR(50) | e.g. "Peak", "Off-Peak" |
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

**Relationships:** `club`, `blackouts`, `bookings`, `calendar_reservations`

---

#### `court_blackouts`
Blocks a court from being booked during a time window (maintenance, events, etc).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `court_id` | UUID | FK → `courts` |
| `start_datetime` | TIMESTAMPTZ | |
| `end_datetime` | TIMESTAMPTZ | |
| `reason` | TEXT | Nullable |

---

#### `calendar_reservations`
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
| `anchor_skill_level` | NUMERIC(3,1) | Nullable — target skill level for the session |
| `skill_range_above` | NUMERIC(3,1) | Nullable — points above anchor permitted; null = no upper bound |
| `skill_range_below` | NUMERIC(3,1) | Nullable — points below anchor permitted; null = no lower bound |
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
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(booking_id, user_id)`

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
| `reorder_threshold` | INTEGER | Nullable — quantity below which AI triggers a purchase order |
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
| `stripe_charge_id` | VARCHAR(255) | Nullable |
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
| `previous_level` | NUMERIC(3,1) | Nullable — null on first assignment |
| `new_level` | NUMERIC(3,1) | |
| `assigned_by` | UUID | FK → `users` (staff/admin who made the change) |
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
| `booking_credits_per_period` | INTEGER | Nullable — `NULL` = unlimited |
| `guest_passes_per_period` | INTEGER | Nullable — `NULL` = none |
| `discount_pct` | NUMERIC(5,2) | Nullable — % off court bookings |
| `priority_booking_days` | INTEGER | Nullable — extra advance-booking window beyond club default |
| `max_active_members` | INTEGER | Nullable — enrollment cap; `NULL` = unlimited |
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
| `credits_remaining` | INTEGER | Nullable — `NULL` when plan has unlimited credits |
| `guest_passes_remaining` | INTEGER | Nullable — `NULL` when plan has no guest passes |
| `stripe_subscription_id` | VARCHAR(255) | Nullable |
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

## Enumerations

| Enum | Values |
|---|---|
| `TenantUserRole` | `owner`, `admin`, `staff`, `trainer`, `ops_lead`, `viewer`, `player` — used for `users.role` |
| `NotificationChannel` | `push`, `email`, `sms`, `in_app` |
| `StaffRole` | `trainer`, `ops_lead`, `admin`, `front_desk` |
| `SurfaceType` | `indoor`, `outdoor`, `crystal`, `artificial_grass` |
| `BookingType` | `regular`, `lesson_individual`, `lesson_group`, `corporate_event`, `tournament` |
| `BookingStatus` | `pending`, `confirmed`, `cancelled`, `completed` |
| `PlayerRole` | `organiser`, `player` |
| `PaymentStatus` | `pending`, `paid`, `refunded` |
| `PaymentMethod` | `stripe_card`, `wallet`, `cash`, `account_credit` |
| `PaymentState` | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded` |
| `WalletTransactionType` | `top_up`, `debit`, `refund`, `adjustment` |
| `ItemType` | `racket`, `ball_tube`, `other` |
| `ItemCondition` | `good`, `fair`, `damaged`, `retired` |
| `BillingPeriod` | `monthly`, `annual` |
| `MembershipStatus` | `trialing`, `active`, `paused`, `cancelled`, `expired` |
| `CreditType` | `booking_credit`, `guest_pass` |
| `DisputeStatus` | `open`, `under_review`, `won`, `lost` |
| `PlatformFeeType` | `booking_fee`, `revenue_share`, `third_party_share` |
| `DiscountSource` | `membership`, `campaign`, `promo_code`, `staff_manual`, `ai_gap_offer` |
| `CalendarReservationType` | `skill_filter`, `training_block`, `private_hire`, `maintenance`, `tournament_hold` |

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
| `8582075732fe` | G4 — `payments`: add `club_id`, `failure_reason`, `retry_count`, `next_retry_at`, `anomaly_flagged`, `anomaly_reason`, `dispute_status`; new table `platform_fees`; `wallets`: add `auto_topup_enabled`, `auto_topup_threshold`, `auto_topup_amount`; `bookings`: add `discount_amount`, `discount_source`, `membership_subscription_id` |

To run migrations:
```bash
cd backend
alembic upgrade head
```
