_Last updated: 2026-05-16 00:00 UTC_

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
- `stripe-webhook-secret`
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

`payment-retry-job` and `waitlist-offer-expiry-job` were originally scoped to Stage 1 but have been moved to Stage 2 (§2.7) — they depend on the Cloud Scheduler SA and VPC connector from Stage 2, and deferring keeps Stage 1 focused on structural hardening.

| Job | Schedule | Purpose | Status |
|---|---|---|---|
| `db-migration` | CI/CD (not Cloud Scheduler) | `alembic upgrade head` before each Cloud Run revision receives traffic — wired into the GitHub Actions deploy pipeline | ✅ Implemented |

### 1.9 Additional Pub/Sub topic — `booking-cancelled`

**Why:** `booking-events` carries all booking lifecycle messages but cancellations need independent fan-out at MVP: the booking worker must release waitlist slots immediately when a booking is cancelled, and in Stage 3 the gap detection worker needs cancellations to re-evaluate court utilisation. Keeping these as a single message type in `booking-events` means the gap detection worker would have to subscribe to all booking traffic and filter — noisy and wasteful. A dedicated topic is cleaner.

**Design:** `padel-api` publishes to `booking-cancelled` at the point of cancellation (in addition to the existing `booking-events` publish). The booking worker subscribes to `booking-cancelled` for waitlist logic; the gap detection worker (Stage 3) adds a second subscription.

**Resources:**
- `google_pubsub_topic.booking_cancelled`
- `google_pubsub_topic.booking_cancelled_dlq`
- Push subscription for `padel-booking-worker` on `booking-cancelled`
- Dead-letter policy: max 5 attempts, same pattern as Stage 1.7

### 1.10 Inbound Webhooks (Stripe)

**Why:** Stripe pushes payment lifecycle events to a single endpoint on `padel-api`. The secret (`stripe-webhook-secret`) is already provisioned, but the endpoint behaviour for each event type is not explicitly tracked. Without this catalog it is easy to ship Stripe Connect and miss that `account.updated` and `payout.paid` need handlers.

**Infrastructure:** no new GCP resources — webhook receipt is handled inline by `padel-api`. The table below tracks handler implementation status per event type.

| Stripe event | Receiver endpoint | Action | Status |
|---|---|---|---|
| `payment_intent.succeeded` | `POST /api/v1/stripe/webhook` | Mark booking paid; publish to `payment-events` for confirmation flow | ✅ Implemented |
| `payment_intent.payment_failed` | same | Flag payment failed; notify staff; publish to `payment-events` | ✅ Implemented |
| `charge.dispute.created` | same | Set `payments.dispute_status = 'open'`; queue for manual review | ❌ Not implemented |
| `account.updated` | same | Sync `clubs.stripe_connect_status`; block bookings if account deactivated | ❌ Not implemented |
| `payout.paid` | same | Populate `payments.stripe_payout_id` for affected transfers | ✅ Implemented |

**Security note:** every handler must verify the `Stripe-Signature` header using `stripe-webhook-secret` before processing. Any unverified event must return 400 and be discarded.

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

### 2.1 Serverless VPC connector

**Why:** Required for Cloud SQL private IP migration (an upcoming hardening step) and any future use of internal-only services. Cheap to add now; expensive to retrofit once production traffic is live and Cloud Run services need to be revision-rolled to attach to it.

**Resources:**
- `google_vpc_access_connector.main` — `/28` subnet in `europe-west2`
- Update every Cloud Run service to set `vpc_access { connector = ..., egress = "PRIVATE_RANGES_ONLY" }`

### 2.2 Cloud Armor + global HTTPS load balancer

**Why:** `padel-api` is currently directly exposed via Cloud Run's public URL. Production needs a custom domain, managed certificate, and WAF.

**Resources:**
- `google_compute_global_address.api_lb`
- `google_compute_managed_ssl_certificate.api`
- `google_compute_backend_service.api` pointing at a `serverless_neg` for `padel-api`
- `google_compute_url_map.api`, `google_compute_target_https_proxy.api`, `google_compute_global_forwarding_rule.api_https`
- `google_compute_security_policy.api` with rate-limit + standard OWASP rules
- DNS: A record at the registrar pointing the custom domain at the LB IP (out-of-band)

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

### 2.5 Cloud Scheduler service account

**Why:** Stage 3 introduces multiple Cloud Run Jobs triggered by Cloud Scheduler. Set up the SA and base permissions now so each later stage just adds invoker bindings.

**Resources:**
- `google_service_account.cloud_scheduler` — `cloud-scheduler@PROJECT.iam.gserviceaccount.com`
- The SA gets `roles/run.invoker` granted per-job in later stages (not project-wide)

### 2.6 Wallet settlement cron

**Why:** `POST /payments/wallet/settle-debts` transfers accumulated `WalletClubDebt` rows to each club's Stripe Connect account. Today it is admin-triggered only — clubs do not receive their wallet-paid bookings until someone remembers to hit the endpoint. Production must run this automatically on a schedule. Without it, a club's wallet receivables grow indefinitely and we have a quiet liability on the platform balance.

**Resources:**
- `google_cloud_scheduler_job.wallet_settle_debts`
  - Schedule: `0 2 * * *` (daily 02:00 UTC — low-traffic window)
  - Target: HTTPS POST to `https://<padel-api-url>/api/v1/payments/wallet/settle-debts`
  - Auth: OIDC token, audience = padel-api URL, SA = `cloud-scheduler`
  - Headers: `X-Tenant-ID: <platform-admin-tenant>` (settlement is platform-wide, not tenant-scoped, but the admin user lives in a specific tenant)
  - Retry: `retry_count = 3`, `max_backoff_duration = 600s`
- The Cloud Scheduler SA needs `roles/run.invoker` on `padel-api`
- The endpoint stays admin-only; the scheduler authenticates as a service-account-backed admin user (or we add a separate `require_internal_scheduler` dependency)

**Operational notes:**
- Daily cadence is the floor. If a club asks for faster settlement, lower to hourly — the underlying Stripe `Transfer.create` is already idempotency-keyed per debt set, so re-running is safe.
- Alert on consecutive failures (the Stage 2.3 alert policy on Cloud Run 5xx will catch this, but consider adding a Cloud Scheduler-specific alert on `state = FAILED` for two consecutive runs).
- Until this lands, document a manual runbook step: ops admin calls `/wallet/settle-debts` at least weekly.

### 2.7 Additional Scheduled Jobs

Production-readiness cron jobs beyond wallet settlement. All follow the same Cloud Scheduler → OIDC → `padel-api` HTTP target pattern established in §2.6. `wallet-settle-debts` is listed here for completeness; its full resource spec is in §2.6.

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

- [ ] VPC connector live and attached to all Cloud Run services
- [ ] Custom domain + LB + Cloud Armor live for `padel-api`
- [ ] At minimum 6 monitoring alert policies firing to a real notification channel
- [ ] `anthropic-api-key` secret created, value set, runtime SA has `aiplatform.user`
- [ ] Cloud Scheduler SA exists
- [ ] Wallet settlement cron live, hitting `/payments/wallet/settle-debts` daily
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

Each is `google_cloud_run_v2_job` + `google_cloud_scheduler_job` (with `http_target` invoking the job's `:run` endpoint) + `roles/run.invoker` granted to the Cloud Scheduler SA on the job.

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
