_Last updated: 2026-06-05 00:00 UTC_

# SmashBook — Implemented APIs

This file tracks every API endpoint that has a working implementation (i.e. not a `pass` stub). Update this file — with a new timestamp — each time an endpoint is implemented.

---

## Authentication — `POST/GET /api/v1/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new player for a tenant + chosen club. Creates the user in an unverified state (no tokens returned) and publishes `email_verify` event to `notification-events` → notification worker → SendGrid email with a signed 24h verification link. The free basic membership at the chosen club is attached at verify time, not here. |
| `POST` | `/api/v1/auth/verify-email` | Confirm a player's email using the token emailed at registration. Sets `users.email_verified_at`, creates the active `MembershipSubscription` against the club's `is_default` plan (no Stripe — free basic plan), and publishes a `welcome` event. Idempotent on re-click. Returns 409 if the club has no default plan configured. |
| `POST` | `/api/v1/auth/complete-invitation` | Finalise a staff-initiated invitation: validates the JWT `invite` token, sets the player's password, marks the email verified, attaches the club's `is_default` membership, and publishes a `welcome` event. Single-use — rejects with 400 once `email_verified_at` is set so the invitation link can't be replayed within its 7-day TTL. Returns 400 for invalid/expired/wrong-type tokens, 409 if the club has no default plan. |
| `POST` | `/api/v1/auth/login` | Login with email + password; returns access + refresh tokens. Returns 403 with "please verify your email" if `email_verified_at` is NULL. |
| `POST` | `/api/v1/auth/refresh` | Exchange a refresh token for a new token pair |
| `POST` | `/api/v1/auth/logout` | Stateless logout (client discards tokens) |
| `POST` | `/api/v1/auth/password-reset/request` | Request a password-reset email; always 202 to prevent enumeration. Publishes `password_reset` event to `notification-events` → notification worker → SendGrid email with a signed 15-min reset link |
| `POST` | `/api/v1/auth/password-reset/confirm` | Set a new password using a valid reset token (JWT type=reset); returns 400 for invalid, wrong-type, or expired tokens |

---

## Platform Admin — `/api/v1/admin`

All endpoints require the shared `X-Platform-Key` header. Used by SmashBook internal tooling only; never called by tenant clients.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/admin/onboard` | Provision a new tenant, one or more clubs, and an owner user atomically (courts are added later from the staff portal) |
| `POST` | `/api/v1/admin/bookings/release-expired-holds` | Court-hold expiry sweep (Cloud Scheduler, every minute): free slots whose unpaid hold elapsed, cancel in-flight PaymentIntents, cancel bookings with no paying player. Returns `{released, reconciled, cancelled_bookings}`. Idempotent |
| `GET` | `/api/v1/admin/plans` | List all subscription plans |
| `POST` | `/api/v1/admin/plans` | Create a subscription plan (limits, fees, feature flags, `stripe_price_id`) |
| `GET` | `/api/v1/admin/plans/{plan_id}` | Get a single plan |
| `PUT` | `/api/v1/admin/plans/{plan_id}` | Update plan fields |
| `GET` | `/api/v1/admin/tenants` | List all tenants (plan name, club count, subscription status) |
| `GET` | `/api/v1/admin/tenants/{tenant_id}` | Get tenant detail including Stripe IDs and subscription status |
| `PATCH` | `/api/v1/admin/tenants/{tenant_id}` | Update tenant org fields (`name`, `subdomain`, `custom_domain`, `is_active`, `subscription_start_date`) and/or the tenant's owner user (`owner_email`, `owner_full_name`) |
| `POST` | `/api/v1/admin/tenants/{tenant_id}/activate` | Create Stripe Customer (if needed) and Subscription on the plan's `stripe_price_id`; flip `is_active=true` |
| `POST` | `/api/v1/admin/tenants/{tenant_id}/suspend` | Cancel the Stripe subscription; set `is_active=false` and `subscription_status=suspended` |
| `POST` | `/api/v1/admin/tenants/{tenant_id}/change-plan` | Move tenant to a different plan; if a Stripe sub exists, update its price with proration |

---

## Subscription (org-facing) — `/api/v1/subscription`

JWT-protected; **owner role only**. Scoped to the authenticated user's tenant. This is the SmashBook → org billing relationship — distinct from the org's own Stripe Connect on `/clubs/{id}/stripe/connect`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/subscription` | View plan, limits, current usage (clubs / courts / staff), feature flags, billing status, `current_period_end`, and whether a payment method is on file |
| `GET` | `/api/v1/subscription/invoices` | List up to the 20 most recent invoices from Stripe (id, status, amount, hosted invoice URL, PDF link) |
| `POST` | `/api/v1/subscription/setup-intent` | Create a Stripe SetupIntent so the frontend can collect card details via Stripe Elements. Auto-creates the Stripe Customer if not yet present |
| `PUT` | `/api/v1/subscription/payment-method` | Attach the payment method (returned by Stripe Elements) and set it as the customer's default for invoices |

