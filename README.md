# Padel Booking App — Project Scaffolding

Multi-tenant SaaS platform for padel club court booking.

## Architecture Overview

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                      CLIENTS                             │
                    │  Staff Portal (Next.js)  Player Web   Mobile (Expo RN)  │
                    └─────────────────────┬───────────────────────────────────┘
                                          │ HTTPS / REST
                    ┌─────────────────────▼───────────────────────────────────┐
                    │           Cloud Run: padel-api (FastAPI)                  │
                    │           /api/v1/{auth,players,courts,bookings,          │
                    │                   payments,clubs,staff,trainers,          │
                    │                   reports,support}                        │
                    └──────┬────────────────────────┬────────────────┬─────────┘
                           │                        │                │
              ┌────────────▼───────┐   ┌────────────▼──────┐  ┌─────▼──────────┐
              │   Cloud SQL        │   │    Pub/Sub         │  │ Cloud Storage  │
              │   PostgreSQL 16    │   │                    │  │                │
              │ ┌──────────────┐   │   │  booking-events    │  │ match-videos   │
              │ │   Primary    │   │   │  payment-events    │  │ invoices       │
              │ │ (read/write) │   │   │  notification-     │  │ report-exports │
              │ └──────┬───────┘   │   │  events            │  └────────────────┘
              │        │ repl.     │   └────┬──────┬─────────┘
              │ ┌──────▼───────┐   │        │      │
              │ │ Read Replica │   │  ┌─────▼─┐ ┌──▼──────┐ ┌───────────────┐
              │ │ (GET/reports)│   │  │booking│ │payment  │ │notification   │
              │ └──────────────┘   │  │worker │ │worker   │ │worker         │
              └────────────────────┘  └───────┘ └─────────┘ └───┬───────────┘
                                                                  │
                                                         SendGrid │ Firebase FCM
