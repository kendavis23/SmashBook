# SmashBook Data Model

## Overview

SmashBook uses a **multi-tenant PostgreSQL** database with SQLAlchemy ORM. All tables use UUID primary keys and timezone-aware timestamps. Tenant isolation is enforced at the service layer via `club_id` / `tenant_id` scoping on every query.

---

## Entity Relationship Summary

```
Tenant ──< Club ──< Court ──< Booking ──< BookingPlayer
              │                    │
              │                    ├──< Payment
              │                    ├──< Invoice
              │                    └──< EquipmentRental ──> EquipmentInventory
              │
              ├──< ClubSettings (1:1)
              ├──< OperatingHours
              ├──< PricingRule
              ├──< StaffProfile ──< TrainerAvailability
              └──< EquipmentInventory

Tenant ──< TenantUser ──> User ──< Wallet ──< WalletTransaction
                               └──< SkillLevelHistory
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
| `open_games_feature` | BOOLEAN | Feature flag |
| `waitlist_feature` | BOOLEAN | Feature flag |
| `price_per_month` | NUMERIC(10,2) | |

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
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** `plan`, `clubs`, `users`, `tenant_users`

---

### 2. Users & Authentication

#### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → `tenants` |
| `email` | VARCHAR(255) | UNIQUE per tenant |
| `full_name` | VARCHAR(255) | |
| `hashed_password` | VARCHAR(255) | bcrypt |
| `skill_level` | NUMERIC(3,1) | Nullable; e.g. `3.5` |
| `skill_assigned_by` | UUID | FK → `users` (self-ref), nullable |
| `skill_assigned_at` | TIMESTAMPTZ | Nullable |
| `is_active` | BOOLEAN | |
| `stripe_customer_id` | VARCHAR(255) | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(tenant_id, email)`

**Relationships:** `tenant`, `tenant_users`, `wallet`, `booking_players`, `skill_history`

---

#### `tenant_users`
Join table assigning a role to a user within a tenant.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → `tenants` |
| `user_id` | UUID | FK → `users` |
| `role` | ENUM | `owner`, `admin`, `staff`, `trainer`, `ops_lead`, `viewer`, `player` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 3. Clubs

#### `clubs`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → `tenants` |
| `name` | VARCHAR(255) | |
| `address` | TEXT | Nullable |
| `stripe_connect_account_id` | VARCHAR(255) | Nullable — Stripe Connect |
| `currency` | VARCHAR(3) | Default `"GBP"` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** `tenant`, `settings`, `operating_hours`, `pricing_rules`, `courts`, `staff_profiles`, `bookings`, `equipment`

---

#### `club_settings`
One-to-one extension of a club with operational configuration.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `club_id` | UUID | FK → `clubs` | UNIQUE |
| `booking_duration_minutes` | INTEGER | 90 | |
| `max_advance_booking_days` | INTEGER | 14 | |
| `min_booking_notice_hours` | INTEGER | 2 | |
| `max_bookings_per_player_per_week` | INTEGER | null | |
| `skill_level_min` | NUMERIC(3,1) | 1.0 | |
| `skill_level_max` | NUMERIC(3,1) | 7.0 | |
| `skill_range_allowed` | NUMERIC(3,1) | 1.5 | Max spread between players |
| `open_games_enabled` | BOOLEAN | true | |
| `min_players_to_confirm` | INTEGER | 4 | |
| `auto_cancel_hours_before` | INTEGER | null | |
| `cancellation_notice_hours` | INTEGER | 48 | |
| `cancellation_refund_pct` | INTEGER | 100 | 0–100 |
| `reminder_hours_before` | INTEGER | 24 | |
| `waitlist_enabled` | BOOLEAN | true | |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

---

#### `operating_hours`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `club_id` | UUID | FK → `clubs` |
| `day_of_week` | SMALLINT | 0 = Monday … 6 = Sunday |
| `open_time` | TIME | |
| `close_time` | TIME | |

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
| `price_per_slot` | NUMERIC(10,2) | |

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

**Relationships:** `club`, `blackouts`, `bookings`

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
| `notes` | TEXT | Nullable |
| `total_price` | NUMERIC(10,2) | Nullable |
| `is_open_game` | BOOLEAN | Default `false` |
| `is_recurring` | BOOLEAN | Default `false` |
| `recurrence_rule` | TEXT | iCal RRULE string, nullable |
| `video_upload_path` | VARCHAR(500) | GCS path, nullable |
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
| `payment_status` | ENUM | `pending`, `paid`, `refunded` |
| `amount_due` | NUMERIC(10,2) | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(booking_id, user_id)`

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
| `club_id` | UUID | FK → `clubs` |
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
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 8. Payments & Billing

#### `payments`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK → `bookings` |
| `user_id` | UUID | FK → `users` |
| `stripe_payment_intent_id` | VARCHAR(255) | Nullable |
| `stripe_charge_id` | VARCHAR(255) | Nullable |
| `amount` | NUMERIC(10,2) | |
| `currency` | VARCHAR(3) | Default `"GBP"` |
| `payment_method` | ENUM | `stripe_card`, `wallet`, `cash`, `account_credit` |
| `state` | ENUM | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded` |
| `refund_amount` | NUMERIC(10,2) | Nullable |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

#### `invoices`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users` |
| `booking_id` | UUID | FK → `bookings`, nullable |
| `stripe_invoice_id` | VARCHAR(255) | Nullable |
| `stripe_receipt_url` | VARCHAR(500) | Nullable |
| `amount` | NUMERIC(10,2) | |
| `currency` | VARCHAR(3) | Default `"GBP"` |
| `pdf_storage_path` | VARCHAR(500) | GCS path, nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

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
| `club_id` | UUID | FK → `clubs` |
| `previous_level` | NUMERIC(3,1) | Nullable — null on first assignment |
| `new_level` | NUMERIC(3,1) | |
| `assigned_by` | UUID | FK → `users` (staff/admin who made the change) |
| `reason` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## Enumerations

| Enum | Values |
|---|---|
| `TenantUserRole` | `owner`, `admin`, `staff`, `trainer`, `ops_lead`, `viewer`, `player` |
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
| `4f3a53db6bd2` | Initial schema — all 22 tables, FK relationships, PostgreSQL ENUMs |
| `b9e1f2a3c4d5` | Fix datetime types to TIMESTAMPTZ, TIME; add composite indexes on `bookings` |

To run migrations:
```bash
cd backend
alembic upgrade head
```