---

## Stripe Webhooks — `/api/v1/webhooks`

Two separate webhook URLs receive Stripe events. They must remain separate because event types like `customer.subscription.*` and `invoice.payment_*` fire on both account types, and only the URL + signing secret can disambiguate which Stripe relationship the event belongs to.

| Method | Path | Stripe scope | Signing secret | Handlers |
|---|---|---|---|---|
| `POST` | `/api/v1/payments/stripe/webhook` | Connected accounts (org → player) | `STRIPE_WEBHOOK_SECRET` | `payment_intent.*`, `payout.paid`, membership-tier `customer.subscription.*` and `invoice.*` events for player memberships |
| `POST` | `/api/v1/webhooks/stripe-billing` | Your account (SmashBook → org) | `STRIPE_BILLING_WEBHOOK_SECRET` | `invoice.payment_succeeded/failed` (sync `subscription_status`), `customer.subscription.updated/deleted` (sync status, preserves `suspended` set by `/admin/.../suspend`) |

Both handlers verify the `Stripe-Signature` header against the relevant secret and return 400 on signature mismatch; unhandled event types are acked with 2xx.

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
| `GET` | `/api/v1/clubs/{club_id}/availability` | Chronological list of bookable slots + joinable open matches. Query params: `start_date` (required), `end_date`, `surface`, `from_time`, `to_time`. Joinable matches are filtered to the authenticated requestor's own skill level (looked up server-side, not passed in), and open games the requestor is already an active player in are excluded. When `end_date` is omitted, returns up to 40 slot rows + `next_cursor` for FE paging |

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
| `POST` | `/api/v1/players/invite` | Staff only: invite a player to a club in the current tenant by `{email, full_name, club_id}`. Creates an unverified player with a placeholder password and a wallet, then publishes a `player_invite` event → SendGrid email with a signed 7-day link to `/complete-invitation`. Returns 404 if the club is not in the staff's tenant, 409 if the email is already registered. |
| `GET` | `/api/v1/players/me` | Get current player's profile |
| `PATCH` | `/api/v1/players/me` | Update current player's profile details |
| `GET` | `/api/v1/players/me/bookings` | Get current player's upcoming and past bookings; returns `{ upcoming: [...], past: [...] }` sorted by start time. Each item includes `club_name` and `court_name` for display. |
| `GET` | `/api/v1/players/me/match-history` | Get current player's completed matches, most recent first. Each item includes `club_name` and `court_name` for display. |
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
| `POST` | `/api/v1/clubs/{club_id}/memberships/subscribe` | Player: subscribe to a membership plan. Stripe Product+Price provisioned lazily on first subscribe. Returns `client_secret` for non-trial plans (frontend must confirm with Stripe.js). Enforces duplicate-subscription and enrollment-cap guards. |
| `GET` | `/api/v1/clubs/{club_id}/memberships/me` | Get calling player's membership subscription for this club |
| `POST` | `/api/v1/clubs/{club_id}/memberships/me/upgrade` | Player: upgrade to a higher-priced plan immediately. Uses Stripe-native proration (`proration_behavior=always_invoice`, `billing_cycle_anchor=now`) so the unused portion of the current period is credited against the new plan's first charge and the renewal cycle restarts now. From the free default plan, behaves as a fresh subscribe. Returns 400 if new plan ≤ current plan price, 409 if same plan or at capacity. |
| `POST` | `/api/v1/clubs/{club_id}/memberships/me/downgrade` | Player: schedule a downgrade to a strictly lower-priced plan, applied at the next cycle boundary. Sets Stripe `cancel_at_period_end=True` and stores `pending_plan_id` on the local row. No immediate charge or proration — benefits are retained until `current_period_end`, at which point the `customer.subscription.deleted` webhook provisions the new plan (free target = local-only row, paid target = fresh Stripe subscription). Returns 400 if new plan ≥ current plan price, 409 if a downgrade is already scheduled or the player is already on the target. |
| `POST` | `/api/v1/clubs/{club_id}/memberships/me/downgrade/cancel` | Player: reverse a scheduled downgrade. Flips Stripe `cancel_at_period_end` back to `false` and clears `pending_plan_id`. Returns 409 if no downgrade is scheduled. |
| `POST` | `/api/v1/clubs/{club_id}/memberships/me/cancel` | Player: cancel active membership at period end. Benefits continue until period end. Stripe `cancel_at_period_end=True` set immediately. |

