_Last updated: 2026-03-24 16:00 UTC_

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
| `POST` | `/api/v1/auth/password-reset/request` | Request a password-reset token (always 202 to prevent enumeration) |
| `POST` | `/api/v1/auth/password-reset/confirm` | Set a new password using a valid reset token |

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
| `GET` | `/api/v1/players/me` | Get current player's profile |
| `PATCH` | `/api/v1/players/me` | Update current player's profile details |

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
| `PATCH` | `/api/v1/bookings/{booking_id}` | Staff only: edit court, start time, notes, event name, contact fields. Re-validates conflict/blackout on time or court change |
| `GET` | `/api/v1/bookings` | List bookings for a club; staff see all, players see only their own. Filters: `date_from`, `date_to`, `booking_type`, `booking_status`, `court_id`, `player_search` (staff only — name/email substring) |
| `GET` | `/api/v1/bookings/calendar` | Staff: calendar grid view (day or week) of all non-cancelled bookings, grouped by day → court column. Params: `club_id`, `view=day\|week`, `anchor_date` |
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

## Not Yet Implemented (stubs)

| File | Endpoints |
|---|---|
| `bookings.py` | `POST /{id}/waitlist`, `POST /{id}/video` |
| `payments.py` | Payments, wallet top-up, refunds, invoices |
| `staff.py` | Staff management — list, create, update, deactivate |
| `trainers.py` | Trainer availability — get, set, clear |
| `players.py` | `GET /me/bookings`, `GET /me/match-history`, `GET /{id}`, `GET /{id}/skill-history`, `PATCH /{id}/skill-level` |
| `courts.py` | `POST /{id}/blackouts`, `DELETE /{id}/blackouts/{blackout_id}` |
| `reports.py` | Utilisation, revenue, and booking reports |
| `support.py` | Support tickets |
