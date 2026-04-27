_Last updated: 2026-04-27 10:00 UTC_

# SmashBook — Implemented APIs

This file tracks every API endpoint that has a working implementation (i.e. not a `pass` stub). Update this file — with a new timestamp — each time an endpoint is implemented.

---

## Authentication — `POST/GET /api/v1/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new player account; returns access + refresh tokens |
| `POST` | `/api/v1/auth/login` | Login with email + password; returns access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Exchange a refresh token for a new token pair |
| `POST` | `/api/v1/auth/logout` | Stateless logout (client discards tokens) |
| `POST` | `/api/v1/auth/password-reset/request` | Request a password-reset email; always 202 to prevent enumeration. Publishes `password_reset` event to `notification-events` → notification worker → SendGrid email with a signed 15-min reset link |
| `POST` | `/api/v1/auth/password-reset/confirm` | Set a new password using a valid reset token (JWT type=reset); returns 400 for invalid, wrong-type, or expired tokens |

---

## Platform Admin — `POST /api/v1/admin`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/admin/onboard` | Provision a new tenant, club, courts, and owner user atomically (requires `X-Platform-Key`) |

---

## Clubs — `CRUD /api/v1/clubs`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/clubs` | Create a new club for the current tenant (admin+) |
| `GET` | `/api/v1/clubs` | List all clubs for the current tenant |
| `GET` | `/api/v1/clubs/{club_id}` | Get club profile and current settings |
| `PATCH` | `/api/v1/clubs/{club_id}` | Update club name, address, or currency (admin+) |
| `PATCH` | `/api/v1/clubs/{club_id}/settings` | Update booking rules, cancellation policy, skill config (admin+) |
| `GET` | `/api/v1/clubs/{club_id}/operating-hours` | Get operating hours for each day of the week |
| `PUT` | `/api/v1/clubs/{club_id}/operating-hours` | Replace all operating hours for the club (admin+) |
| `GET` | `/api/v1/clubs/{club_id}/pricing-rules` | Get all peak/off-peak pricing windows |
| `PUT` | `/api/v1/clubs/{club_id}/pricing-rules` | Replace all pricing rules for the club (admin+) |
| `POST` | `/api/v1/clubs/{club_id}/stripe/connect` | Initiate Stripe Connect Express onboarding; returns one-time URL (admin+) |

---

## Courts — `/api/v1/courts`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/courts` | List active courts for a club; optional filters: `surface_type`, `date+time_from+time_to` for real-time availability |
| `POST` | `/api/v1/courts` | Create a new court for a club (staff+); enforces plan court limit |
| `PATCH` | `/api/v1/courts/{court_id}` | Update court details (staff+) |
| `GET` | `/api/v1/courts/{court_id}/availability` | Get slot-by-slot availability for a court on a given date |

---

## Players — `/api/v1/players`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/players` | List active players in the tenant, sorted by name; optional `?q=` name search and `?club_id=` (reserved for G9 club-scoped filtering via `player_profiles`) |
| `GET` | `/api/v1/players/me` | Get current player's profile |
| `PATCH` | `/api/v1/players/me` | Update current player's profile details |
| `GET` | `/api/v1/players/me/bookings` | Get current player's upcoming and past bookings; returns `{ upcoming: [...], past: [...] }` sorted by start time |
| `GET` | `/api/v1/players/me/match-history` | Get current player's completed matches, most recent first |
| `PATCH` | `/api/v1/players/{player_id}/skill-level` | Staff only: assign or update a player's skill level (1.0–7.0); writes an immutable `skill_level_history` audit entry |
| `GET` | `/api/v1/players/{player_id}/skill-history` | Staff only: list all skill level changes for a player, most recent first |

---

## Memberships — `/api/v1/clubs/{club_id}/membership-plans`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/clubs/{club_id}/membership-plans` | Create a membership plan (admin+) |
| `GET` | `/api/v1/clubs/{club_id}/membership-plans` | List all membership plans for a club |
| `GET` | `/api/v1/clubs/{club_id}/membership-plans/{plan_id}` | Get a single membership plan |
| `PATCH` | `/api/v1/clubs/{club_id}/membership-plans/{plan_id}` | Update a membership plan (admin+) |

