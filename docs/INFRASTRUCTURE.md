_Last updated: 2026-06-04 00:00 UTC_

# SmashBook — Infrastructure Current State

> **What this file is:** A snapshot of what is actually deployed in GCP project `smashbook-488121`. It tracks the live state of every Cloud Run service, Cloud SQL instance, Pub/Sub topic, secret, IAM binding, and supporting resource. Update this file whenever Terraform changes are applied and verified.
>
> **What it is not:** A migration plan or blueprint. For the target state and the infrastructure backlog, see [`INFRASTRUCTURE_TARGET_STATE.md`](INFRASTRUCTURE_TARGET_STATE.md). The diff between the two files is the infrastructure backlog at any given time.
>
> **Source of truth:** The Terraform in `be-infra/terraform/`. When this doc diverges from Terraform, Terraform wins.

---

## Table of Contents

- [GCP Project](#gcp-project)
- [Terraform State](#terraform-state)
- [Cloud Run Services](#cloud-run-services)
- [Cloud Run Jobs](#cloud-run-jobs)
- [Networking — Serverless VPC Access](#networking--serverless-vpc-access)
- [Cloud SQL](#cloud-sql)
- [Pub/Sub](#pubsub)
- [Secret Manager](#secret-manager)
- [Cloud Storage](#cloud-storage)
- [IAM & Service Accounts](#iam--service-accounts)
- [Artifact Registry](#artifact-registry)
- [CI/CD Pipeline](#cicd-pipeline)
- [Known Gaps](#known-gaps)

---

## GCP Project

| Property | Value |
|---|---|
| Project ID | `smashbook-488121` |
| Region | `europe-west2` (London) |
| Zone (Cloud SQL) | `europe-west2-a` |
| Environments deployed | `staging` only — no production environment yet |

---

## Terraform State

| Property | Value |
|---|---|
| Backend | GCS — `gs://tf-state-smashbook-488121-backend` |
| State prefix | `staging` |
| Terraform version | `>= 1.7` |
| Google provider | `~> 5.0` (locked at `5.45.2` in `.terraform.lock.hcl`) |
| Terraform layout | Module-based — `be-infra/terraform/staging/` (live) and `be-infra/terraform/prod/` (scaffold delivered 2026-05-10 — prod-tuned settings wired, no GCP project yet; replace `smashbook-prod-REPLACE_ME` once the project is created) call shared modules in `be-infra/terraform/modules/` (`artifact_registry`, `cloud_run`, `database`, `iam`, `pubsub`, `secrets`, `storage`) |
| Working directory (staging) | `be-infra/terraform/staging/` |

---

## Cloud Run Services

All services use the `padel-runtime` service account, mount the `smashbook-staging` Cloud SQL instance at `/cloudsql`, and share the same resource limits and startup probe configuration.

**Common configuration across all services:**

| Setting | Value |
|---|---|
| CPU limit | `1000m` |
| Memory limit | `512Mi` |
| Max instances | `20` |
| Request concurrency | `80` |
| Timeout | `300s` |
| CPU idle | enabled |
| Startup CPU boost | enabled |
| Startup probe | TCP socket :8080, 240s timeout, 240s period, 1 failure threshold |

### Services

| Service name | Image | Entrypoint override | Public ingress | Description |
|---|---|---|---|---|
| `padel-api` | `padel-api` | _(none — default CMD)_ | Yes (`allUsers` invoker) | FastAPI backend. All client traffic. Handles bookings, auth, payments, courts, players, staff, Stripe webhooks. |
| `padel-booking-worker` | `padel-worker` | `uvicorn app.workers.booking_worker:app --host 0.0.0.0 --port 8080` | Yes (Pub/Sub push) | Processes booking events — confirmations, reminders, waitlist logic. |
| `padel-payment-worker` | `padel-worker` | `uvicorn app.workers.payment_worker:app --host 0.0.0.0 --port 8080` | Yes (Pub/Sub push) | Handles payment events, Stripe webhook fanout, refund flows. |
| `padel-notification-worker` | `padel-worker` | `uvicorn app.workers.notification_worker:app --host 0.0.0.0 --port 8080` | Yes (Pub/Sub push) | Dispatches push (Firebase), email (SendGrid), and SMS notifications. |
| `padel-analytics-worker` | `padel-worker` | `uvicorn app.analytics.workers.snapshot_court_utilisation:app --host 0.0.0.0 --port 8080` | Yes (Pub/Sub push) | Court-utilisation snapshots (G7). Mounts primary + read replica. |
| `padel-analytics-refresh-worker` | `padel-worker` | `uvicorn app.analytics.workers.refresh_views:app --host 0.0.0.0 --port 8080` | Yes (Pub/Sub push) | Revenue MV refresh (G7). Primary only. |

**Images (Artifact Registry):**

| Image name | Full path |
|---|---|
| `padel-api` | `europe-west2-docker.pkg.dev/smashbook-488121/padel-api/padel-api` |
| `padel-worker` | `europe-west2-docker.pkg.dev/smashbook-488121/padel-api/padel-worker` |

Images are tagged with git SHA by CI/CD. Terraform ignores image tag drift (`lifecycle.ignore_changes`).

**Secrets injected into `padel-api`:**

| Env var | Secret |
|---|---|
| `DATABASE_URL` | `padel-database-url` |
| `DATABASE_READ_REPLICA_URL` | `padel-database-read-replica-url` |
| `SECRET_KEY` | `padel-secret-key` |
| `STRIPE_SECRET_KEY` | `stripe-secret-key` |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook-secret` |
| `STRIPE_BILLING_SECRET_KEY` | `stripe-billing-secret-key` |
| `STRIPE_BILLING_WEBHOOK_SECRET` | `stripe-billing-webhook-secret` |
| `SENDGRID_API_KEY` | `sendgrid-api-key` |

**Secrets injected into each worker:**

| Env var | Secret |
|---|---|
| `DATABASE_URL` | `padel-database-url` |
| `SECRET_KEY` | `padel-secret-key` |

---

## Cloud Run Jobs

| Job name | Trigger | Description |
|---|---|---|
| `run-migrations` | CI/CD pipeline (every deploy) | Self-bootstrapping — created on first pipeline run. Runs `alembic upgrade head` against Cloud SQL before the new service revision receives traffic. |

### Cloud Scheduler

`release-expired-holds`, `analytics-snapshot-daily`, and `analytics-refresh-daily` are all **live in staging** (present in Terraform state). All jobs are defined in `be-infra/terraform/modules/scheduler` and require `cloudscheduler.googleapis.com` enabled on the project.

- **`release-expired-holds`** (court-hold expiry sweep → `POST /api/v1/admin/bookings/release-expired-holds`), wired into both `staging/` and `prod/`. Runs every minute in prod; created **paused** in staging (toggle via the `release_holds_scheduler_paused` variable). It authenticates with the `X-Platform-Key` header sourced from the `padel-platform-api-key` secret — no OIDC SA required, since `padel-api` is public and the endpoint is header-gated.
- **`analytics-snapshot-daily`** (Sprint 7 / G7), wired into `staging/`. **Pub/Sub target** — publishes `{"event_type":"analytics.snapshot_daily"}` to `analytics-events` at **02:00 UTC daily**, delivered to `padel-analytics-worker`. The worker snapshots each club's *local* yesterday, so a single UTC fire time suffices. Created **unpaused** in staging (toggle via `analytics_snapshot_paused`). The Cloud Scheduler service agent (`service-607958067144@gcp-sa-cloudscheduler.iam.gserviceaccount.com`) is granted `roles/pubsub.publisher` on the topic by the module. The one-time 90-day backfill is **not** scheduled — trigger on demand (`make analytics-backfill-staging`, or `scripts/run_court_snapshots.py`).
- **`analytics-refresh-daily`** (Sprint 7 / G7), wired into `staging/`. **Pub/Sub target** — publishes `{"event_type":"analytics.refresh_views"}` to `analytics-refresh-events` at **03:00 UTC daily** (after the 02:00 snapshot; the two are independent), delivered to `padel-analytics-refresh-worker`, which runs `REFRESH MATERIALIZED VIEW CONCURRENTLY` over the revenue views and logs each run to `analytics_refresh_log`. Created **unpaused** in staging (toggle via `analytics_refresh_paused`). The Cloud Scheduler service agent is granted `roles/pubsub.publisher` on `analytics-refresh-events` by the module. Trigger manually with `make analytics-refresh-run` (job) or `make analytics-refresh-staging` (publish directly).

---

## Networking — Serverless VPC Access

A Serverless VPC Access connector lets Cloud Run services reach internal-only resources over RFC1918 addresses. It is the prerequisite for the upcoming Cloud SQL private IP migration; today Cloud SQL is still reached via public IP and the Cloud SQL proxy.

| Property | Value |
|---|---|
| Connector name | `padel-connector-staging` |
| Region | `europe-west2` |
| Attached network | `default` |
| IP CIDR range | `10.8.0.0/28` |
| Machine type | `e2-micro` |
| Min / max instances | 2 / 3 |

All Cloud Run services (`padel-api`, `padel-booking-worker`, `padel-payment-worker`, `padel-notification-worker`, `padel-analytics-worker`, `padel-analytics-refresh-worker`) attach to this connector with `egress = "PRIVATE_RANGES_ONLY"` — only RFC1918 destinations route through the connector; public egress (Stripe, SendGrid, Anthropic, Firebase) continues to leave via the standard Cloud Run network path.

> **Prod note:** `be-infra/terraform/prod/` declares an equivalent `padel-connector-prod` connector on `10.9.0.0/28`. Not yet applied — no prod GCP project exists.

---

## Cloud SQL

| Property | Value |
|---|---|
| Instance name | `smashbook-staging` |
| PostgreSQL version | `POSTGRES_18` |
| Tier | `db-g1-small` |
| Edition | `ENTERPRISE` |
| Availability | `ZONAL` (single zone — no HA) |
| Zone | `europe-west2-a` |
| Disk type | `PD_SSD` |
| Disk size | 20 GB |
| Disk autoresize | **Disabled** |
| Backups | **Enabled** — automated, 15 retained, window starts 19:00 UTC |
| Point-in-time recovery | **Enabled** — 7-day transaction log retention |
| SSL mode | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` |
| IAM authentication | Enabled (`cloudsql.iam_authentication = on`) |
| pgvector | Enabled — `CREATE EXTENSION vector` applied via Alembic (no instance flag required on PostgreSQL 15+) |
| Read replica | `smashbook-staging-replica` (`europe-west2-a`, `db-g1-small`, `failover_target = false`) |
| Deletion protection | Enabled (both instances) |
| Database name | `padel_db` |
| Database user | `padel_user` |

> **Note:** `ARCHITECTURE.md` §11 references "PostgreSQL 16" but the live instance runs PostgreSQL 18. The Terraform is the source of truth.

---

## Pub/Sub

### Topics

| Topic | Phase | Purpose |
|---|---|---|
| `booking-events` | MVP | Booking lifecycle events |
| `payment-events` | MVP | Payment and refund events |
| `notification-events` | MVP | Notification dispatch events |
| `booking-events-dlq` | MVP | Dead-letter sink for `booking-events-sub` |
| `payment-events-dlq` | MVP | Dead-letter sink for `payment-events-sub` |
| `notification-events-dlq` | MVP | Dead-letter sink for `notification-events-sub` |
| `analytics-events` | Sprint 7 (G7) | Court-utilisation snapshot triggers. Live |
| `analytics-events-dlq` | Sprint 7 (G7) | Dead-letter sink for `analytics-events-sub`. Live |
| `analytics-refresh-events` | Sprint 7 (G7) | Materialized-view refresh triggers (revenue views). Separate topic from `analytics-events` so the snapshot worker never receives refresh messages. Live |
| `analytics-refresh-events-dlq` | Sprint 7 (G7) | Dead-letter sink for `analytics-refresh-events-sub`. Live |
| `analytics-alerts` | Sprint 7 (G7) | Sink for MV-refresh failure alerts published by `refresh_views.py`. Live; no subscription yet (alerting consumer is a future gap). |

### Push Subscriptions

| Subscription | Topic | Worker endpoint | Ack deadline | Retention | Dead-letter | Max attempts |
|---|---|---|---|---|---|---|
| `booking-events-sub` | `booking-events` | `padel-booking-worker /pubsub` | 300s | 7 days | `booking-events-dlq` | 5 |
| `payment-events-sub` | `payment-events` | `padel-payment-worker /pubsub` | 300s | 7 days | `payment-events-dlq` | 5 |
| `notification-events-sub` | `notification-events` | `padel-notification-worker /pubsub` | 300s | 7 days | `notification-events-dlq` | 5 |
| `analytics-events-sub` | `analytics-events` | `padel-analytics-worker /pubsub` | 600s | 7 days | `analytics-events-dlq` | 5 | |
| `analytics-refresh-events-sub` | `analytics-refresh-events` | `padel-analytics-refresh-worker /pubsub` | 600s | 7 days | `analytics-refresh-events-dlq` | 5 | |

All subscriptions use exponential backoff retry (10s–600s; `analytics-events-sub` and `analytics-refresh-events-sub` use 30s–600s). Push authentication via OIDC token using `padel-runtime` SA. The Pub/Sub service agent (`service-607958067144@gcp-sa-pubsub.iam.gserviceaccount.com`) holds `roles/pubsub.publisher` on each DLQ topic.

---

## Secret Manager

All secret resources are managed by Terraform. Secret **values** are set manually via `gcloud` and never committed.

| Secret name | Purpose | Status |
|---|---|---|
| `padel-database-url` | Primary DB connection string | Live |
| `padel-database-read-replica-url` | Read replica connection string | Live — points to `smashbook-staging-replica` |
| `padel-secret-key` | JWT signing key | Live |
| `stripe-secret-key` | Stripe API key | Live (test key) |
| `stripe-publishable-key` | Stripe publishable key | Live (test key) |
| `stripe-webhook-secret` | Stripe webhook signature secret — Connect-account events (`/payments/stripe/webhook`) | Live |
| `stripe-billing-secret-key` | Stripe API secret key for the **billing account** (tenant SaaS subscriptions). Currently set to the same value as `stripe-secret-key`; will diverge when SmashBook Corporate Stripe account is provisioned (see `docs/runbooks/STRIPE_BILLING_ACCOUNT_SPLIT.md`). | Live (test key) |
| `stripe-billing-webhook-secret` | Stripe webhook signature secret — platform-account events for SmashBook→org subscription billing (`/webhooks/stripe-billing`) | Declared — value must be set via `gcloud secrets versions add stripe-billing-webhook-secret --data-file=-` after creating the corresponding webhook in the Stripe Dashboard |
| `sendgrid-api-key` | SendGrid transactional email | Live |
| `padel-platform-api-key` | Platform API key (future use) | Declared — placeholder value |

The `padel-runtime` SA has `roles/secretmanager.secretAccessor` on all secrets via resource-level IAM bindings.

---

## Cloud Storage

All buckets: `europe-west2`, uniform bucket-level access, public access prevention enforced, soft-delete disabled.

| Bucket | Purpose | Lifecycle |
|---|---|---|
| `padel-media-smashbook-488121-staging` | Booking receipts, court media, player avatars | No expiry. CORS restricted to `https://*.smashbook.app` (GET/HEAD). |
| `padel-exports-smashbook-488121-staging` | Async CSV exports; callers retrieve objects via signed URL | Objects deleted after 7 days. |
| `padel-ai-archive-smashbook-488121-staging` | `ai_inference_log` payload archives (>90 days). Archive job lands in Stage 3. | Transitions to Coldline after 30 days in bucket. |

The `padel-runtime` SA holds `roles/storage.objectAdmin` on each bucket via bucket-level IAM bindings (not project-level).

**Terraform outputs:**

| Output | Value |
|---|---|
| `media_bucket_name` | `padel-media-smashbook-488121-staging` |
| `exports_bucket_name` | `padel-exports-smashbook-488121-staging` |
| `ai_archive_bucket_name` | `padel-ai-archive-smashbook-488121-staging` |

---

## IAM & Service Accounts

### Service Accounts

| Account | Email | Purpose |
|---|---|---|
| `padel-runtime` | `padel-runtime@smashbook-488121.iam.gserviceaccount.com` | Cloud Run runtime identity for all services and workers |
| `github-actions-deployer` | `github-actions-deployer@smashbook-488121.iam.gserviceaccount.com` | CI/CD deployment from GitHub Actions |

### `padel-runtime` Project-Level Roles

| Role | Reason |
|---|---|
| `roles/cloudsql.client` | Connect to Cloud SQL via Cloud SQL proxy |
| `roles/secretmanager.secretAccessor` | Read secrets at runtime |
| `roles/pubsub.publisher` | Publish events from `padel-api` and workers |
| `roles/pubsub.subscriber` | Consume from push subscriptions |

### `github-actions-deployer` Project-Level Roles

| Role | Reason |
|---|---|
| `roles/run.admin` | Deploy Cloud Run services and jobs |
| `roles/artifactregistry.writer` | Push Docker images |
| `roles/cloudsql.client` | Run `run-migrations` Cloud Run Job |
| `roles/secretmanager.viewer` | Read secret metadata (not values) |
| `roles/iam.serviceAccountUser` | Act as `padel-runtime` SA during deploy |

`github-actions-deployer` also has `roles/artifactregistry.writer` bound at the repository level on `padel-api`.

### `padel-runtime` Bucket-Level Roles

| Bucket | Role |
|---|---|
| `padel-media-smashbook-488121-staging` | `roles/storage.objectAdmin` |
| `padel-exports-smashbook-488121-staging` | `roles/storage.objectAdmin` |
| `padel-ai-archive-smashbook-488121-staging` | `roles/storage.objectAdmin` |

---

## Artifact Registry

| Property | Value |
|---|---|
| Repository ID | `padel-api` |
| Location | `europe-west2` |
| Format | `DOCKER` |
| Deletion protection | `prevent_destroy = true` |

Stores both `padel-api` and `padel-worker` images, tagged by git SHA.

---

## CI/CD Pipeline

File: `.github/workflows/deploy-staging.yml`

**Pipeline: push to `main` → staging**

```
1. Lint:     ruff check backend/
2. Test:     pytest tests/unit/ (skips gracefully if no tests exist)
3. Build:    docker build — padel-api and padel-worker images, tagged with git SHA
4. Push:     images pushed to Artifact Registry
5. Migrate:  run-migrations Cloud Run Job (self-bootstrapping on first run)
6. Deploy:   gcloud run deploy — padel-api + 3 workers
7. Smoke:    GET /healthz — fails pipeline if non-200
```

**GitHub Secrets configured:**

| Secret | Value |
|---|---|
| `GCP_SA_KEY` | `github-actions-deployer` SA key JSON |
| `GCP_PROJECT_ID` | `smashbook-488121` |

No production pipeline exists yet (`deploy-production.yml` is noted in DEPLOYMENT.md as "to be created").

---

## Known Gaps

These are gaps between the current state and the next stage of infrastructure work. The full backlog is in [`INFRASTRUCTURE_TARGET_STATE.md`](INFRASTRUCTURE_TARGET_STATE.md) — Stage 1 (MVP Hardening).

| Gap | Stage | Impact |
|---|---|---|
| No production GCP project | — | `be-infra/terraform/prod/` scaffold exists with prod-tuned settings (HA, backups, larger tier); replace `smashbook-prod-REPLACE_ME` in `prod/terraform.tfvars` and `prod/main.tf` once the GCP project is created |
| No monitoring or alerting | Stage 2.3 | No paging on 5xx spikes, DB storage, or subscription backlogs |
| Cloud SQL on public IP | Stage 2.1 follow-on | VPC connector now live (`padel-connector-staging`); the private IP migration itself is still pending |
| `release-expired-holds` sweep paused in staging | Stage 1.8 | The job is **applied** in staging but created **paused** (`release_holds_scheduler_paused` defaults true), so the periodic sweep does not run there — abandoned court holds are only released on payment success/failure. Resume with `make scheduler-activate` (or flip the variable) for a testing session. Prod runs it every minute once the prod project exists. |
| `analytics-alerts` has no subscriber (G7) | Sprint 7 | The revenue MV-refresh pipeline is live, and `refresh_views.py` publishes a message to `analytics-alerts` on refresh failure, but nothing consumes that topic yet — so a failed nightly refresh is recorded in `analytics_refresh_log` but does not page anyone. Wire an alerting consumer (or a log-based alert on `RefreshStatus = failed`) as part of monitoring (Stage 2.3). |
| Analytics infra not wired into `prod/` (G7) | Sprint 7 | `prod/main.tf` does not pass `analytics_worker_uri` or `analytics_refresh_worker_uri` to the `pubsub` module, so `terraform validate` fails in `prod/` — analytics is intentionally **staging-only** until prod exists. Wire both args (mirroring `staging/main.tf`) when the prod project is created |
| Report-export worker not provisioned (G7) | Sprint 7 | The async export pipeline exists in code (`POST /api/v1/analytics/exports` → `app/analytics/workers/export_report.py`), and the exports **bucket already exists** (`padel-exports-…`). Still to provision via Terraform: the `analytics-export-events` topic (+ `-sub` / `-dlq`), and a `padel-analytics-export-worker` Cloud Run service (`uvicorn app.analytics.workers.export_report:app`, primary + read replica, with `roles/pubsub.publisher` on the topic for the API service identity). No Cloud Scheduler — exports are request-triggered, not cron. Until then, export requests publish to a topic with no subscriber and no file is produced. |

---

*SmashBook — Infrastructure Current State*
*Maintained alongside the codebase in `docs/INFRASTRUCTURE.md`*
