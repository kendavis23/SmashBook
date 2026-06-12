_Last updated: 2026-06-12 00:00 UTC_

# SmashBook — Infrastructure Target State

> **What this file is:** The complete target infrastructure for SmashBook — every Cloud Run service, Cloud SQL instance, Pub/Sub topic, scheduled job, secret, IAM binding, and supporting GCP resource the platform will need across all sprints and phases. It is the staged blueprint for what Terraform must declare by the time the platform is fully deployed.
>
> **What it is not:** A migration script or a standing-order to apply everything immediately. Each stage below is a discrete unit of Terraform work that should land in its own PR, alongside the sprint that consumes it. Nothing in this file should be applied ahead of the sprint that needs it — over-provisioning early creates drift between Terraform and what is actually running.
>
> **Relationship to live infrastructure:** The current Terraform in `infra/terraform/` reflects what is actually deployed in `smashbook-488121`. This document is the forward-looking blueprint. The diff between the two is the infrastructure backlog at any given time. When a stage is delivered, mark it ✅ in the [Stage Status](#stage-status) table and move the relevant items into a "Delivered" note.
>
> **How to use this with Claude:** When you're ready to deliver a stage, ask Claude to "generate Terraform for Stage N from `INFRASTRUCTURE_TARGET_STATE.md`." Each stage is self-contained — file-by-file changes, new resources, IAM bindings, and import notes are listed explicitly so Claude can produce a complete PR-ready patch without needing to re-derive context from the architecture docs.

---

## Table of Contents

- [Stage Status](#stage-status)
- [Suggested Ordering](#suggested-ordering)
- [Stage 0 — Current State (Delivered)](#stage-0--current-state-delivered)
- [Stage 1 — MVP Hardening (Sprint 4–6)](#stage-1--mvp-hardening-sprint-46)
- [Stage 2 — Production Readiness (Sprint 6–7)](#stage-2--production-readiness-sprint-67)
- [Stage 3 — AI Phase 1 (Sprint 7–8)](#stage-3--ai-phase-1-sprint-78)
- [Stage 4 — AI Phase 2 (Sprint 9–10)](#stage-4--ai-phase-2-sprint-910)
- [Stage 5 — AI Phase 3 (Sprint 11–12)](#stage-5--ai-phase-3-sprint-1112)
- [Stage 6 — Cross-Tenant Analytics (Sprint 13+)](#stage-6--cross-tenant-analytics-sprint-13)
- [Production Go-Live Checklist](#production-go-live-checklist)
- [Cross-Cutting Conventions](#cross-cutting-conventions)
- [Maintenance & Updates](#maintenance--updates)

---

## Stage Status

Update this table as each stage is delivered. The stage is "Delivered" only when the Terraform is merged AND the resources are live AND drift has been verified with `terraform plan`.

| Stage | Scope | Sprint | Status | Delivered date |
|---|---|---|---|---|
| 0 | Current state baseline | Sprint 1–3 | ✅ Delivered | 2026-04 |
| 1 | MVP hardening | Sprint 4–6 | ✅ Delivered | 2026-05-10 |
| 2 | Production readiness | Sprint 6–7 | 🟡 Pending | — |
| 3 | AI Phase 1 | Sprint 7–8 | 🟡 Pending | — |
| 4 | AI Phase 2 | Sprint 9–10 | 🟡 Pending | — |
| 5 | AI Phase 3 | Sprint 11–12 | 🟡 Pending | — |
| 6 | Cross-tenant analytics (BigQuery) | Sprint 13+ | 🟡 Pending | — |

---

## Suggested Ordering

The stages below are designed to be delivered in order. The reasoning:

1. **Stage 1 (MVP hardening)** lands first because every item in it is a gap that exists *today* and would block production go-live regardless of AI work — Cloud Storage, read replica, pgvector, production environment scaffold, Terraform remote state. None of it is AI work and all of it derisks what comes next.
2. **Stage 2 (production readiness)** is the "before any AI worker ships" pass — VPC connector, Cloud Armor, monitoring, the Anthropic and Vertex AI access. It is easy to skip and will bite hard the first time production traffic hits the platform.
3. **Stage 3 (AI Phase 1)** is the first AI delivery — gap detection, dynamic pricing, dashboard insights. This is where the Terraform expansion gets significant: two new workers, three new scheduled jobs, plus operational jobs (partition management, archive, materialized view refresh) that are easy to forget but mandatory.
4. **Stage 4 (AI Phase 2)** adds churn, segmentation, matchmaking, cancellation prediction. Mostly mechanical — more topics, more workers, more scheduled jobs — once Stage 3 has established the pattern.
5. **Stage 5 (AI Phase 3)** is conversational booking, support chatbot, CV court analysis. This phase mostly reuses existing infrastructure (Anthropic for language tasks; pgvector already on Cloud SQL); only the competitor scrape job is genuinely new.
6. **Stage 6 (BigQuery)** is deliberately last. The architecture is explicit that cross-tenant analytics is post-MVP, and it should not be introduced until there is a real reporting query that the four-tier read-path (Tier 1–3) cannot answer.

The single biggest risk in skipping the ordering is **worker idempotency (Stage 3.6)**. AI workers must deduplicate Pub/Sub redeliveries before they ship — without it, a single redelivered `gap-detected` event causes duplicate Anthropic API calls and duplicate notification sends. The DLQ work in Stage 1.6 covers the poison-message case; idempotency is the separate "same message delivered twice" case.

---

## Stage 0 — Current State (Delivered)

This is what is in `infra/terraform/` and live in `smashbook-488121` today. It is the baseline every later stage builds on.

### Cloud Run Services
- `padel-api` — public ingress, `roles/run.invoker` for `allUsers`
- `padel-booking-worker` — Pub/Sub push subscription on `booking-events`
- `padel-payment-worker` — Pub/Sub push subscription on `payment-events`
- `padel-notification-worker` — Pub/Sub push subscription on `notification-events`

### Cloud SQL
- `smashbook-staging` (PostgreSQL 18) — single primary instance
- `padel_db` database
- No read replica yet
- pgvector extension status: not yet enabled at the instance flag level

### Pub/Sub
- Topics: `booking-events`, `payment-events`, `notification-events`
- Push subscriptions: one per worker, no dead-letter policy
- `roles/run.invoker` granted to the Pub/Sub service agent on each worker service

### Secret Manager (resources only — values managed via `gcloud`)
- `padel-database-url`
- `padel-database-read-replica-url` (declared, no replica yet to point it at)
- `padel-secret-key`
- `stripe-secret-key`
- `stripe-webhook-secret` (Connect-account events: org → player)
- `stripe-billing-webhook-secret` (platform-account events: SmashBook → org subscription)
- `sendgrid-api-key`
- `padel-platform-api-key`

### IAM
- `github-actions-deployer@smashbook-488121.iam.gserviceaccount.com` — deploy SA
- `607958067144-compute@developer.gserviceaccount.com` — runtime SA (default compute SA)
- Project-level roles for both: standard set for build, deploy, run, and Cloud SQL client

### Artifact Registry
- `padel-api` repository in `europe-west2` — stores both `padel-api` and `padel-worker` images

### Terraform layout
- Single workspace, single environment (staging)
- Backend: ⚠️ **assumed local** — promote to GCS in Stage 1
- Import script `import.sh` exists for one-time adoption of pre-existing resources

---

## Stage 1 — MVP Hardening (Sprint 4–6)

> **Goal:** close every infrastructure gap that blocks production go-live, regardless of AI work. Nothing in this stage is AI-related — it is the "make staging look like a real platform" pass.

### 1.1 Terraform remote state

**Why:** Local Terraform state means the frontend collaborator and Ken can corrupt each other's state. Required before any other multi-author Terraform work.

**Resources:**
- `google_storage_bucket` for state — versioned, uniform access, lifecycle rule to keep N versions
- `backend "gcs"` block in `main.tf` pointing at it

**Notes:**
- The bucket must be created out-of-band via `gcloud` first (chicken-and-egg with backend)
- Add the bucket to the import script for documentation completeness

### 1.2 Cloud Storage buckets

**Why:** `ARCHITECTURE.md` lists Cloud Storage for "receipts, exports, court media, and Terraform remote state" but no bucket is in the Terraform.

**Resources:**
- `padel-media-staging` — booking receipts, court media, player avatars
- `padel-exports-staging` — async CSV exports, signed-URL retrieval
- `padel-ai-archive-staging` — `ai_inference_log` payload archives (>90 days). Pre-create the bucket now even though the archive job lands in Stage 3
- IAM: runtime SA gets `roles/storage.objectAdmin` on media + exports + ai-archive buckets

### 1.3 Cloud SQL read replica

**Why:** §11 Service Inventory specifies "one primary instance + one read replica." Reporting and AI feature reads should target the replica.

**Resources:**
- `google_sql_database_instance.replica` with `master_instance_name = google_sql_database_instance.main.name`
- `replica_configuration` block, `failover_target = false`
- Set the value of `padel-database-read-replica-url` secret via `gcloud` after replica is up
- Update `cloud_run.tf` to inject the read-replica URL into services that need it (none yet — full wiring happens in service code)

### 1.4 pgvector enablement

**Why:** Required for Stage 4 matchmaking and Stage 5 conversational booking. Cheap to enable now; expensive to retrofit.

**Resources:**
- Add `database_flags { name = "cloudsql.enable_pgvector" value = "on" }` to the primary instance
- Repeat on the replica
- ⚠️ Verify the current flag name — GCP has shifted this naming
- Schema-level `CREATE EXTENSION vector` is run via Alembic, not Terraform

### 1.5 Production environment scaffold

**Why:** Everything is hardcoded to `smashbook-staging`. Doing this cleanly now is much cheaper than after production exists.

**Approach (pick one in PR review):**
- **Option A:** Separate `infra/terraform/staging/` and `infra/terraform/prod/` directories with shared modules in `infra/terraform/modules/`
- **Option B:** Terraform workspaces (`terraform workspace new prod`) with `var.environment`-driven instance names

**Resources affected:** every existing resource gains an environment suffix or workspace-scoped name. The variables file gets an `environment` variable consumed everywhere.

### 1.6 Cloud SQL backups

**Why:** Backups are currently disabled on `smashbook-staging`. Before any real customer data lands, automated backups and point-in-time recovery must be enabled. Data loss without backups is unrecoverable.

**Resources:**
- Update `database.tf` `backup_configuration` block: `enabled = true`, `point_in_time_recovery_enabled = true`
- `start_time = "19:00"` (low-traffic window), `transaction_log_retention_days = 7`, `retained_backups = 15`
- Repeat on the replica once it is created (Stage 1.3)

### 1.7 Dead-letter queues for existing subscriptions

**Why:** Pulled forward from Stage 2 because it is trivial and applies to MVP workers too. Pub/Sub at-least-once delivery means a poison message in `booking-events` today can loop forever.

**Resources:**
- `google_pubsub_topic.booking_events_dlq`, `payment_events_dlq`, `notification_events_dlq`
- Add `dead_letter_policy { dead_letter_topic = ... max_delivery_attempts = 5 }` to each existing subscription
- Grant Pub/Sub service agent `roles/pubsub.publisher` on each DLQ topic

### 1.8 Scheduled Jobs (Cron)

MVP-era cron jobs that must run before production go-live. The Cloud Scheduler SA from Stage 2.5 is needed for the OIDC-authenticated targets; if Stage 2 has not landed yet, create a minimal SA here as a placeholder.

`payment-retry-job` and `waitlist-offer-expiry-job` were originally scoped to Stage 1 but have been moved to Stage 2 (§2.7) — they belong with the other production-readiness crons on the §2.5 Scheduler → Pub/Sub pattern, and deferring keeps Stage 1 focused on structural hardening.

`release-expired-holds` is the exception that does ship in Stage 1: because its target endpoint is header-gated (not IAM-gated) it has no Stage 2 dependency. It is paused in staging (no need to run continuously there) and fires every minute in prod. **Note:** this header-gated `X-Platform-Key` shortcut is a staging-only divergence — it breaks under the P1 ingress lockdown and is tracked for refactor onto the §2.5 Pub/Sub pattern as **P2** in the Production Go-Live Checklist.

| Job | Schedule | Purpose | Status |
|---|---|---|---|
| `db-migration` | CI/CD (not Cloud Scheduler) | `alembic upgrade head` before each Cloud Run revision receives traffic — wired into the GitHub Actions deploy pipeline | ✅ Implemented |
| `release-expired-holds` | `* * * * *` (prod); paused in staging | Cloud Scheduler → `POST /api/v1/admin/bookings/release-expired-holds` — frees abandoned court/slot holds past their payment deadline. Currently header-gated: `padel-api` is public and the endpoint is gated by the `X-Platform-Key` header, which the job sends from the `padel-platform-api-key` secret. Module: `be-infra/terraform/modules/scheduler`. **Refactor to Scheduler → Pub/Sub (§2.5) before prod — tracked as P2; the current HTTP path breaks under the P1 ingress lockdown.** | 🚧 Terraform written, pending apply |

### 1.9 Additional Pub/Sub topic — `booking-cancelled`

**Why:** `booking-events` carries all booking lifecycle messages but cancellations need independent fan-out at MVP: the booking worker must release waitlist slots immediately when a booking is cancelled, and in Stage 3 the gap detection worker needs cancellations to re-evaluate court utilisation. Keeping these as a single message type in `booking-events` means the gap detection worker would have to subscribe to all booking traffic and filter — noisy and wasteful. A dedicated topic is cleaner.

**Design:** `padel-api` publishes to `booking-cancelled` at the point of cancellation (in addition to the existing `booking-events` publish). The booking worker subscribes to `booking-cancelled` for waitlist logic; the gap detection worker (Stage 3) adds a second subscription.

**Resources:**
- `google_pubsub_topic.booking_cancelled`
- `google_pubsub_topic.booking_cancelled_dlq`
- Push subscription for `padel-booking-worker` on `booking-cancelled`
- Dead-letter policy: max 5 attempts, same pattern as Stage 1.7

### 1.10 Inbound Webhooks (Stripe)

**Why:** Stripe pushes payment lifecycle events to two separate endpoints on `padel-api` — one for events on connected accounts (org→player), one for events on SmashBook's own account (SmashBook→org subscription billing). They cannot share a URL because event types like `customer.subscription.*` and `invoice.payment_*` fire on both account types and only the signing secret can disambiguate.

**Infrastructure:** no new GCP resources — webhook receipt is handled inline by `padel-api`. Two Stripe Dashboard webhook entries are required: one registered as "Events on Connected accounts" pointing at `/payments/stripe/webhook`, and one registered as "Events on your account" pointing at `/webhooks/stripe-billing`. Each generates its own signing secret, stored in the corresponding GCP Secret Manager entry.

**Connected-account events** (verified with `stripe-webhook-secret` → `/api/v1/payments/stripe/webhook`):

| Stripe event | Action | Status |
|---|---|---|
| `payment_intent.succeeded` | Mark booking paid; publish to `payment-events` for confirmation flow | ✅ Implemented |
| `payment_intent.payment_failed` | Flag payment failed; notify staff; publish to `payment-events` | ✅ Implemented |
| `charge.dispute.created` | Set `payments.dispute_status = 'open'`; queue for manual review | ❌ Not implemented |
| `account.updated` | Sync `clubs.stripe_connect_status`; block bookings if account deactivated | ❌ Not implemented |
| `payout.paid` | Populate `payments.stripe_payout_id` for affected transfers | ✅ Implemented |
| `customer.subscription.*` / `invoice.*` (memberships on connect accounts) | Sync membership subscription state | ✅ Implemented |

**Platform-account events** (verified with `stripe-billing-webhook-secret` → `/api/v1/webhooks/stripe-billing`):

| Stripe event | Action | Status |
|---|---|---|
| `invoice.payment_succeeded` | Set `tenants.subscription_status = 'active'` (skip if already `suspended`) | ✅ Implemented |
| `invoice.payment_failed` | Set `tenants.subscription_status = 'past_due'` (skip if already `suspended`) | ✅ Implemented |
| `customer.subscription.updated` | Sync `tenants.subscription_status` from Stripe (skip if `suspended`) | ✅ Implemented |
| `customer.subscription.deleted` | Set `is_active = false`, `subscription_status = 'canceled'` (preserves `suspended`), clear `stripe_subscription_id` | ✅ Implemented |

**Security note:** every handler must verify the `Stripe-Signature` header against its own signing secret before processing. Any unverified event must return 400 and be discarded.

### Stage 1 deliverables checklist

- [x] GCS state backend live, local state migrated
- [x] Three Cloud Storage buckets created and IAM bound
- [x] Read replica live, secret value set _(delivered 2026-05-10: `smashbook-staging-replica`)_
- [x] pgvector extension created via Alembic _(delivered 2026-05-10: no instance flag needed on PostgreSQL 15+; `CREATE EXTENSION vector` only)_
- [x] Production environment scaffold merged _(delivered 2026-05-10: `be-infra/terraform/prod/` with prod-tuned settings — HA, backups, `db-custom-2-4096`; no GCP project yet)_
- [x] Backups and point-in-time recovery enabled on Cloud SQL _(delivered 2026-05-10: 15 retained, 19:00 UTC window, 7-day PITR)_
- [x] DLQ topics + policies on three MVP subscriptions _(delivered 2026-05-10: `booking-events-dlq`, `payment-events-dlq`, `notification-events-dlq`; max 5 attempts; Pub/Sub service agent publisher granted)_
- [ ] `booking-cancelled` topic + DLQ + booking worker subscription live (§1.9)
- [x] `payout.paid` webhook handler implemented (§1.10)
- [ ] Stripe webhook handlers for `charge.dispute.created`, `account.updated` implemented (§1.10)

---

## Stage 2 — Production Readiness (Sprint 6–7)

> **Goal:** everything that must exist *before* the first AI worker ships and *before* production go-live. After this stage the platform is operationally safe to run real customer traffic.

### 2.1 Serverless VPC connector — ✅ Delivered (staging, 2026-05-29)

**Why:** Required for Cloud SQL private IP migration (an upcoming hardening step) and any future use of internal-only services. Cheap to add now; expensive to retrofit once production traffic is live and Cloud Run services need to be revision-rolled to attach to it.

**Resources:**
- `google_vpc_access_connector.main` — `/28` subnet in `europe-west2`
- Update every Cloud Run service to set `vpc_access { connector = ..., egress = "PRIVATE_RANGES_ONLY" }`

**Delivered notes (2026-05-29):** New `modules/vpc_connector` declares `padel-connector-<env>` (`default` network, `e2-micro`, min/max 2/3). Staging applied on `10.8.0.0/28`; all four Cloud Run services attached with `egress = "PRIVATE_RANGES_ONLY"`. Prod wired in `prod/main.tf` on `10.9.0.0/28`, not yet applied (no prod project). The Cloud SQL private IP migration this unblocks is still outstanding — tracked as a follow-on in `INFRASTRUCTURE.md` Known Gaps.

### 2.2 Global HTTPS LB + Cloud Armor origin lockdown — moved to Production Go-Live Checklist

This task is **prod-only** — the public front door only exists once a production GCP project does, and staging stays on the plain `run.app` URL. It has been relocated to the [Production Go-Live Checklist](#production-go-live-checklist) as **P1**, where the full design, Terraform sketch, and validation strategy now live. Section numbers 2.3–2.8 below are unchanged.

### 2.3 Monitoring & alerting

**Why:** No alerts today. Before production, the on-call (Ken) needs paging on the basics.

**Resources:**
- `google_monitoring_notification_channel.email_oncall`
- Alert policies for:
  - `padel-api` 5xx rate >1% over 5 min
  - Cloud SQL CPU >80% for 10 min
  - Cloud SQL storage >80%
  - Pub/Sub subscription oldest unacked message age >5 min (per subscription)
  - DLQ topic message count >0 (any DLQ)
  - Cloud Run service revision failed deploy

### 2.4 AI provider access

**Why:** Stage 3 needs Vertex AI and Anthropic from day one.

**Resources:**
- New secret: `anthropic-api-key`
- New secret: `firebase-fcm-credentials` (or migrate notification worker to Firebase Admin SDK with runtime SA — decide before this stage starts)
- IAM: runtime SA gets `roles/aiplatform.user` (Vertex AI access)

### 2.5 Scheduled-job invocation pattern (Cloud Scheduler → Pub/Sub)

**Standard pattern for all scheduled work.** Cloud Scheduler **publishes an event to a Pub/Sub topic**; a **push subscription** delivers it to a handler (a worker, or a `/pubsub` receiver on `padel-api` that dispatches by `event_type`). This is the pattern the analytics jobs (`analytics-snapshot-daily`, `analytics-refresh-daily`) already use, and it is the standard every new scheduled job in §2.6/§2.7 must follow. A direct Cloud Scheduler → `padel-api` HTTP target is **not** an approved pattern.

**Why Pub/Sub and not a direct HTTP call:**
- **No static secret.** Scheduler authenticates to Pub/Sub as the Google-managed Cloud Scheduler service agent (`service-<num>@gcp-sa-cloudscheduler.iam.gserviceaccount.com`), granted `roles/pubsub.publisher` per topic. Push delivery to the handler uses an OIDC token Pub/Sub mints automatically. Nothing lands in Terraform state or on the job config — unlike the `X-Platform-Key` header approach, which copies a long-lived shared secret into both.
- **Survives the prod ingress lockdown (P1).** Once `padel-api` ingress is flipped to `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER`, a direct Cloud Scheduler HTTP target is rejected — Scheduler is an external caller, neither an internal source nor Cloudflare. **Pub/Sub push is an internal ingress source**, so it still reaches the handler. This is the load-bearing reason the pattern must be Pub/Sub.
- **Retries + DLQ for free** from the subscription, decoupled from the schedule.

**Resources (per job):**
- One Pub/Sub topic (or a shared `scheduled-tasks` topic discriminated by `event_type`, as `analytics-events` does).
- `google_pubsub_topic_iam_member` granting the Cloud Scheduler service agent `roles/pubsub.publisher` on that topic.
- A push subscription → the handler, with OIDC push auth (the push SA holds `roles/run.invoker` on the handler service).
- `google_cloud_scheduler_job` with a `pubsub_target` (never `http_target`).

**Superseded:** the original design here was a dedicated user-managed `cloud-scheduler@PROJECT` SA with per-job `run.invoker` for direct OIDC HTTP calls to `padel-api`. That SA was never created and is **not needed** for triggering work in a running service — the managed service agent + Pub/Sub covers it, and the dedicated-SA/HTTP path would not survive the P1 lockdown anyway. The one **already-built** job still on the old `X-Platform-Key` HTTP pattern (`release-expired-holds`) is tracked for refactor as **P2** in the Production Go-Live Checklist.

**Scope — this is for triggering a *running* service** (`padel-api` or a worker). Cloud Run **Jobs** (§3.4) are a different mechanism: invoked by Scheduler → OIDC → the job's `:run` Admin API endpoint, which *does* use a small dedicated invoker SA with `roles/run.invoker` **on the job**. That path targets the Run Admin API, not `padel-api`, so it is unaffected by the P1 ingress lockdown and is sanctioned as-is. The anti-pattern being retired is specifically Scheduler → HTTP → `padel-api` with a static key.

### 2.6 Wallet settlement cron

**Why:** `POST /payments/wallet/settle-debts` transfers accumulated `WalletClubDebt` rows to each club's Stripe Connect account. Today it is admin-triggered only — clubs do not receive their wallet-paid bookings until someone remembers to hit the endpoint. Production must run this automatically on a schedule. Without it, a club's wallet receivables grow indefinitely and we have a quiet liability on the platform balance.

**Resources** (Cloud Scheduler → Pub/Sub pattern, per §2.5):
- `google_cloud_scheduler_job.wallet_settle_debts` with a **`pubsub_target`** — publishes `{"event_type": "wallet.settle"}` to the settlement topic on `0 2 * * *` (daily 02:00 UTC, low-traffic window).
- A push subscription delivers the event to a handler that runs the settlement logic (the `/payments/wallet/settle-debts` work). The handler resolves the platform-admin scope **server-side** — no `X-Tenant-ID` header is supplied by the scheduler; settlement is platform-wide.
- Cloud Scheduler service agent gets `roles/pubsub.publisher` on the topic; the push SA gets `roles/run.invoker` on the handler. No static `X-Platform-Key`, no dedicated `cloud-scheduler@` SA.
- Delivery retries/DLQ come from the subscription (replacing the old per-job `retry_count`/`max_backoff`).

**Operational notes:**
- Daily cadence is the floor. If a club asks for faster settlement, lower to hourly — the underlying Stripe `Transfer.create` is already idempotency-keyed per debt set, so re-running is safe.
- Alert on failure via the subscription's DLQ (oldest-unacked / DLQ-message-count alert, like the other Pub/Sub paths) plus the Stage 2.3 Cloud Run 5xx policy on the handler.
- Until this lands, document a manual runbook step: ops admin calls `/wallet/settle-debts` at least weekly.

### 2.7 Additional Scheduled Jobs

Production-readiness cron jobs beyond wallet settlement. All follow the standard **Cloud Scheduler → Pub/Sub → push** pattern from §2.5 — **not** a direct HTTP target, which does not survive the prod ingress lockdown (P1). Each job publishes an `event_type` to a topic; a push subscription delivers it to its handler. `wallet-settle-debts` is listed here for completeness; its full resource spec is in §2.6.

| Job | Schedule | Purpose | Status |
|---|---|---|---|
| `wallet-settle-debts` | `0 2 * * *` (daily 02:00 UTC) | Settle accumulated `wallet_club_debts` to club Stripe Connect accounts (see §2.6 for full resource spec) | ❌ Not implemented |
| `membership-renewal-job` | `0 1 * * *` (daily 01:00 UTC) | Renew active subscriptions at `current_period_end`; reset membership credits; flag lapsed subscriptions | ❌ Not implemented |
| `announcement-expiry-job` | `0 3 * * *` (daily 03:00 UTC) | Soft-hide announcements where `expires_at <= NOW()` | ❌ Not implemented |
| `promo-code-expiry-job` | `0 3 * * *` (daily 03:00 UTC) | Disable promo codes where `valid_until <= NOW()` | ❌ Not implemented |
| `payment-retry-job` | `*/15 * * * *` | Retry failed payments where `next_retry_at <= NOW()` and `retry_count < max`; publishes to `payment-events` on success | ❌ Not implemented |
| `waitlist-offer-expiry-job` | `*/5 * * * *` | Expire slot offers where `offer_expires_at <= NOW()`; update `waitlist_entries.status = 'expired'`; publish expiry notifications | ❌ Not implemented |

### 2.8 Inbound Webhooks (SendGrid)

**Why:** SendGrid pushes delivery events (delivered, opened, clicked, bounced, unsubscribed, spam report) to a webhook endpoint. Without this endpoint the `message_deliveries` status tracking is permanently stuck at `sent` — no opened/clicked/bounced/converted data, no campaign analytics, no re-engagement logic. This is the delivery-side equivalent of the Stripe webhook and is equally load-bearing for production.

**Resources:**
- New endpoint on `padel-api`: `POST /api/v1/sendgrid/webhook`
- New secret: `sendgrid-webhook-secret` (SendGrid signs payloads with an ECDSA key — different from the API key)
- No new GCP infrastructure needed — `padel-api` receives the events and publishes to `notification-events` for the notification worker to update `message_deliveries` rows

| SendGrid event | Action | `message_deliveries.status` transition | Status |
|---|---|---|---|
| `delivered` | Record delivery timestamp | `sent` → `delivered` | ❌ Not implemented |
| `open` | Record open timestamp | `delivered` → `opened` | ❌ Not implemented |
| `click` | Record click timestamp + URL | `opened` → `clicked` | ❌ Not implemented |
| `bounce` | Record bounce reason | any → `bounced` | ❌ Not implemented |
| `unsubscribe` | Set player comms opt-out flag | any → `unsubscribed` | ❌ Not implemented |
| `spamreport` | Set player comms opt-out flag; alert staff | any → `unsubscribed` | ❌ Not implemented |

**Security note:** verify the `X-Twilio-Email-Event-Webhook-Signature` header using the SendGrid ECDSA public key before processing any event.

### Stage 2 deliverables checklist

- [x] VPC connector live and attached to all Cloud Run services _(delivered 2026-05-29: `padel-connector-staging`, `10.8.0.0/28`; all four services on `PRIVATE_RANGES_ONLY`)_
- [ ] At minimum 6 monitoring alert policies firing to a real notification channel
- [ ] `anthropic-api-key` secret created, value set, runtime SA has `aiplatform.user`
- [ ] Scheduled-job Pub/Sub topic(s) + push subscriptions live; Cloud Scheduler service agent has `pubsub.publisher` (per §2.5)
- [ ] Wallet settlement cron live via Scheduler → Pub/Sub → settlement handler, daily
- [ ] SendGrid webhook endpoint live, signature verification passing, `message_deliveries` rows updating (§2.8)
- [ ] `sendgrid-webhook-secret` secret created and value set

---

## Stage 3 — AI Phase 1 (Sprint 7–8)

> **Goal:** ship gap detection, dynamic pricing, revenue forecasting, and AI insights dashboard. This is where Terraform expansion gets significant.

### 3.1 New Pub/Sub topics

| Topic | DLQ required | Published by | Consumed by |
|---|---|---|---|
| `utilisation-snapshots` | yes | `utilisation-snapshot-job` | `padel-gap-detection-worker` |
| `gap-detected` | yes | `gap_detection_service` (in `padel-api`) | `padel-campaign-worker`, `padel-notification-worker` |

Add both to the `pubsub_topics` local in `pubsub.tf`. Each DLQ follows the Stage 1.6 pattern.

### 3.2 New Cloud Run worker services

| Service | Image | Subscribes to |
|---|---|---|
| `padel-gap-detection-worker` | `padel-worker` | `utilisation-snapshots`, `booking-cancelled` (Stage 1 topic — cancellations re-trigger gap evaluation) |
| `padel-campaign-worker` | `padel-worker` | `gap-detected` (more topics added in Stage 4) |

Both follow the existing worker pattern: `google_cloud_run_v2_service` + push subscription + `pubsub.serviceAgent` invoker binding + DLQ.

### 3.3 Notification worker fan-in

**Why:** Notification worker now consumes `gap-detected` in addition to `notification-events`.

**Resources:**
- New `google_pubsub_subscription.notification_worker_gap_detected` pointing at the same `padel-notification-worker` service URI

### 3.4 Cloud Run Jobs (scheduled)

| Job | Schedule | Purpose | Status |
|---|---|---|---|
| `utilisation-snapshot-job` | Hourly | Compute snapshots, publish to `utilisation-snapshots` | ❌ Not implemented |
| `revenue-forecast-job` | Daily | Vertex AI revenue forecast | ❌ Not implemented |
| `dashboard-insights-job` | Daily | Anthropic-generated club insight summaries | ❌ Not implemented |
| `materialized-view-refresh-job-hourly` | Hourly | `REFRESH MATERIALIZED VIEW CONCURRENTLY` for hourly views | ❌ Not implemented |
| `materialized-view-refresh-job-nightly` | Nightly | Same, for nightly views | ❌ Not implemented |
| `ai-inference-log-partition-job` | Monthly (25th) | Create next month's partition on `ai_inference_log` | ❌ Not implemented |
| `ai-inference-log-archive-job` | Nightly | Archive payloads >90 days to `padel-ai-archive-staging` | ❌ Not implemented |
| `worker-event-dedup-cleanup-job` | Daily | `DELETE FROM worker_event_dedup WHERE processed_at < now() - interval '24 hours'` (see §3.6) | ❌ Not implemented |
| `weather-alert-check-job` | Hourly | Fetch weather for clubs with `weather_alerts_enabled`; dispatch alerts if rain/extreme conditions predicted | ❌ Not implemented |
| `gap-offer-expiry-job` | `*/5 * * * *` | Mark `gap_detection_events.status = 'expired'` where `offer_expires_at <= NOW()` | ❌ Not implemented |
| `campaign-send-job` | Dynamic (per `campaigns.scheduled_at`) | Fire `scheduled` campaigns; Anthropic draft generation; dispatch via SendGrid/Firebase | ❌ Not implemented |
| `campaign-expiry-job` | Daily | Mark campaigns `completed` where `sent_at` is set and send window has passed | ❌ Not implemented |

Each is `google_cloud_run_v2_job` + `google_cloud_scheduler_job` (with `http_target` invoking the job's `:run` Admin API endpoint) + `roles/run.invoker` granted on the job to a **dedicated Cloud Scheduler invoker SA introduced with this stage**. This is the sanctioned Cloud Run *Jobs* path (§2.5 "Scope"): it targets the Run Admin API, not `padel-api`, so it is unaffected by the P1 ingress lockdown — distinct from the retired Scheduler → HTTP → `padel-api` pattern.

### 3.5 IAM additions

- Runtime SA: `roles/aiplatform.user` (already added in Stage 2.4)
- Runtime SA: `roles/storage.objectAdmin` on `padel-ai-archive-staging` (already added in Stage 1.2)
- No new bindings unique to Stage 3 if Stages 1–2 were delivered

### 3.6 Worker idempotency table

**Why:** Pub/Sub guarantees at-least-once delivery, so the same `gap-detected` event can arrive twice. Without deduplication, that means two Anthropic API calls and two notification sends per duplicate. AI workers must be idempotent before they ship.

**Design decision (2026-04-29):** use a Postgres table rather than Memorystore (Redis). Rationale:
- Single-purpose dedup cache does not justify a separate managed service (~£35–40/month for Memorystore Basic in `europe-west2`)
- Workers already have a Postgres connection — no new dependency, no VPC connector requirement driven by this need alone
- A Postgres table is durable across worker restarts (Redis Basic tier is not)
- Throughput is well within Postgres capacity at MVP scale (low thousands of events/day)
- If volume ever exceeds what Postgres can handle, the table is trivially swapped for Memorystore behind a `dedup_store` interface

**Schema (defined via Alembic, not Terraform):**

```sql
CREATE TABLE worker_event_dedup (
    event_id        UUID PRIMARY KEY,
    worker_name     TEXT NOT NULL,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_worker_event_dedup_processed_at
    ON worker_event_dedup (processed_at);
```

**Worker pattern:**
1. On message receive, `INSERT ... ON CONFLICT (event_id) DO NOTHING RETURNING event_id`
2. If the insert returned a row → process the event
3. If the insert returned no row → ack and skip (already processed)
4. Distinct from `ai_inference_log.input_hash` deduplication, which catches identical-input calls regardless of trigger path (per `ANALYTICS_AND_AI.md` §13)

**Cleanup:**
- New scheduled job `worker-event-dedup-cleanup-job` (daily) — `DELETE FROM worker_event_dedup WHERE processed_at < now() - interval '24 hours'`
- Already included in the Stage 3.4 jobs table (12 jobs total)

**Resources:** none in Terraform. The table is an Alembic migration; the cleanup job follows the Stage 3.4 pattern. Listed here only because the design choice is load-bearing for AI worker correctness.

### Stage 3 deliverables checklist

- [ ] Two new topics + DLQs live
- [ ] Two new worker services deployed and consuming
- [ ] Notification worker subscribed to `gap-detected`
- [ ] 12 scheduled jobs running on their cadences (see §3.4 table)
- [ ] `worker_event_dedup` table created and used by every AI worker
- [ ] First successful `ai_inference_log` write observed in production

---

## Stage 4 — AI Phase 2 (Sprint 9–10)

> **Goal:** ship churn prediction, player segmentation, matchmaking, cancellation prediction, equipment/maintenance/staffing recommendations. Mechanical extension of Stage 3.

### 4.1 New Pub/Sub topics

| Topic | DLQ | Published by | Consumed by |
|---|---|---|---|
| `churn-scores-updated` | yes | `padel-churn-worker` | `padel-campaign-worker` |
| `segment-assigned` | yes | `padel-segmentation-worker` | `padel-campaign-worker` |
| `recommendation-created` | yes | `ai_recommendation_service` | `padel-notification-worker` |
| `campaign-triggered` | yes | `campaign_service` | `padel-notification-worker` |
| `match-result-recorded` | yes | `padel-api` (staff score entry) | new `padel-skill-worker` (ELO update + training recommendation generation) |

### 4.2 New Cloud Run worker services

| Service | Image | Subscribes to |
|---|---|---|
| `padel-churn-worker` | `padel-worker` | none — scheduled (no push subscription) |
| `padel-segmentation-worker` | `padel-worker` | none — DB-driven (no push subscription) |

Note: these two have no push subscription. They are deployed as Cloud Run services because they hold long-running batch processes triggered by scheduled invocation; if a future review prefers Cloud Run Jobs for them, that is also valid. The architecture treats them as services for parity with other workers.

### 4.3 Campaign worker fan-in

Update `padel-campaign-worker` to subscribe to three additional topics:
- `churn-scores-updated`
- `segment-assigned`
- (`gap-detected` already subscribed in Stage 3)

### 4.4 Notification worker fan-in

Add subscriptions for `recommendation-created` and `campaign-triggered` pointing at `padel-notification-worker`.

### 4.5 Cloud Run Jobs (scheduled)

| Job | Schedule | Purpose | Status |
|---|---|---|---|
| `cancellation-prediction-job` | Every 6h | Score upcoming bookings within 24h; write `cancellation_predictions` | ❌ Not implemented |
| `churn-scoring-job` | Daily | Score every active player; write `player_engagement_scores` | ❌ Not implemented |
| `embedding-refresh-job` | Nightly | Refresh `player_profiles.embedding` (pgvector) from booking history | ❌ Not implemented |
| `equipment-prediction-job` | Weekly | Score equipment replacement needs; write `equipment_replacement_predictions` | ❌ Not implemented |
| `maintenance-scheduling-job` | Weekly | Generate court/equipment maintenance recommendations | ❌ Not implemented |
| `staffing-recommendation-job` | Weekly | Generate staffing recommendations from demand forecasts | ❌ Not implemented |
| `wallet-auto-topup-job` | `*/30 * * * *` | Trigger Stripe charge for wallets where `balance <= auto_topup_threshold` | ❌ Not implemented |
| `skill-rating-update-job` | Nightly batch | Compute ELO deltas from `match_results`; update `skill_level`; write `skill_level_history` | ❌ Not implemented |
| `cancellation-prompts-job` | Daily | Identify high-risk bookings from `cancellation_predictions`; prompt players to confirm or release; write `player_prompted_at` | ❌ Not implemented |
| `tournament-status-advance-job` | Daily | Auto-advance tournament status at registration deadline, start date, and end date | ❌ Not implemented |
| `support-ticket-sla-job` | Hourly | Escalate support tickets nearing SLA breach; flag for staff review | ❌ Not implemented |
| `maintenance-reminders-job` | Daily | Notify staff of upcoming `equipment_maintenance_log` entries | ❌ Not implemented |
| `equipment-reorder-check-job` | Weekly | Flag inventory where `quantity_available <= reorder_threshold`; create AI purchase recommendations | ❌ Not implemented |

Same pattern as Stage 3.4.

### Stage 4 deliverables checklist

- [ ] Five new topics + DLQs live (including `match-result-recorded`)
- [ ] Three new worker services deployed (churn, segmentation, skill)
- [ ] Campaign and notification workers consuming all assigned topics
- [ ] `padel-skill-worker` consuming `match-result-recorded`, writing ELO deltas and training recommendations
- [ ] 13 new scheduled jobs running (see §4.5 table)

---

## Stage 5 — AI Phase 3 (Sprint 11–12)

> **Goal:** conversational booking, AI support chatbot, CV court analysis, competitor pricing intelligence. This phase mostly reuses existing infrastructure.

### 5.1 New Cloud Run Job

| Job | Schedule | Purpose |
|---|---|---|
| `competitor-scrape-job` | weekly | Scrape competitor prices, write `competitor_price_snapshots` |

### 5.2 Notes on what does *not* need new infra

- **Conversational booking** — uses Anthropic API (existing) + pgvector (Stage 1) + `padel-api` (existing)
- **AI support chatbot** — same as above
- **CV court analysis** — uses Vertex AI (existing) + Cloud Storage (Stage 1)
- **Synchronous AI calls** generally — go through `padel-api`, no new service needed

### 5.3 IAM review

By this stage, runtime SA permissions should be reviewed against principle of least privilege. Anything broadly granted in earlier stages that isn't needed should be tightened. Add an audit-log-based review here.

### Stage 5 deliverables checklist

- [ ] Competitor scrape job live and writing snapshots
- [ ] Phase 3 features all reachable via existing infra (no Terraform-blocked features)
- [ ] IAM least-privilege review completed and recorded

---

## Stage 6 — Cross-Tenant Analytics (Sprint 13+)

> **Goal:** introduce BigQuery only when there is a real reporting query the four-tier read-path cannot answer. Until that exists, do not build this stage.

### 6.1 BigQuery dataset

**Resources:**
- `google_bigquery_dataset.platform_analytics` — `EU` location, default table expiration off
- `google_bigquery_table` for streamed event tables (one per Pub/Sub topic mirrored)

### 6.2 Pub/Sub → BigQuery subscriptions

For each topic that should mirror to BigQuery (start narrow — `booking-events`, `payment-events`, `ai_inference_log`-derived topic):
- `google_pubsub_subscription` with `bigquery_config` block
- IAM: BigQuery service agent gets `roles/bigquery.dataEditor` on the dataset

### 6.3 Looker Studio / dashboards

Out of Terraform scope — connected to BigQuery via console.

### Stage 6 deliverables checklist

- [ ] At least one cross-tenant query that previously could not be answered, now answered
- [ ] BigQuery dataset live, three Pub/Sub mirrors streaming
- [ ] First analytics dashboard wired to BigQuery

---

## Production Go-Live Checklist

> **Status: not started — no production GCP project exists yet.** This section is the running gate for everything that must be true *before* SmashBook serves real customers on a production GCP project, and the home for **prod-only** tasks that have no staging equivalent. It is **built up over time**: as each readiness item is identified it gets a row here, and go-live is blocked until every box is checked. Items are promoted here out of the Stage roadmap above when they turn out to be prod-only — they aren't really "delivered" until the prod cutover, so tracking them as Stage deliverables would be misleading.

**Hard prerequisite for everything below:** a production GCP project, provisioned and with the `prod/` Terraform applied. The `prod/` scaffold exists (Stage 1.5) but points at no project yet — nothing in this checklist can be applied until that lands.

### Summary checklist

- [ ] Production GCP project created and `prod/` Terraform applied (Stage 1.5)
- [ ] **P1 — Global HTTPS LB + Cloud Armor origin lockdown behind Cloudflare** (see below)
- [ ] **P2 — Refactor `release-expired-holds` off the static-key HTTP target onto Scheduler → Pub/Sub** (see below; must land *before* P1's ingress flip)
- _(further go-live items added here over time — secrets cutover, DNS, data seeding, smoke tests, rollback plan, etc.)_

---

### P1 — Global HTTPS load balancer + Cloud Armor origin lockdown (behind Cloudflare)

**Why:** `padel-api` is currently exposed directly on its public `*.run.app` URL to `allUsers` (Stage 0). `smashbook.app` already sits behind **Cloudflare** — DNS, TLS termination, WAF, and rate-limiting all run at the Cloudflare edge. That edge protection is worthless as long as the raw `run.app` URL still answers the public internet: anyone who learns it bypasses every Cloudflare rule. The job here is therefore **not** to rebuild the WAF in GCP — it is to put a global external HTTPS load balancer in front of Cloud Run and use **Cloud Armor to lock the origin to Cloudflare's published IP ranges**, then flip Cloud Run ingress so it only accepts traffic from the LB. The OWASP/rate-limit WAF stays where it already is (Cloudflare); Cloud Armor here is an allowlist + a backstop rate-limit, not the primary filter.

**Topology (Option B):**
```
client → Cloudflare edge (DNS, TLS, WAF, rate-limit, "Full (strict)")
       → GCP global external HTTPS LB (:443, Origin CA cert)
       → Cloud Armor security policy (allow Cloudflare IPs only, else 403)
       → serverless NEG → padel-api  (ingress = internal-and-cloud-load-balancing)
```

**Resources:**
- `google_compute_global_address.api_lb` — anycast LB IP.
- `google_compute_region_network_endpoint_group.api` — `SERVERLESS` NEG targeting the `padel-api` Cloud Run service (the adapter that lets a global LB front Cloud Run).
- `google_compute_backend_service.api` (`load_balancing_scheme = EXTERNAL_MANAGED`) → the serverless NEG, with `security_policy` attached.
- `google_compute_url_map.api`, `google_compute_target_https_proxy.api`, `google_compute_global_forwarding_rule.api_https` — the L7 HTTPS front door.
- **TLS cert — not Google-managed.** With Cloudflare proxying (orange-cloud), `smashbook.app` resolves to Cloudflare, so a Google `managed_ssl_certificate` cannot complete domain-validation against the LB. Instead upload a **Cloudflare Origin CA certificate** as a `google_compute_ssl_certificate` on the LB and set the Cloudflare SSL/TLS mode to **Full (strict)**. (Alternative if you want Google-managed renewal: a managed cert with **DNS authorization** — more moving parts; Origin CA is the path of least resistance.)
- `google_compute_security_policy.api` (Cloud Armor): **default `deny(403)`**, an `allow` rule for Cloudflare's [published IPv4/IPv6 ranges](https://www.cloudflare.com/ips/), plus a backstop `rate_based_ban` keyed on the `CF-Connecting-IP` header (Cloudflare's true-client-IP) as defense-in-depth. No OWASP preconfigured rules here — they live at Cloudflare.
- **Cloud Run ingress flip:** set `padel-api` `ingress = INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER` once the LB is healthy. Keep the `allUsers` `run.invoker` binding — ingress governs the *network path* (LB only), IAM still governs auth; for a public site the invoker stays public while the network path is locked. This step is what actually closes the bypass.
- **DNS:** the proxied (orange-cloud) `A`/`AAAA` record for `smashbook.app` (and/or `api.smashbook.app`) lives in **Cloudflare**, pointing at the LB IP — not "at the registrar." Reuse the existing `fe-infra/terraform/modules/cloudflare_dns` module pattern (`proxied = true`).

**Terraform sketch** — new `be-infra/terraform/modules/api_lb`, wired from `prod/main.tf` (prod-only; the LB's fixed forwarding-rule cost isn't worth it in steady-state staging):

```hcl
# modules/api_lb/main.tf
# Cloudflare → global external HTTPS LB → serverless NEG → padel-api.
# Cloud Armor locks the origin to Cloudflare edge IPs so the CF WAF can't be
# bypassed via the raw run.app URL.

resource "google_compute_region_network_endpoint_group" "api" {
  name                  = "padel-api-neg-${var.environment}"
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  cloud_run { service = var.cloud_run_service_name } # "padel-api"
}

resource "google_compute_security_policy" "api" {
  name = "padel-api-armor-${var.environment}"

  # Default: deny everything not explicitly allowed below.
  rule {
    action   = "deny(403)"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config { src_ip_ranges = ["*"] }
    }
    description = "default deny"
  }

  # Allow only Cloudflare edge ranges (var refreshed from cloudflare.com/ips).
  rule {
    action   = "allow"
    priority = 1000
    match {
      versioned_expr = "SRC_IPS_V1"
      config { src_ip_ranges = var.cloudflare_ip_ranges }
    }
    description = "allow Cloudflare edge"
  }

  # Backstop per-true-client-IP rate limit (Cloudflare is the primary limiter).
  rule {
    action   = "rate_based_ban"
    priority = 900
    match {
      versioned_expr = "SRC_IPS_V1"
      config { src_ip_ranges = var.cloudflare_ip_ranges }
    }
    rate_limit_options {
      conform_action      = "allow"
      exceed_action       = "deny(429)"
      enforce_on_key      = "HTTP_HEADER"
      enforce_on_key_name = "CF-Connecting-IP"
      rate_limit_threshold {
        count        = 600
        interval_sec = 60
      }
    }
    description = "backstop rate limit on true client IP"
  }
}

resource "google_compute_backend_service" "api" {
  name                  = "padel-api-backend-${var.environment}"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  protocol              = "HTTPS"
  security_policy       = google_compute_security_policy.api.id
  backend { group = google_compute_region_network_endpoint_group.api.id }
}

# Cloudflare Origin CA cert (PEM + key passed in as sensitive vars / from a secret).
resource "google_compute_ssl_certificate" "api" {
  name        = "padel-api-origin-${var.environment}"
  certificate = var.origin_cert_pem
  private_key = var.origin_key_pem
}

resource "google_compute_url_map" "api" {
  name            = "padel-api-urlmap-${var.environment}"
  default_service = google_compute_backend_service.api.id
}

resource "google_compute_target_https_proxy" "api" {
  name             = "padel-api-https-proxy-${var.environment}"
  url_map          = google_compute_url_map.api.id
  ssl_certificates = [google_compute_ssl_certificate.api.id]
}

resource "google_compute_global_address" "api_lb" {
  name = "padel-api-lb-ip-${var.environment}"
}

resource "google_compute_global_forwarding_rule" "api_https" {
  name                  = "padel-api-fr-${var.environment}"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.api_lb.id
  port_range            = "443"
  target                = google_compute_target_https_proxy.api.id
}

output "lb_ip" { value = google_compute_global_address.api_lb.address }
```

Then in `prod/main.tf`: pass `module.api_lb.lb_ip` into a `cloudflare_dns`-style record (`proxied = true`), and change the `padel-api` service `ingress` to `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER`.

**Sequencing gotchas:**
- Bring the LB up and confirm it serves through Cloudflare **before** flipping Cloud Run ingress to LB-only — otherwise you cut off the only working path mid-apply.
- The Origin CA cert PEM + key are secrets; source them from Secret Manager or sensitive vars, never commit them.
- `cloudflare_ip_ranges` drifts (rarely). Keep it a variable you can refresh, or populate it from an `http` data source against `https://www.cloudflare.com/ips-v4`/`-v6` so a re-apply picks up changes.

**Validation strategy — rehearse in staging, then tear down:** this is prod-only steady-state, but its three first-time failure modes are environment-agnostic and nasty to debug live: (1) the Cloudflare Origin CA + **Full (strict)** handshake, (2) Cloud Armor IP-allowlist correctness (get it wrong and you 403 *all* traffic), and (3) the ingress-flip ordering (flip before the LB serves and you sever the only working path). De-risk by standing the module up **once** in staging behind a temporary `staging-api.smashbook.app` + its own Origin CA cert, validating all three end-to-end, then `terraform destroy` just that module. Do **not** leave it as permanent staging infra.

**P1 checklist:**
- [ ] Global HTTPS LB + serverless NEG live for `padel-api`, fronted by Cloudflare (Origin CA cert, Full (strict))
- [ ] Cloud Armor policy locks origin to Cloudflare IP ranges (default deny) + backstop rate limit
- [ ] `padel-api` ingress flipped to `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER` (run.app no longer publicly reachable)
- [ ] Proxied DNS record for `smashbook.app`/`api.smashbook.app` points at LB IP in Cloudflare
- [ ] Validated end-to-end in staging (temporary subdomain) and torn down before prod apply

---

### P2 — Refactor `release-expired-holds` off the static-key HTTP target

**Why:** `release-expired-holds` is the one **already-built** Cloud Scheduler job still on the legacy pattern — a direct HTTP target to `padel-api` carrying the platform god-key in an `X-Platform-Key` header ([scheduler/main.tf:41-49](be-infra/terraform/modules/scheduler/main.tf#L41-L49)). It has two problems the rest of the scheduled work doesn't:
- **Static shared secret** — the high-privilege `PLATFORM_API_KEY` is copied into Terraform state *and* onto the job config, with no rotation/expiry/per-caller identity.
- **Breaks at the P1 cutover** — a direct Scheduler HTTP call is an external caller; once `padel-api` ingress is locked to internal + LB and Cloud Armor to Cloudflare IPs, it is rejected. So this job silently stops firing the moment P1 lands unless it is reworked first.

The two analytics jobs (`analytics-snapshot-daily`, `analytics-refresh-daily`) already use Scheduler → Pub/Sub and need **no** change. This is the only refactor.

**What to do** (apply the §2.5 standard):
- Change the job's `http_target` to a **`pubsub_target`** publishing `{"event_type": "release_expired_holds"}` to a topic (a dedicated topic, or a shared `scheduled-tasks` topic).
- Add a push subscription → the handler (a `/pubsub` receiver that runs the existing release-expired-holds logic), authenticated by OIDC push.
- Grant the Cloud Scheduler service agent `roles/pubsub.publisher` on the topic; grant the push SA `roles/run.invoker` on the handler.
- Drop the `X-Platform-Key` header, the `platform_api_key` data source, and the secret-in-state path from the scheduler module.

**Ordering — this gates P1.** Do P2 **before** flipping `padel-api` ingress in P1. If the ingress is locked while this job still depends on the public `run.app` HTTP path, the court-hold expiry sweep stops running (held slots never release). Sequence: ship P2 → confirm the sweep fires via Pub/Sub → then do the P1 ingress flip.

**P2 checklist:**
- [ ] `release-expired-holds` job converted to `pubsub_target` (no `http_target`)
- [ ] Push subscription → handler live with OIDC auth; sweep confirmed firing end-to-end
- [ ] `X-Platform-Key` header + `platform_api_key` data source + secret-in-state removed from the scheduler module
- [ ] Verified the sweep still fires *after* the P1 ingress flip (run.app no longer public)

---

## Cross-Cutting Conventions

These apply to every stage. Generated Terraform should follow them by default.

### Resource naming

- All resource names are `padel-<scope>-<env>` where `<env>` is `staging` or `production`
- Service accounts use the naming pattern `padel-<role>-<env>@PROJECT.iam.gserviceaccount.com` going forward (existing default compute SA grandfathered in)
- Pub/Sub topic names do not carry `<env>` because they live in their own per-project namespace

### IAM conventions

- Project-level roles only when truly project-wide (e.g. `aiplatform.user`)
- Resource-level bindings (`google_<resource>_iam_member`) preferred everywhere else
- Service accounts are workload-specific — do not reuse the runtime SA for CI/CD or for Cloud Scheduler

### Secrets

- Terraform manages the *resource* (`google_secret_manager_secret`); values are set via `gcloud` and never committed
- Every new secret added in any stage gets a corresponding IAM binding granting the runtime SA `roles/secretmanager.secretAccessor`
- Adopt a `--secret-name=` naming convention: `padel-<purpose>` for SmashBook-owned, `<vendor>-<purpose>` for third-party (e.g. `stripe-secret-key`, `anthropic-api-key`)

### Lifecycle ignore_changes

- Cloud Run image tags: `lifecycle { ignore_changes = [template[0].containers[0].image] }` — pipeline manages image, Terraform manages everything else
- Cloud SQL maintenance window: ignored — managed by GCP recommendation
- Annotations and labels added by GCP automation: ignored

### Pub/Sub conventions

- Every push subscription has a DLQ
- Every DLQ has Pub/Sub service agent publisher binding
- `max_delivery_attempts = 5` unless a specific worker needs different
- `ack_deadline_seconds = 600` for AI workers (long inference), `60` for standard workers

### Module structure

When the Terraform exceeds ~1500 lines or three teams are touching it, refactor into modules under `infra/terraform/modules/`:
- `cloud-run-service` (one parametrised module for all worker services)
- `cloud-run-job` (one for all scheduled jobs)
- `pubsub-topic-with-subscriber` (topic + subscription + DLQ in one)

Until then, flat files per concern (`cloud_run.tf`, `pubsub.tf`, etc.) are fine.

### Import strategy for adopted resources

Any resource that exists in GCP before its Terraform block is added must be imported via `import.sh` first. The existing `import.sh` is the template — extend it whenever a stage adopts pre-existing resources.

---

## Maintenance & Updates

This document is a living blueprint. Update it when any of the following happens:

1. **A stage is delivered.** Mark ✅ in the [Stage Status](#stage-status) table, set the delivered date, and move any items that were descoped or modified into a "Delivered notes" subsection on that stage. Do not delete the original entries — the diff is useful.
2. **A new feature is added that needs new infrastructure.** Add it to the appropriate stage. If it doesn't fit any existing stage, propose a new stage in the table, justify the placement, and update [Suggested Ordering](#suggested-ordering).
3. **An ADR or design doc changes the target architecture.** Reflect it here. The bullet "Cloud SQL one primary + one read replica" came from `ARCHITECTURE.md` §11; if §11 changes, this doc changes.
4. **GCP introduces or deprecates a service** that affects the design — e.g. if a managed service is replaced by something newer, update the affected stage and explain the swap in a note. The original Memorystore-vs-Postgres dedup decision (Stage 3.6) is an example of this pattern.

When Claude is asked to generate Terraform for a stage:

1. Read this file first, especially the target stage and [Cross-Cutting Conventions](#cross-cutting-conventions)
2. Read the existing Terraform in `infra/terraform/` to match style and naming
3. Read `ARCHITECTURE.md` and `ANALYTICS_AND_AI.md` only as needed to confirm a service's purpose
4. Generate one PR per stage where possible — splitting only if the stage exceeds ~600 lines of Terraform changes
5. Always update the import script if the stage adopts pre-existing resources
6. Always update this document's stage status table in the same PR

---

*SmashBook — Infrastructure Target State*
*Maintained alongside the codebase in `docs/INFRASTRUCTURE_TARGET_STATE.md`*
