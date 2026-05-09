_Last updated: 2026-05-09 00:00 UTC_

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
- [Cloud SQL](#cloud-sql)
- [Pub/Sub](#pubsub)
- [Secret Manager](#secret-manager)
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
| Terraform layout | Flat files per concern — `cloud_run.tf`, `database.tf`, `pubsub.tf`, `secrets.tf`, `iam.tf`, `artifact_registry.tf`, `main.tf`, `variables.tf`, `outputs.tf` |

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

No Cloud Scheduler jobs exist yet.

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
| Backups | **Disabled** |
| Point-in-time recovery | **Disabled** |
| SSL mode | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` |
| IAM authentication | Enabled (`cloudsql.iam_authentication = on`) |
| pgvector flag | **Not enabled** |
| Read replica | **None** |
| Deletion protection | Enabled |
| Database name | `padel_db` |
| Database user | `padel_user` |

> **Note:** `ARCHITECTURE.md` §11 references "PostgreSQL 16" but the live instance runs PostgreSQL 18. The Terraform is the source of truth.

---

## Pub/Sub

### Topics

| Topic | Phase |
|---|---|
| `booking-events` | MVP |
| `payment-events` | MVP |
| `notification-events` | MVP |

### Push Subscriptions

| Subscription | Topic | Worker endpoint | Ack deadline | Retention | Dead-letter |
|---|---|---|---|---|---|
| `booking-events-sub` | `booking-events` | `padel-booking-worker /pubsub` | 300s | 7 days | **None** |
| `payment-events-sub` | `payment-events` | `padel-payment-worker /pubsub` | 300s | 7 days | **None** |
| `notification-events-sub` | `notification-events` | `padel-notification-worker /pubsub` | 300s | 7 days | **None** |

All subscriptions use exponential backoff retry (10s–600s). Push authentication via OIDC token using `padel-runtime` SA.

---

## Secret Manager

All secret resources are managed by Terraform. Secret **values** are set manually via `gcloud` and never committed.

| Secret name | Purpose | Status |
|---|---|---|
| `padel-database-url` | Primary DB connection string | Live |
| `padel-database-read-replica-url` | Read replica connection string | Declared — points to primary (no replica exists yet) |
| `padel-secret-key` | JWT signing key | Live |
| `stripe-secret-key` | Stripe API key | Live (test key) |
| `stripe-publishable-key` | Stripe publishable key | Live (test key) |
| `stripe-webhook-secret` | Stripe webhook signature secret | Live |
| `sendgrid-api-key` | SendGrid transactional email | Live |
| `padel-platform-api-key` | Platform API key (future use) | Declared — placeholder value |

The `padel-runtime` SA has `roles/secretmanager.secretAccessor` on all secrets via resource-level IAM bindings.

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
| No Cloud Storage buckets | Stage 1.2 | `storage_service.py` has no bucket to write to; receipt/export features will fail |
| No Cloud SQL read replica | Stage 1.3 | `padel-database-read-replica-url` secret points to primary; read path not separated |
| pgvector flag not enabled | Stage 1.4 | `player_profiles.embedding` migration will fail; matchmaking blocked |
| No production environment | Stage 1.5 | All Terraform is hardcoded to `smashbook-staging`; no path to production |
| No dead-letter queues | Stage 1.6 | Poison messages loop indefinitely on all three MVP subscriptions |
| Backups disabled on Cloud SQL | — | Data loss risk; should be enabled before any real customer data lands |
| No monitoring or alerting | Stage 2.3 | No paging on 5xx spikes, DB storage, or subscription backlogs |
| No VPC connector | Stage 2.1 | Workers connect to Cloud SQL via public IP; required for private IP migration |

---

*SmashBook — Infrastructure Current State*
*Maintained alongside the codebase in `docs/INFRASTRUCTURE.md`*