---

## Bookings — `/api/v1/bookings`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/bookings` | Create a booking (open game or private); enforces slot grid, operating hours, conflict, skill range. Staff: pass `on_behalf_of_user_id` to designate a player as organiser |
| `POST` | `/api/v1/bookings/recurring` | Staff only: create a series of bookings from an iCal RRULE (e.g. `FREQ=WEEKLY;BYDAY=MO;COUNT=12`). Each occurrence is confirmed on creation. First booking is the series parent; others carry `parent_booking_id`. `skip_conflicts=true` skips conflicted slots instead of returning 409 |
| `PATCH` | `/api/v1/bookings/{booking_id}` | Staff only: edit court, start time, notes, event name, contact fields. Re-validates conflict/blackout on time or court change |
| `GET` | `/api/v1/bookings` | List bookings for a club; staff see all, players see only their own. Filters: `date_from`, `date_to`, `booking_type`, `booking_status`, `court_id`, `player_search` (staff only — name/email substring) |
| `GET` | `/api/v1/bookings/calendar` | Staff: calendar grid view (day or week) grouped by day → court column → `slots[]`. Each slot is a discriminated union: `kind="booking"` (non-cancelled booking with players/price) or `kind="block"` (CalendarReservation — maintenance, skill filter, training block, etc.). Club-wide blocks (court_id=null) appear in every court column. Slots are sorted by `start_datetime`. Params: `club_id`, `view=day\|week`, `anchor_date` |
| `GET` | `/api/v1/bookings/open-games` | Browse publicly joinable open games; filterable by date and skill range (no auth) |
| `GET` | `/api/v1/bookings/{booking_id}` | Get booking detail; players can only see their own or open games |
| `POST` | `/api/v1/bookings/{booking_id}/join` | Player self-joins an open game; enforces skill range and capacity |
| `POST` | `/api/v1/bookings/{booking_id}/invite` | Organiser or staff invites a player; bypasses skill check; pending invite holds a slot |
| `POST` | `/api/v1/bookings/{booking_id}/respond-invite` | Invited player accepts or declines their invite; declining frees the slot for re-invite |
| `DELETE` | `/api/v1/bookings/{booking_id}` | Cancel a booking; players can cancel their own, staff can cancel any |

---

## Equipment — `/api/v1/equipment`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/equipment` | List equipment inventory for a club (no auth; tenant-scoped). Returns item type, name, rental price, total/available quantity, condition |
| `POST` | `/api/v1/equipment` | Staff only: create a new equipment item. quantity_available is set equal to quantity_total on creation |
| `PATCH` | `/api/v1/equipment/{item_id}` | Staff only: update name, price, condition, notes, or quantity_total. Increasing total restocks available by the delta; decreasing is blocked if units are out on active rentals |
| `DELETE` | `/api/v1/equipment/{item_id}` | Staff only: soft-retire an item (sets condition=retired, quantity_available=0). Blocked if any units are currently out on active rentals |
| `POST` | `/api/v1/bookings/{booking_id}/equipment-rental` | Add equipment rental to an existing booking. Requesting user must be a booking participant (staff bypass). Validates stock, creates rental record, decrements inventory, adds charge to player's amount_due. Inventory is restored automatically if the booking is later cancelled |

---

## Calendar Reservations — `/api/v1/calendar-reservations`

