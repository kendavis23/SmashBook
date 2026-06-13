_Last updated: 2026-06-13 15:00 UTC_

# Entity Relationships — Gotchas & Cross-Entity Rules

This file is a **curated list of non-obvious constraints, bypass patterns, and cross-entity rules** that are easy to forget or misapply when writing code. It is a quick-reference for an AI coding assistant, not a schema dump.

**What it is not:** a standard ERD, a column dictionary, or a restatement of FK declarations. Anything inferable from a column name or a `FK → table` line (e.g. "Booking has a `court_id`") is deliberately omitted. For the full schema see [DATA_MODEL.md](DATA_MODEL.md) (live) and [DATA_MODEL_TARGET_STATE.md](DATA_MODEL_TARGET_STATE.md) (target). For payment mechanics see [PAYMENT_FLOW_STRATEGY.md](PAYMENT_FLOW_STRATEGY.md); for system design see [ARCHITECTURE.md](ARCHITECTURE.md).

Each entry: `Entity[.field]: <constraint or relationship> | reason: <why this exists>`. Entries marked **(planned)** describe a target-state rule whose table/column is not yet migrated.

---

## FK bypass patterns

`wallet_transactions.source_id`: UUID with **no DB FK** — resolves polymorphically against `booking` / `membership` / `invoice` / `manual` per `source_type` | reason: a single column cannot constrain to four different parent tables.
`ai_recommendations.source_event_id`: **(planned)** nullable UUID with no FK — resolves polymorphically to the originating feature table (`gap_detection_events`, `cancellation_predictions`, …) per `recommendation_type` | reason: inbox row links to many specialised tables that each own the structured data.
Wallet booking payment: does **not** transfer money to the club at pay time — it writes a `wallet_club_debts` row instead | reason: the cash was already collected into SmashBook's platform account at top-up, so the club is owed `amount − fee` separately, settled later.
`skill_level_history.ai_inference_id` / `support_messages.ai_inference_id`: plain UUID, FK to `ai_inference_log` deferred to G8 — not an enforced FK today | reason: the target table does not exist until the G8 migration.
`promo_codes.campaign_id`: plain UUID, FK to `campaigns` deferred to G10 — not enforced today | reason: `campaigns` table not migrated until G10.
`PaymentService` / `MembershipService`: bypass `platform_client()` and use the legacy module-level `stripe.api_key` global | reason: not yet migrated to the two-client model; safe only because both secrets currently point at the same Stripe account — must migrate before the corporate account split.

## Nullable FK semantics

`bookings.hold_expires_at`: NULL = paid booking **or** staff placement that **always** blocks the court; non-null = unpaid hold that frees the court if it lapses | reason: null means "permanent block", not "no value".
`booking_players.payment_deadline`: NULL = staff/credit-paid slot that **never** auto-expires; non-null = unpaid slot that gets swept | reason: absence of a deadline is a deliberate "never release" signal.
`calendar_reservations.court_id`: NULL = the block applies to **all** courts in the club | reason: club-wide closures avoid one row per court.
`waitlist_entries.court_id` / `desired_start_time`: NULL = "any court" / "any time on that date" | reason: a wildcard match, not a missing value.
`notification_templates.club_id`: **(planned)** NULL = platform-level default template shared across clubs | reason: distinguishes platform defaults from per-club overrides.
`ai_inference_log.club_id`: **(planned)** NULL = a tenant-level (not club-level) AI call | reason: some inference runs at tenant scope.
`support_messages.sender_user_id`: NULL = message authored by the AI agent | reason: AI turns have no human sender (`sender_type = 'ai'`).
`wallet_club_debts.settled_at`: NULL = debt outstanding / not yet transferred to the club | reason: settlement job selects on this being null.
`membership_subscriptions.pending_plan_id`: non-null = a downgrade is scheduled, applied at `current_period_end` | reason: encodes a deferred plan change without a separate table.
`skill_level_history.assigned_by`: NULL when `change_source = 'ai_auto'`; `previous_level` NULL = first-ever assignment | reason: AI-made changes have no human assigner.
`tenants.subscription_start_date`: NULL = tenant provisioned but not yet live | reason: go-live is a distinct event from creation.
`users.email_verified_at`: NULL blocks login | reason: gate on verification, not a soft attribute.