**Webhook events now handled** (via `POST /api/v1/payments/stripe/webhook`):
- `customer.subscription.updated` — syncs status, period dates, cancel flag
- `customer.subscription.deleted` — marks subscription cancelled
- `invoice.payment_succeeded` — on renewal, resets credits and guest passes for the new period; on first payment, activates subscription
- `invoice.payment_failed` — fires `membership_payment_failed` notification so player can update payment method

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
| `POST` | `/api/v1/payments/wallet/top-up` | Create a Stripe PaymentIntent for a wallet top-up. Accepts `amount_pence` (min 100) and optional `payment_method_id` (falls back to saved default). Auto-creates wallet if the player has none. Returns `client_secret` and `payment_intent_id` for frontend confirmation. Webhook `payment_intent.succeeded` (purpose=`wallet_top_up`) credits the balance and records a `WalletTransaction` |
| `POST` | `/api/v1/payments/wallet/pay-booking` | Pay for a booking using wallet balance. Deducts `BookingPlayer.amount_due`, writes a `Payment(method=wallet, state=succeeded)` record, marks the player's `BookingPlayer.payment_status = paid`, and confirms the booking if all accepted players have paid. Returns `{balance_after, transaction_id}`. 402 if balance insufficient; 404 if player not in booking; 409 if already paid. Creates a `WalletClubDebt` for deferred Stripe settlement |
| `POST` | `/api/v1/payments/wallet/settle-debts` | Admin only. Transfer all unsettled wallet-debit obligations to each club's Stripe Connect account. Groups debits by club, issues one `stripe.Transfer` per club (net of platform fee), stamps `settled_at`. Returns `{settled_count, total_transferred, skipped_count}`. Clubs without a Connect account are skipped. |

---

## Analytics — `GET /api/v1/analytics` (Sprint 7 / G7)