Staff-only CRUD for calendar blocks: maintenance windows, skill filters, training blocks, private hire, and tournament holds. Maintenance blocks prevent bookings on the court; other types filter which booking types are permitted.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/calendar-reservations` | Create a reservation. Validates time window, skill_filter anchor, recurrence rule. court_id (optional) must belong to the club |
| `GET` | `/api/v1/calendar-reservations` | List reservations for a club. Filters: `reservation_type`, `court_id`, `from_dt`, `to_dt`. Ordered by start_datetime |
| `GET` | `/api/v1/calendar-reservations/{id}` | Get a single reservation |
| `PATCH` | `/api/v1/calendar-reservations/{id}` | Update a reservation; re-validates time window, skill filter, and recurrence constraints |
| `DELETE` | `/api/v1/calendar-reservations/{id}` | Delete a reservation (204) |

---

## Trainers — `/api/v1/trainers`

Trainer availability is defined as recurring weekly windows (e.g. "every Tuesday 09:00–12:00"), bounded by an effective date range. A trainer may only manage their own availability; `ops_lead`, `admin`, and `owner` may manage any trainer's.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/trainers` | List trainers for a club with their availability embedded. Query params: `club_id` (required), `include_inactive` (default false, staff-only). Players always see active trainers only |
| `GET` | `/api/v1/trainers/{trainer_id}/open-slots` | Return available lesson time slots for a trainer on a given date. Query params: `club_id` (required), `date` (required, YYYY-MM-DD). Derived from trainer availability windows minus existing bookings. Open to all authenticated users |
| `GET` | `/api/v1/trainers/{trainer_id}/availability` | Get all availability windows for a trainer. Requires staff+ |
| `POST` | `/api/v1/trainers/{trainer_id}/availability` | Create an availability window. Trainer sets their own; ops_lead+ sets any. Validates `start_time < end_time` and `club_id` matches trainer's club |
| `PUT` | `/api/v1/trainers/{trainer_id}/availability/{availability_id}` | Update an availability window (partial). Trainer edits their own; ops_lead+ edits any. Re-validates time window |
| `DELETE` | `/api/v1/trainers/{trainer_id}/availability/{availability_id}` | Delete an availability window. Trainer deletes their own; ops_lead+ deletes any |
| `GET` | `/api/v1/trainers/{trainer_id}/bookings` | Get lesson bookings (`lesson_individual`, `lesson_group`) for a trainer. Query param: `upcoming_only` (default true). Trainer sees their own; ops_lead+ sees any |

---

## Payments — `/api/v1/payments`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/payments/stripe/webhook` | Verify Stripe signature and dispatch to the appropriate handler. Handles `payment_intent.succeeded` (marks payment succeeded, player paid, confirms booking when all players paid) and `payment_intent.payment_failed` (marks payment failed, records reason, notifies player and staff) |
| `POST` | `/api/v1/payments/payment-intent` | Create a Stripe PaymentIntent for the current player's share of a booking. Derives amount from `BookingPlayer.amount_due`; creates a `pending` Payment record; returns `client_secret` for frontend confirmation |
| `POST` | `/api/v1/payments/setup-intent` | Create a Stripe SetupIntent; returns `client_secret` and `setup_intent_id` for the frontend to collect card details via Stripe.js |
| `POST` | `/api/v1/payments/payment-methods` | Attach a Stripe PaymentMethod to the player's Stripe customer; optionally sets it as the default. Creates the Stripe customer record if this is the player's first card |
| `GET` | `/api/v1/payments/payment-methods` | List all saved card payment methods for the current player, with `is_default` flagged |
| `DELETE` | `/api/v1/payments/payment-methods/{method_id}` | Detach a saved card from the player's Stripe customer; clears `default_payment_method_id` if the removed card was the default |
| `PATCH` | `/api/v1/payments/payment-methods/{method_id}/default` | Set an existing saved card as the player's default payment method |
| `GET` | `/api/v1/payments/wallet` | Get current player's wallet balance, auto-topup settings, and full transaction history (newest first). 404 if no wallet exists |

---

## Not Yet Implemented (stubs)

| File | Endpoints |
|---|---|
| `bookings.py` | `POST /{id}/waitlist`, `POST /{id}/video` |
| `payments.py` | wallet (top-up/adjust), invoices (list/download), refunds, discounts, in-person payment |
| `staff.py` | List/create/update/deactivate staff, suspend player, send notification, post announcement |
| `players.py` | `GET /{id}` |
| `reports.py` | Dashboard, revenue, utilisation, retention, corporate events, transaction log, Stripe payouts, export |
| `support.py` | Create/list/get ticket, respond to ticket |