## State machine constraints

`payments.state`: `pending → succeeded → {refunded | partially_refunded}` or `pending → failed`; `confirm_payment` / `handle_payment_failed` early-return if already terminal | reason: webhook re-delivery must be idempotent.
`bookings.status`: set to `confirmed` only when `should_confirm` passes (all slots filled **and** every accepted player paid) — never on a single player's payment | reason: split payments mean one paid share ≠ a confirmed booking.
`payment_intent.payment_failed`: frees the player's held slot immediately; cancels the whole booking if no paid player remains | reason: a failed card attempt must not keep blocking the court.
First successful payment on a booking: clears `bookings.hold_expires_at` | reason: once anyone has paid, a long-lived (e.g. open game) booking must stop being a court hold that can expire.
`tenants.subscription_status`: billing-webhook handlers **preserve** the `suspended` value and never overwrite it from a Stripe sync | reason: `suspended` is SmashBook's own state, not a Stripe-sourced one.
`staff_invitations.status`: `pending → {accepted | revoked | expired}`, all terminal; acceptance is **single-use** — the accept path flips `pending → accepted` (stamping `accepted_at`/`accepted_user_id`) and a replay against a non-`pending` row is rejected | reason: an invite token must not create two staff profiles. *(Service enforcement lands in Phase B2; B1 is schema only.)*
`staff_invitations`: at most **one `pending`** row per `(club_id, email)` — enforced in the **service layer**, not by a DB constraint (the `(club_id, email)` index is non-unique and spans all statuses) | reason: re-inviting after revoke/expire must stay possible, so a partial-unique DB constraint would be wrong; the duplicate-pending guard is application logic. *(Phase B2.)*

## Concurrency / locking requirements

`wallets` row in `deduct_wallet`: must be locked `SELECT … FOR UPDATE` before debiting | reason: serialises concurrent debits so the balance cannot go negative under contention.
`booking_players` in the expired-hold sweep: selected `FOR UPDATE SKIP LOCKED` | reason: lets concurrent sweep workers process disjoint rows without blocking.
`settle_wallet_debts`: Stripe Transfer uses a deterministic idempotency key `"settle-" + sha256(sorted debt ids)` | reason: a prior run that created the transfer but rolled back the DB commit must not pay the club twice.
`membership_subscriptions`: partial unique index `UNIQUE(user_id, club_id) WHERE status = 'active'` | reason: a player may hold at most one active subscription per club.

## Tenant scoping rules

Operational tables: scope by **`club_id`**, not `tenant_id` — service layer enforces it on every query (no DB row-level security, ADR-006) | reason: a club is the operational isolation boundary; same `user_id` at two clubs sees neither's data.
`TenantScopedMixin` tables (direct `tenant_id`: `users`, `platform_fees`, `wallet_club_debts`, plus planned `ai_feature_flags` / `ai_inference_log`): use `tenant_clause(Model, tenant_id)`; transitively-scoped models (Court, Booking, …) must join through `clubs.tenant_id` | reason: only some tables carry a direct `tenant_id` column.
`wallets`: **global per user** (`user_id` UNIQUE, no `club_id`) — a wallet is not club-scoped | reason: pre-loaded credit is usable across all of a user's clubs.
`users`: scoped by `tenant_id`, not `club_id`; club membership is derived from `staff_profiles` (staff/trainer) or `membership_subscriptions` (player) | reason: a user belongs to a tenant and may participate in several of its clubs.
Authority has **two planes**: a **tenant plane** (`users.role` = `owner`/`admin`) granting that role at *every* club in the tenant, and a **club plane** (`staff_profiles.role` per `(user, club)`). `resolve_club_context` (`app/api/v1/dependencies/club_context.py`) collapses both into a single `effective_role` value string for `can()`/`ROLE_RANK` | reason: a tenant admin is implicitly admin of all clubs, while a `front_desk`/`trainer`/`ops_lead` is club-local; both must rank in one ordering.
`analytics_refresh_log` + all materialized views: **not** tenant-scoped | reason: views are tenant-wide aggregates and refresh is a platform operation.
`tenants` subdomain uniqueness: cross-row/cross-column uniqueness (a string in at most one of `player_subdomain` / `staff_subdomain` across all tenants) is enforced in the **application layer**, not the DB | reason: per-column UNIQUE constraints don't catch a string moving between the two columns on different tenants.