Read-only, `staff`+ only, tenant-isolated, served off the **read replica** from
`court_utilisation_snapshots` (populated by the snapshot worker — see below).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/analytics/utilisation/clubs/{club_id}/daily` | Daily court utilisation for a club, summed across its courts (one point per day). Reads daily-rollup snapshot rows (`hour_of_day IS NULL`). Optional `date_from`/`date_to` (default trailing 30 days; 366-day cap → 413). Tenant-isolated (404 for another tenant's club). |
| `GET` | `/api/v1/analytics/utilisation/clubs/{club_id}/courts` | Per-court utilisation rolled up over the date range, ordered busiest-first. Surfaces under-used courts. |
| `GET` | `/api/v1/analytics/utilisation/clubs/{club_id}/heatmap` | Average utilisation by (day-of-week, hour-of-day) from hourly snapshot rows — the booking heatmap. |

Percentages are recomputed as `SUM(booked)/SUM(total)`, never averaged from per-row percentages.

### Revenue ("Financials by club") — `/api/v1/analytics/revenue`

Read-only, `staff`+ only, tenant-isolated, served off the **read replica** from the
revenue materialized views (`mv_revenue_by_club_day_service` / `…_cash`). All
totals are **transactional revenue** (membership MRR excluded). `?basis=service|cash`
selects the view: `service` buckets by booking start (accrual), `cash` by payment date.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/analytics/revenue/clubs/{club_id}/timeseries` | Net/gross/refund over time. `granularity=day\|week\|month` (default day), `basis=` (default service), optional `date_from`/`date_to` (trailing 30d; 366-day cap → 413). Tenant-isolated (404 for another tenant's club). |
| `GET` | `/api/v1/analytics/revenue/clubs/{club_id}/by-type` | Revenue split across the six revenue types (5 booking types + `equipment`). |
| `GET` | `/api/v1/analytics/revenue/clubs/{club_id}/summary` | KPI block: gross / refunds / net / per-type / avg-per-transaction. |
| `GET` | `/api/v1/analytics/revenue/clubs` | Tenant-wide per-club comparison (multi-site ROI view); clubs with no revenue still appear with zeroed totals. |

Aggregation rolls up the pre-aggregated MV grain with `SUM(net)` etc. — never
averages per-row figures. Equipment uses **subtract-embedded** attribution so the
six types reconcile exactly to `SUM(payments.amount)`.

### Player value — `/api/v1/analytics/players`

Read-only, `staff`+ only, tenant-isolated, served off the **read replica** from the
`mv_player_value` materialized view (grain `(club_id, user_id)`), joined to `users`
for display names. `lifetime_spend` is **net realised spend** (player's own
succeeded/refunded payments, minus refunds; membership MRR excluded). A "paid
member" has an active subscription on a plan with `price > 0`. All paginate via
`?limit` (≤500) / `?offset`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/analytics/players/clubs/{club_id}/value` | Per-player LTV leaderboard, highest first. `?members_only=true` restricts to paid members; `?sort=lifetime_spend\|bookings_played\|last_played_at`. Tenant-isolated (404 for another tenant's club). |
| `GET` | `/api/v1/analytics/players/clubs/{club_id}/most-active` | Most-active players ranked by on-court bookings in the window. `?window_days=30\|90` (else 422). |
| `GET` | `/api/v1/analytics/players/clubs/{club_id}/inactive-members` | Paid members idle ≥ `?inactive_days` (default 30, never-played included), longest-gone first. Returns `member_count` (denominator) + `inactive_count`. The non-AI sibling of Sprint-9 churn scoring. |
| `GET` | `/api/v1/analytics/players/clubs/{club_id}/value/by-group` | Group LTV (workstream C): lifetime value rolled up by `?dimension=membership_tier\|member_status\|activity_status` (default tier), groups ordered by total spend. Each row: `player_count`, `paid_member_count`, `total_lifetime_spend`, `avg_lifetime_spend`, `total_lifetime_refunds`, `total_bookings_played`. `?inactive_days` applies only to `activity_status`. Pure `GROUP BY` over `mv_player_value` — no new view. |

Club-level **player-flow** metrics (workstream A) read two further views —
`mv_club_active_player_day` (presence) and `mv_club_signups_day` (flow) — same
`staff`+ / tenant-isolated / read-replica contract. Active counts are always
`COUNT(DISTINCT user_id)` (never summed across days); sign-ups count new **paid**
subscription starts only (`membership_plans.price > 0`).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/analytics/players/clubs/{club_id}/active` | Active-players KPI: distinct players on court in the trailing `?window_days` (default 30, 1–365) ending `?as_of` (default today). |
| `GET` | `/api/v1/analytics/players/clubs/{club_id}/active/timeseries` | Distinct active players per calendar bucket (WAP/MAP). `?granularity=day\|week\|month` (default week), optional `date_from`/`date_to` (trailing 30d; 366-day cap → 413). Calendar buckets, not a trailing window. |
| `GET` | `/api/v1/analytics/players/clubs/{club_id}/signups` | New paid-member sign-ups over time + range total. `?granularity=day\|week\|month` (default month), optional range (366-day cap → 413). |

Report **exports** are asynchronous (analytics/CLAUDE.md rule 5): the endpoint
validates and enqueues, the worker builds the file and emails a signed link.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/analytics/exports` | Queue an async report export (`staff`+, tenant-isolated). Body: `report_type` (`revenue_summary\|revenue_by_type\|revenue_timeseries\|player_value`), `club_id`, `format` (`csv\|xlsx`, default csv), optional `date_from`/`date_to`/`basis`. Returns `202` — the worker emails a 1-hour signed GCS download URL to the caller. Replaces the retired synchronous `GET /reports/export`. |

**Workers:**
- `app/analytics/workers/snapshot_court_utilisation.py` — Pub/Sub-push Cloud Run service (Cloud Scheduler → `analytics-events`). `analytics.snapshot_daily` snapshots each club's local yesterday; `analytics.snapshot_backfill` backfills a trailing window (default 90 days). Delete-then-insert per (court, day) → idempotent.
- `app/analytics/workers/refresh_views.py` — Pub/Sub-push Cloud Run service (Cloud Scheduler → `analytics-events`, `analytics.refresh_views`). `REFRESH … CONCURRENTLY` over the registered views (`mv_revenue_by_club_day_service`, `…_cash`, `mv_player_value`, `mv_club_active_player_day`, `mv_club_signups_day`); logs each run to `analytics_refresh_log` and publishes failures to `analytics-alerts`. The first MV-refresh worker in the system.
- `app/analytics/workers/export_report.py` — Pub/Sub-push Cloud Run service on its own `analytics-export-events` topic, handles `analytics.export_requested` (published by `POST /analytics/exports`). Builds the report off the read replica, serialises to CSV/XLSX, uploads to `GCS_BUCKET_EXPORTS` (1h signed URL, 7-day lifecycle delete), and emails the link via SendGrid. Failures publish to `analytics-alerts`.

---

## Not Yet Implemented (stubs)

| File | Endpoints |
|---|---|
| `bookings.py` | `POST /{id}/waitlist`, `POST /{id}/video` |
| `payments.py` | wallet (adjust), invoices (list/download), refunds, discounts, in-person payment, `GET /transactions` (transaction log), `GET /payouts` (Stripe payout reconciliation) |
| `staff.py` | List/create/update/deactivate staff, suspend player, send notification, post announcement |
| `players.py` | `GET /{id}` |
| `support.py` | Create/list/get ticket, respond to ticket |

### Retired

- `reports.py` (whole module) — removed in the analytics-domain migration. Its
  concerns were redistributed: utilisation, revenue, dashboard, corporate-events
  and retention → `app/analytics` (`/api/v1/analytics/{utilisation,revenue,players}`
  + the new `POST /analytics/exports`); transaction log and Stripe payouts →
  `payments.py` (`GET /payments/transactions`, `GET /payments/payouts`) as
  row-level operational lists. See `app/analytics/docs/REPORT_CATALOG.md`.