```

## Cloud Run Services

| Service | Image | Description |
|---------|-------|-------------|
| `padel-api` | `padel-api:latest` | Main REST API |
| `padel-booking-worker` | `padel-worker:latest` | Booking lifecycle side-effects |
| `padel-payment-worker` | `padel-worker:latest` | Stripe webhook processing |
| `padel-notification-worker` | `padel-worker:latest` | Email / push dispatch |

## Database Tables (PostgreSQL 16 via Cloud SQL)

### Multi-Tenancy

| Table | Purpose |
|-------|---------|
| `subscription_plans` | Tier definitions — Starter / Pro / Enterprise |
| `tenants` | SaaS customers (one per club group) |
| `tenant_users` | User ↔ Tenant role mapping |

### Users & Auth

| Table | Purpose |
|-------|---------|
| `users` | All accounts (players + staff). Scoped by `tenant_id` |

### Club Configuration

| Table | Purpose |
|-------|---------|
| `clubs` | Physical club locations |
| `club_settings` | Booking rules, skill matching, cancellation policy |
| `operating_hours` | Opening times per day of week |
| `pricing_rules` | Peak / off-peak pricing windows |

### Courts

| Table | Purpose |
|-------|---------|
| `courts` | Individual courts (surface_type, lighting, surcharge) |
| `court_blackouts` | Maintenance / event closures |

### Staff & Trainers

| Table | Purpose |
|-------|---------|
| `staff_profiles` | Staff roles per club (trainer/ops_lead/admin/front_desk) |
| `trainer_availability` | Working hours — set by trainer or ops_lead |

### Bookings

| Table | Purpose |
|-------|---------|
| `bookings` | All types: regular / lesson_individual / lesson_group / corporate_event / tournament |
| `booking_players` | Junction table — players per booking with `amount_due` and `payment_status` |

### Equipment

| Table | Purpose |
|-------|---------|
| `equipment_inventory` | Rackets, balls, other rental items |
| `equipment_rentals` | Per-booking rentals with damage tracking |

### Skill

| Table | Purpose |
|-------|---------|
| `skill_level_history` | Immutable log of all skill level changes |

### Payments & Finance

| Table | Purpose |
|-------|---------|
| `wallets` | Player wallet balances |
| `wallet_transactions` | Top-ups, debits, refunds, staff adjustments |
| `payments` | Stripe PaymentIntent / charge records |
| `invoices` | Receipt metadata with GCS PDF path |

## Pub/Sub Event Catalogue

| Topic | Event Type | Published By | Consumed By |
|-------|-----------|-------------|-------------|
| `booking-events` | `booking.created` | API | booking-worker |
| `booking-events` | `booking.confirmed` | booking-worker | notification-worker |
| `booking-events` | `booking.cancelled` | API | booking-worker |
| `booking-events` | `booking.reminder_due` | Cloud Scheduler | notification-worker |
| `booking-events` | `waitlist.slot_available` | booking-worker | notification-worker |
| `payment-events` | `payment_intent.succeeded` | API (Stripe) | payment-worker |
| `payment-events` | `payment_intent.payment_failed` | API (Stripe) | payment-worker |
| `payment-events` | `charge.refunded` | API (Stripe) | payment-worker |
| `notification-events` | `send_email` | workers | notification-worker |
| `notification-events` | `send_push` | workers | notification-worker |

## Cloud Storage Buckets

| Bucket | Contents | Retention |
|--------|----------|-----------|
| `{project}-match-videos` | Player match video uploads (signed PUT URL) | Nearline after 1 year |
| `{project}-invoices` | Generated invoice PDFs (signed GET URL) | 7 years |
| `{project}-report-exports` | CSV/XLSX financial exports | Auto-delete after 7 days |

## API Endpoints Summary

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/password-reset/request
POST   /api/v1/auth/password-reset/confirm

GET    /api/v1/players/me
PATCH  /api/v1/players/me
GET    /api/v1/players/me/bookings
GET    /api/v1/players/me/match-history
GET    /api/v1/players/{id}               [staff]
GET    /api/v1/players/{id}/skill-history [staff]
PATCH  /api/v1/players/{id}/skill-level   [staff/ops_lead]

GET    /api/v1/courts?club_id=&date=&surface_type=
GET    /api/v1/courts/{id}/availability
POST   /api/v1/courts                     [staff]
PATCH  /api/v1/courts/{id}               [staff]
POST   /api/v1/courts/{id}/blackouts     [staff]

POST   /api/v1/bookings
GET    /api/v1/bookings
GET    /api/v1/bookings/open-games
GET    /api/v1/bookings/calendar         [staff]
GET    /api/v1/bookings/{id}
PATCH  /api/v1/bookings/{id}             [staff]
DELETE /api/v1/bookings/{id}
POST   /api/v1/bookings/{id}/join
POST   /api/v1/bookings/{id}/invite
POST   /api/v1/bookings/{id}/waitlist
POST   /api/v1/bookings/{id}/video       → signed GCS upload URL
POST   /api/v1/bookings/{id}/equipment-rental

POST   /api/v1/payments/stripe/webhook
POST   /api/v1/payments/payment-methods
GET    /api/v1/payments/payment-methods
DELETE /api/v1/payments/payment-methods/{id}
GET    /api/v1/payments/wallet
POST   /api/v1/payments/wallet/top-up
GET    /api/v1/payments/invoices
GET    /api/v1/payments/invoices/{id}/download → signed GCS URL
POST   /api/v1/payments/refunds          [staff]
POST   /api/v1/payments/discounts/apply  [staff]
PATCH  /api/v1/payments/wallet/{user_id}/adjust [staff]
POST   /api/v1/payments/process-in-person [staff]

GET    /api/v1/reports/dashboard         [staff]
GET    /api/v1/reports/revenue           [staff]
GET    /api/v1/reports/utilisation       [staff]
GET    /api/v1/reports/retention         [staff]
GET    /api/v1/reports/transactions      [staff]
GET    /api/v1/reports/stripe-payouts    [staff]
GET    /api/v1/reports/export            [staff] → signed GCS URL

GET    /api/v1/clubs/{id}
PATCH  /api/v1/clubs/{id}/settings      [admin]
GET    /api/v1/clubs/{id}/operating-hours
PUT    /api/v1/clubs/{id}/operating-hours [admin]
GET    /api/v1/clubs/{id}/pricing-rules
PUT    /api/v1/clubs/{id}/pricing-rules  [admin]
POST   /api/v1/clubs/{id}/stripe/connect [admin]

GET    /api/v1/trainers?club_id=
GET    /api/v1/trainers/{id}/availability
POST   /api/v1/trainers/{id}/availability
PUT    /api/v1/trainers/{id}/availability/{avail_id}
GET    /api/v1/trainers/{id}/bookings

POST   /api/v1/support/tickets
GET    /api/v1/support/tickets           [staff]
POST   /api/v1/support/tickets/{id}/respond [staff]
```

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env   # fill in secrets
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8080

# Staff portal
cd frontend-staff && npm install && npm run dev

# Player web
cd frontend-player && npm install && npm run dev

# Mobile
cd mobile && npm install && npx expo start

# Infra (first time)
cd infra/terraform
terraform init
terraform apply -var="project_id=YOUR_GCP_PROJECT"
```