## AI feature gating

`ai_feature_flags`: **(planned)** the sole source of truth for AI feature gating — never gate an AI feature via `subscription_plans` | reason: `subscription_plans` carries only non-AI flags (`tournaments_enabled`, `messaging_enabled`, caps); plan-level AI defaults are seeded as `ai_feature_flags` rows at provisioning.
AI flag check: lives **inside `ai_inference_service`**, not in feature code | reason: every AI call funnels through the wrapper so gating, dedup, and logging can't be skipped.
`ai_feature_flags.feature`: the string must match the value written to `ai_inference_log.feature` | reason: the two tables are joined on feature name; a mismatch silently breaks gating/logging correlation.
Plan default change: never retroactively flips a live tenant's `ai_feature_flags` row | reason: defaults are seed values, the row is the runtime toggle.

## Append-only tables

`ai_inference_log`: **(planned)** insert-only, range-partitioned by `created_at` month from day one; a row is written **before** the AI output enters the business layer, **always** — including on fallback | reason: no AI decision is unlogged; partitioning a large table after the fact is painful.
`skill_level_history` / `player_engagement_scores`: insert-only, never upsert | reason: historical scores/changes are retained for audit and model evaluation.
`wallet_transactions` / `membership_credit_logs` / `platform_fees`: ledger tables — insert-only, each row stamps a point-in-time snapshot (`balance_after`, or `pct_applied` for fees) | reason: a mutable ledger can't be reconciled or audited.
`court_utilisation_snapshots`: a **physical snapshot** (not a materialized view) — `total_slots` / `revenue_potential` are frozen at snapshot time | reason: they depend on operating-hours and pricing config as it was then, which can't be reconstructed after the club changes hours/prices. This is the one analytics table that must be a snapshot; the rest are MVs.

## Stripe integration constraints

`platform_fees`: written at confirm time with `pct_applied = plan.booking_fee_pct` **as it stood at the transaction** | reason: historical fees stay auditable after the plan's rate changes.
`payments.stripe_destination_payment_id` (`py_xxx`): captured at confirm by walking Charge → Transfer | reason: a `payout.paid` balance transaction's `source` is the destination payment (`py_`), not the platform charge (`ch_`), so pre-capturing it lets reconciliation match payouts without extra Stripe API calls.
`payouts.stripe_payout_id ⇄ payments.stripe_payout_id`: a **string join, not an FK** | reason: `payout.paid` stamps payments via the connected-account `py_xxx` match independently of the `payouts` row, so a `payouts` row can be `reconciliation_status='partial'` when some payments never captured `stripe_destination_payment_id` (best-effort at confirm); `reconcile_stripe_payouts` backfills these from `stripe.Payout.list`.
`payout.failed` / `payout.canceled`: clears `stripe_payout_id` on every payment stamped to that payout and resets the `payouts` row to `unmatched` with null `matched_amount`/`discrepancy_amount`/`paid_at` | reason: the deposit never settled (or reversed), so those payments are not paid out and must not appear reconciled.
`payouts.club_id`: resolved from `event["account"]` (the `acct_xxx`) via `clubs.stripe_connect_account_id`; a payout for an unmapped account is **logged and skipped**, not errored | reason: an unknown Connect account can't be scoped to a tenant, and erroring would wedge the webhook in infinite Stripe retries.
Two Stripe webhooks (`/payments/stripe/webhook` vs `/webhooks/stripe-billing`): cannot share a URL | reason: `customer.subscription.*` and `invoice.payment_*` fire on both account identities; only the signing secret disambiguates which rail the event belongs to.
Connect destination charge: requires `clubs.stripe_connect_account_id`; clubs without it are **skipped** (not errored) by `settle_wallet_debts` | reason: their debts stay outstanding until onboarding completes.
Wallet top-up: balance credited **only** when the webhook confirms (`metadata.purpose = 'wallet_top_up'`), never optimistically | reason: an unconfirmed PaymentIntent must not inflate the balance.
`supersede_pending_stripe_payment`: raises 409 if the in-flight PI already reports `succeeded` | reason: refuses to swap to wallet payment when a double charge would result.
`stripe_billing_service.py`: must never reintroduce the module-level `stripe.api_key = …` global | reason: it would force the platform and billing accounts to share mutable state, defeating the two-client split.

