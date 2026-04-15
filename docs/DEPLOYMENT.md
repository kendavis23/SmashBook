_Last updated: 2026-04-15 00:00 UTC_

# SmashBook — Deployment & CI/CD Runbook

> **Audience:** Engineers deploying changes to SmashBook
> **Last updated:** 2026-04-15
> **Stack:** GCP Cloud Run · Cloud SQL PostgreSQL · Artifact Registry · GitHub Actions · Terraform

---

## Table of Contents

1. [Environments](#1-environments)
2. [Prerequisites](#2-prerequisites)
3. [First-Time GCP Setup](#3-first-time-gcp-setup)
4. [Local Development](#4-local-development)
5. [Making Changes](#5-making-changes)
   - [Application code changes](#51-application-code-changes)
   - [Database schema changes](#52-database-schema-changes)
   - [Infrastructure changes (Terraform)](#53-infrastructure-changes-terraform)
   - [Adding or rotating secrets](#54-adding-or-rotating-secrets)
6. [Manual Deployment to Staging / Production](#6-manual-deployment-to-staging--production)
7. [CI/CD Pipeline](#7-cicd-pipeline)
8. [Rollback](#8-rollback)
9. [Health Checks & Smoke Tests](#9-health-checks--smoke-tests)

---

## 1. Environments

| Environment | Purpose | Deployment trigger |
|---|---|---|
| `dev` | Local development | `docker compose up` |
| `staging` | Integration testing, pre-release validation | Push to `main` branch |
| `production` | Live platform | Manual promotion from staging |

**GCP project IDs are stored in GitHub Secrets** — see [Section 3](#3-first-time-gcp-setup) for setup.

---

## 2. Prerequisites

Install all of the following before doing any deployment work.

### Required tools

```bash
# Verify versions after installing
docker --version          # >= 24
docker compose version    # >= 2.x (plugin, not standalone)
gcloud --version          # >= 480
terraform --version       # >= 1.9
python --version          # >= 3.12
```

### Installation

```bash
# gcloud CLI — follow https://cloud.google.com/sdk/docs/install then:
gcloud auth login
gcloud auth application-default login

# Terraform
brew install terraform      # macOS
# or: https://developer.hashicorp.com/terraform/install

# Docker Desktop — https://www.docker.com/products/docker-desktop
```

### Configure gcloud for the project

```bash
# Replace <PROJECT_ID> with the staging or production GCP project ID
gcloud config set project <PROJECT_ID>
gcloud config set run/region europe-west2
```

---

## 3. First-Time GCP Setup

> **Staging is already bootstrapped** (completed 2026-04-15 via Terraform). Run this only for new environments (e.g. production).
>
> Infrastructure is managed by Terraform in `be-infra/terraform/`. Service accounts, IAM bindings, Artifact Registry, Pub/Sub, and Cloud Run configuration are all defined there — do **not** create these resources manually.

### 3.1 Terraform State Bucket

Create the GCS bucket that stores Terraform state. This must exist before `terraform init`:

```bash
gcloud storage buckets create gs://tf-state-smashbook-488121-backend \
  --location=europe-west2 \
  --project=<GCP_PROJECT_ID>
```

### 3.2 Bootstrap Infrastructure with Terraform

```bash
cd be-infra/terraform

# Initialise — downloads providers and connects to state backend
terraform init

# For a brand-new environment with no existing resources:
terraform apply -var="project_id=<GCP_PROJECT_ID>"

# For an environment with pre-existing resources (e.g. Cloud SQL created manually):
# Run import.sh first to bring existing resources under Terraform management,
# then apply to create the remainder.
chmod +x import.sh
./import.sh
terraform apply -var="project_id=<GCP_PROJECT_ID>"
```

Terraform creates and manages:
- `github-actions-deployer` service account + IAM roles for CI/CD
- `padel-runtime` service account + IAM roles for Cloud Run runtime
- Artifact Registry repository (`padel-api`)
- Pub/Sub topics and push subscriptions
- Secret Manager secret shells (values set separately — see [Section 3.4](#34-gcp-secret-manager))
- Cloud Run services and Cloud SQL configuration

### 3.3 Create GitHub Actions SA Key

After Terraform has created the `github-actions-deployer` SA:

```bash
PROJECT_ID=<GCP_PROJECT_ID>
SA_EMAIL="github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts keys create gcp-sa-key.json \
  --iam-account=$SA_EMAIL
```

### 3.4 GitHub Secrets

Add the key and project ID to GitHub:

```
GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Name:  GCP_SA_KEY
Value: <paste full contents of gcp-sa-key.json>

Name:  GCP_PROJECT_ID
Value: <your-gcp-project-id>
```

Then delete the key file immediately:

```bash
rm gcp-sa-key.json
```

### 3.5 GCP Secret Manager

Terraform creates the secret **shells** but never manages secret **values**. Set values manually after `terraform apply`:

```bash
PROJECT_ID=<GCP_PROJECT_ID>

# Database — primary
echo -n 'postgresql+asyncpg://padel_user:PASSWORD@/padel_db?host=/cloudsql/PROJECT:europe-west2:INSTANCE' \
  | gcloud secrets versions add padel-database-url --data-file=- --project=$PROJECT_ID

# Database — read replica (can point to same instance initially)
echo -n 'postgresql+asyncpg://padel_user:PASSWORD@/padel_db?host=/cloudsql/PROJECT:europe-west2:INSTANCE' \
  | gcloud secrets versions add padel-database-read-replica-url --data-file=- --project=$PROJECT_ID

# Application secret key (JWT signing)
python3 -c "import secrets; print(secrets.token_hex(32))" \
  | gcloud secrets versions add padel-secret-key --data-file=- --project=$PROJECT_ID

# Stripe (placeholder until Sprint 5)
echo -n 'sk_test_placeholder' | gcloud secrets versions add stripe-secret-key --data-file=- --project=$PROJECT_ID
echo -n 'whsec_placeholder'   | gcloud secrets versions add stripe-webhook-secret --data-file=- --project=$PROJECT_ID

# SendGrid (placeholder until Sprint 5)
echo -n 'SG.placeholder' | gcloud secrets versions add sendgrid-api-key --data-file=- --project=$PROJECT_ID

# Platform API key (placeholder until feature is built)
echo -n 'placeholder' | gcloud secrets versions add padel-platform-api-key --data-file=- --project=$PROJECT_ID
```

> **Note:** `Settings` in `config.py` only requires `DATABASE_URL` at startup — all other fields have safe defaults. This means the migration job boots with just `padel-database-url` and the full API service picks up the rest at deploy time.

### 3.6 Cloud SQL

```bash
# Reset or set the database user password
gcloud sql users set-password padel_user \
  --instance=<INSTANCE_NAME> \
  --project=$PROJECT_ID \
  --password=YOUR_PASSWORD

# The password must match what is stored in padel-database-url
```

---

## 4. Local Development

### Start the local environment

```bash
# From the repo root — starts the API and a local PostgreSQL 15 database
docker compose up
```

This automatically:
- Runs `alembic upgrade head` to apply all pending migrations
- Starts the FastAPI server with hot reload on port 8080

**Services available at:**
- Health check: http://localhost:8080/healthz
- Docs (Swagger UI): http://localhost:8080/api/v1/docs
- PostgreSQL: `localhost:5432` (user: `padel_user`, db: `padel_db`)

### Stop the environment

```bash
docker compose down
```

### Reset the database (wipe all data)

```bash
docker compose down -v   # removes the postgres_data volume
docker compose up
```

### Connect to the local database directly

```bash
docker compose exec db psql -U padel_user -d padel_db
```

---

## 5. Making Changes

---

### 5.1 Application Code Changes

For any Python code change (routes, services, models, schemas, workers):

**Step 1** — Make your changes in `backend/app/`.

**Step 2** — Run the app locally and verify the change works:

```bash
docker compose up
# Test via http://localhost:8080/docs or your API client
```

**Step 3** — Run the linter before committing (pipeline will fail if ruff finds errors):

```bash
cd backend
source ../.venv/bin/activate
ruff check . --fix   # auto-fix what it can
ruff check .         # confirm zero errors remain
```

**Step 4** — Commit and push to `main`:

```bash
git add backend/app/<changed-files>
git commit -m "feat: <description>"
git push origin main
```

The CI/CD pipeline (see [Section 7](#7-cicd-pipeline)) builds and deploys to staging automatically.

**Step 5** — After verifying on staging, promote to production (see [Section 6](#6-manual-deployment-to-staging--production)).

---

### 5.2 Database Schema Changes

> Always use Alembic — **never** modify the database schema directly.

**Step 1** — Make your model changes in `backend/app/db/models/`.

**Step 2** — Generate a new migration:

```bash
cd backend
alembic revision --autogenerate -m "describe_your_change"
```

A new file is created in `backend/app/db/migrations/versions/`. **Review it carefully** — autogenerate is not always perfect, especially for complex changes.

**Step 3** — Test the migration locally:

```bash
alembic upgrade head
alembic downgrade -1   # verify it can be reversed
alembic upgrade head   # re-apply
```

**Step 4** — Commit both the model change and the migration file together:

```bash
git add backend/app/db/models/<changed-model>.py
git add backend/app/db/migrations/versions/<new-migration>.py
git commit -m "feat: add player phone number field + migration"
git push origin main
```

The CI pipeline runs migrations automatically before deploying the new revision.

> **Important:** Migrations on Cloud SQL run via the `run-migrations` Cloud Run Job before the new API revision receives traffic. Zero-downtime schema changes (additive only) are strongly preferred — avoid column renames or type changes in a single deployment.

---

### 5.3 Infrastructure Changes (Terraform)

> Changes to Cloud Run config, Cloud SQL, Pub/Sub topics, secrets, or IAM.
>
> Terraform files live in `be-infra/terraform/`. State is stored remotely in GCS bucket `tf-state-smashbook-488121-backend` — never commit `.tfstate` files.

**Step 1** — Make changes in `be-infra/terraform/`.

**Step 2** — Initialise Terraform (first time, or after provider changes):

```bash
cd be-infra/terraform
terraform init
```

**Step 3** — Plan and review:

```bash
terraform plan
```

Anything marked `destroy` or that modifies Cloud SQL requires extra scrutiny — some changes cause downtime or data loss.

**Step 4** — Apply:

```bash
terraform apply
```

**Step 5** — Commit:

```bash
git add be-infra/terraform/
git commit -m "infra: <description>"
git push origin main
```

> **Never commit `.terraform/`** — it contains large provider binaries and is excluded by `be-infra/terraform/.gitignore`. State lives in GCS, not in the repo.

---

### 5.4 Adding or Rotating Secrets

Secrets are stored in GCP Secret Manager and never in code or `.env` files in production.

**To add a new secret:**

```bash
echo -n '<secret-value>' | gcloud secrets create <secret-name> --data-file=- --project=smashbook-488121
```

**To rotate an existing secret:**

```bash
# Add a new version
echo -n '<new-secret-value>' | gcloud secrets versions add <secret-name> --data-file=- --project=smashbook-488121

# Cloud Run picks up 'latest' automatically on next deployment
# Disable the old version once confirmed working:
gcloud secrets versions disable <old-version-number> --secret=<secret-name> --project=smashbook-488121
```

**To verify a secret value:**

```bash
gcloud secrets versions access latest --secret=<secret-name> --project=smashbook-488121
```

---

## 6. Manual Deployment to Staging / Production

> The CI pipeline handles staging automatically on merge to `main`. Use these steps for manual deployments or production promotions only.

### Build and push the Docker image

```bash
PROJECT_ID=smashbook-488121
REGION=europe-west2
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/padel-api"
IMAGE_TAG=$(git rev-parse --short HEAD)

# Authenticate Docker to Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build (M-series Mac: must specify linux/amd64)
docker build --platform linux/amd64 -t "${REGISTRY}/padel-api:${IMAGE_TAG}" -t "${REGISTRY}/padel-api:latest" ./backend
docker build --platform linux/amd64 -f backend/Dockerfile.worker \
  -t "${REGISTRY}/padel-worker:${IMAGE_TAG}" -t "${REGISTRY}/padel-worker:latest" ./backend

# Push
docker push "${REGISTRY}/padel-api:${IMAGE_TAG}"
docker push "${REGISTRY}/padel-api:latest"
docker push "${REGISTRY}/padel-worker:${IMAGE_TAG}"
docker push "${REGISTRY}/padel-worker:latest"
```

### Run database migrations

```bash
# The run-migrations job is self-bootstrapping via the CI pipeline.
# For a manual run, execute it directly:
gcloud run jobs execute run-migrations --region=${REGION} --project=${PROJECT_ID} --wait
```

### Deploy the API service

```bash
gcloud run deploy padel-api \
  --image="${REGISTRY}/padel-api:${IMAGE_TAG}" \
  --region=${REGION} \
  --platform=managed \
  --project=${PROJECT_ID}
```

### Deploy worker services

```bash
for WORKER in booking-worker payment-worker notification-worker; do
  gcloud run deploy "padel-${WORKER}" \
    --image="${REGISTRY}/padel-worker:${IMAGE_TAG}" \
    --region=${REGION} \
    --platform=managed \
    --project=${PROJECT_ID}
done
```

### Verify the deployment

```bash
URL=$(gcloud run services describe padel-api \
  --region=${REGION} --project=${PROJECT_ID} \
  --format="value(status.url)")

curl ${URL}/healthz
# Expected: 200 OK  {"status": "ok"}
```

---

## 7. CI/CD Pipeline

The pipeline is live and fully operational as of 2026-03-28.

### Pipeline: push to `main` → staging

File: `.github/workflows/deploy-staging.yml`

```
1. Lint:     ruff check backend/
2. Test:     pytest tests/unit/ (skips gracefully if no tests exist yet)
3. Build:    docker build — api + worker images tagged with git SHA
4. Push:     images pushed to Artifact Registry
5. Migrate:  run-migrations Cloud Run Job (self-bootstrapping — creates on first run)
6. Deploy:   gcloud run deploy — api + 3 workers
7. Smoke:    GET /healthz — fails pipeline if non-200
```

### Pipeline: production promotion

File: `.github/workflows/deploy-production.yml` _(to be created)_

```
1. Trigger:  manual workflow_dispatch or tag push (e.g. v1.2.3)
2. Resolve:  read image SHA currently running on staging
3. Migrate:  run alembic upgrade head on production Cloud SQL
4. Deploy:   gcloud run deploy pointing production to same SHA as staging
5. Smoke:    GET /healthz on production URL
```

### GitHub Secrets required

| Secret | Description |
|---|---|
| `GCP_SA_KEY` | Service account JSON key for GitHub Actions (`github-actions-deployer`) |
| `GCP_PROJECT_ID` | GCP project ID for staging (`smashbook-488121`) |
| `GCP_SA_KEY_PROD` | Service account JSON key for production (when configured) |
| `GCP_PROJECT_ID_PROD` | GCP project ID for production (when configured) |

### GCP Secret Manager secrets required at runtime

| Secret name | Required for | Notes |
|---|---|---|
| `padel-database-url` | API + migrations | Primary DB — always required |
| `padel-database-read-replica-url` | API reads | Can point to primary initially |
| `padel-secret-key` | API (JWT) | Generate with `secrets.token_hex(32)` |
| `stripe-secret-key` | API (Sprint 5+) | Placeholder ok until Sprint 5 |
| `stripe-webhook-secret` | API (Sprint 5+) | Placeholder ok until Sprint 5 |
| `sendgrid-api-key` | API (Sprint 5+) | Placeholder ok until Sprint 5 |
| `padel-platform-api-key` | API (future) | Placeholder ok until feature is built |

### Trigger the pipeline manually

The staging pipeline supports `workflow_dispatch` — trigger it without a code change from GitHub:

1. Go to the repo on GitHub → **Actions** tab
2. Select **Deploy to Staging** in the left sidebar
3. Click **Run workflow** → **Run workflow**

Or via CLI:

```bash
gh workflow run deploy-staging.yml --ref main
```

Or with an empty commit:

```bash
git commit --allow-empty -m "ci: retrigger pipeline"
git push origin main
```

---

## 8. Rollback

### Roll back the Cloud Run service to a previous revision

```bash
# List recent revisions
gcloud run revisions list --service=padel-api --region=europe-west2 --project=smashbook-488121

# Route 100% of traffic to a previous revision
gcloud run services update-traffic padel-api \
  --region=europe-west2 \
  --to-revisions=<REVISION_NAME>=100 \
  --project=smashbook-488121
```

### Roll back a database migration

> Use this only if the migration must be undone. Data loss is possible — proceed with caution.

```bash
# Downgrade one step
alembic downgrade -1

# Downgrade to a specific revision
alembic downgrade <revision-id>

# Check current migration state
alembic current
```

### Roll back to a previous Docker image

```bash
# Find the image SHA from Artifact Registry
gcloud artifacts docker images list \
  europe-west2-docker.pkg.dev/smashbook-488121/padel-api/padel-api

# Deploy the specific SHA
gcloud run deploy padel-api \
  --image="europe-west2-docker.pkg.dev/smashbook-488121/padel-api/padel-api:<SHA>" \
  --region=europe-west2 \
  --project=smashbook-488121
```

---

## 9. Health Checks & Smoke Tests

### API health endpoint

```bash
# Staging
URL=$(gcloud run services describe padel-api \
  --region=europe-west2 --project=smashbook-488121 \
  --format="value(status.url)")
curl ${URL}/healthz
# Expected: 200 OK  {"status": "ok"}

# Local
curl http://localhost:8080/healthz
```

### Check Cloud Run service status

```bash
gcloud run services list --region=europe-west2 --project=smashbook-488121
```

### Check migration job status

```bash
# List recent executions
gcloud run jobs executions list \
  --job=run-migrations \
  --region=europe-west2 \
  --project=smashbook-488121

# View logs for a specific execution
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=run-migrations" \
  --limit=50 \
  --format="value(timestamp, textPayload)" \
  --project=smashbook-488121
```

### View Cloud Run logs

```bash
# API logs
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=padel-api" \
  --limit=50 \
  --format="value(timestamp, textPayload)" \
  --project=smashbook-488121

# Worker logs (replace service name as needed)
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=padel-booking-worker" \
  --limit=50 \
  --format="value(timestamp, textPayload)" \
  --project=smashbook-488121
```

### Check Pub/Sub subscription backlogs

```bash
for TOPIC in booking-events payment-events notification-events; do
  gcloud pubsub subscriptions describe ${TOPIC}-sub \
    --format="value(name, pushConfig.pushEndpoint)" \
    --project=smashbook-488121
done
```

### Connect to Cloud SQL directly (via proxy)

```bash
# Install the proxy if needed
brew install cloud-sql-proxy   # macOS

# Start the proxy
cloud-sql-proxy smashbook-488121:europe-west2:smashbook-staging &

# Connect
psql postgresql://padel_user:PASSWORD@localhost:5432/padel_db
```