## Cross-table write ordering

`confirm_payment` order: `Payment.state=succeeded` → `BookingPlayer.payment_status=paid` → clear `hold_expires_at` → confirm booking if all paid → write `PlatformFee` → publish receipt | reason: booking confirmation depends on the player being marked paid first.
`deduct_wallet` order: lock wallet → decrement + write `WalletTransaction` → write `WalletClubDebt` → (for bookings) `Payment` + `PlatformFee` + mark `BookingPlayer` paid + clear hold + confirm + publish | reason: the debt and ledger must be recorded before downstream booking state changes.
AI output: `ai_inference_log` row must be written **before** the output is used by any feature | reason: design principle — no AI output enters the business layer without a log record.
Alembic: every new enum type must be created before the column that uses it; pgvector `CREATE EXTENSION` before `player_profiles.embedding` | reason: Postgres rejects a column referencing a non-existent type/extension.

## Design decisions that override intuition

Tournament match: is a `bookings` row (`booking_type='tournament'` + `tournament_id` FK, optional `tournament_round`/`tournament_match_label`) — there is **no** `tournament_matches` table | reason: a match is a court reservation; players go in `booking_players` (with `team`), scores in `match_results`.
Membership perks: live as columns on `membership_plans` (`discount_pct`, `booking_credits_per_period`, …) — **no** perks table | reason: deliberate YAGNI; don't add one until a customer needs a perk a column can't express.
`support_tickets` / `support_messages`: cover **both** formal support and casual player↔club chat (distinguished by the planned `category` enum) — **no** `chat_threads` / `chat_messages` | reason: support and chat are one domain (threads of messages); one inbox, one query path.
`message_deliveries`: **(planned)** one unified delivery table for template-driven and campaign sends (`source` enum + nullable `template_id`/`campaign_id`) — **no** `notification_deliveries` / `campaign_deliveries` | reason: ~80% column overlap; all inbox and open/click/conversion analytics go through one table.
Invoice fields on `payments`; club settings on `clubs`; user role on `users` — there are **no** `invoices`, `club_settings`, or `tenant_users` tables | reason: May-2026 simplification merged these into their parent rows.
`membership_plans.is_default`: exactly one per club (partial unique index `WHERE is_default = TRUE`); auto-attached to a player on email verification | reason: the free basic plan every verified player lands on.
`equipment_inventory.reorder_threshold`: present in the DB but **intentionally unused** | reason: the AI purchase-order feature was descoped 2026-05-29; the column was retained rather than dropped — don't build logic on it.
`clubs.timezone`: the IANA zone (e.g. `Europe/London`) governing **both** analytics hour/day bucketing **and** the operational booking/availability path — **not** weather | reason: all datetimes are stored as true UTC `timestamptz`; club-local wall-clock (operating hours, user-supplied `HH:MM`, slot grids) is resolved against `clubs.timezone` via `app/core/timezones.py` and converted to UTC before comparison. Never stamp wall-clock as UTC. All weather features (incl. `clubs.latitude`/`longitude`) were descoped 2026-05-29; player catchment coordinates live on `users`, not `clubs`. `tenants.timezone` does not exist — there is no tenant-level zone.
`pricing_rules.session_type` resolution: `PricingService.calculate(booking_type=…)` matches the rule whose window contains the slot **and** whose `session_type` equals the booking's type; if none exists it **falls back to the `regular` rule** for that window, and returns `None` only when even `regular` is unconfigured | reason: clubs shouldn't have to configure every session type before they can take a booking — `regular` is the implicit baseline. `session_type` reuses the `bookingtype` enum (it is **not** `pricinglabel`); `label` (peak/off_peak/standard) is the orthogonal time-of-day tier, so a window can hold one rule per session type.
