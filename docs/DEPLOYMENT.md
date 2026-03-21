_Last updated: 2026-03-21 00:00 UTC_

# SmashBook — Deployment & CI/CD Runbook

> **Audience:** Engineers deploying changes to SmashBook
> **Last updated:** 2026-03
> **Stack:** GCP Cloud Run · Cloud SQL PostgreSQL · Artifact Registry · Terraform

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

> Run this **once** per GCP project (staging and production separately). Skip if the project is already bootstrapped.

This script creates the service account GitHub Actions will use to deploy, enables required APIs, and creates the Artifact Registry repository.

```bash
cd infra/setup
bash gcp-setup.sh <GCP_PROJECT_ID>
```

The script will output a `gcp-sa-key.json` file. After it completes:

**Step 1** — Copy the key contents and add it as a GitHub Secret:

```
GitHub repo → Settings → Secrets and variables → Actions → New repository secret
Name:  GCP_SA_KEY
Value: <paste contents of gcp-sa-key.json>
```

**Step 2** — Add the project ID as a GitHub Secret:

```
Name:  GCP_PROJECT_ID
Value: <your-gcp-project-id>
```

**Step 3** — Delete the key file from your machine immediately:

```bash
rm infra/setup/gcp-sa-key.json
```

**Step 4** — Create required secrets in GCP Secret Manager:

```bash
# Database URLs (from Cloud SQL connection details)
echo -n 'postgresql+asyncpg://user:pass@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE' \
  | gcloud secrets create padel-database-url --data-file=-

echo -n 'postgresql+asyncpg://user:pass@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE' \
  | gcloud secrets create padel-database-read-replica-url --data-file=-

# Application secret key (generate a strong random value)
python3 -c "import secrets; print(secrets.token_hex(32))" \
  | gcloud secrets create padel-secret-key --data-file=-

# Stripe keys (from dashboard.stripe.com)
echo -n 'sk_live_...' | gcloud secrets create stripe-secret-key --data-file=-
echo -n 'whsec_...'   | gcloud secrets create stripe-webhook-secret --data-file=-

# SendGrid
echo -n 'SG....' | gcloud secrets create sendgrid-api-key --data-file=-

# Firebase (upload the credentials JSON file)
gcloud secrets create firebase-credentials \
  --data-file=/path/to/firebase-credentials.json
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
- Any endpoint: http://localhost:8080/api/v1/...
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

**Step 3** — Commit and push to a feature branch:

```bash
git add backend/app/<changed-files>
git commit -m "feat: <description>"
git push origin <branch-name>
```

**Step 4** — Open a pull request to `main`. When merged, the CI/CD pipeline (see [Section 7](#7-cicd-pipeline)) builds and deploys to staging automatically.

**Step 5** — After verifying on staging, promote to production (see [Section 6](#6-manual-deployment-to-staging--production)).

---

### 5.2 Database Schema Changes

> Always use Alembic — **never** modify the database schema directly.

**Step 1** — Make your model changes in `backend/app/db/models/`.

**Step 2** — Generate a new migration:

```bash
cd backend

# Auto-generate a migration from model diff
alembic revision --autogenerate -m "describe_your_change"

# Example:
alembic revision --autogenerate -m "add_player_phone_number"
```

A new file is created in `backend/app/db/migrations/versions/`. **Review it carefully** — autogenerate is not always perfect, especially for complex changes.

**Step 3** — Test the migration locally:

```bash
# Apply the migration
alembic upgrade head

# Verify the migration can be reversed
alembic downgrade -1

# Re-apply and confirm data integrity
alembic upgrade head
```

**Step 4** — Commit both the model change and the migration file together:

```bash
git add backend/app/db/models/<changed-model>.py
git add backend/app/db/migrations/versions/<new-migration>.py
git commit -m "feat: add player phone number field + migration"
git push origin <branch-name>
```

**Step 5** — After merge to `main`, the CI pipeline deploys to staging. Migrations run automatically as part of the deployment step (see [Section 6](#6-manual-deployment-to-staging--production)).

> **Important:** Migrations on Cloud SQL are run via a dedicated Cloud Run Job before the new revision is deployed. Zero-downtime schema changes (additive only) are strongly preferred — avoid column renames or type changes in a single deployment.

---

### 5.3 Infrastructure Changes (Terraform)

> Changes to Cloud Run config, Cloud SQL, Pub/Sub topics, GCS buckets, or networking.

**Step 1** — Make changes in `infra/terraform/`.

**Step 2** — Initialise Terraform (first time, or after module changes):

```bash
cd infra/terraform
terraform init
```

**Step 3** — Plan the changes and review the diff carefully:

```bash
terraform plan -var="project_id=<GCP_PROJECT_ID>"
```

Check the plan output. Anything marked `destroy` or that changes a managed resource (Cloud SQL instance, VPC) requires extra scrutiny — some changes will cause downtime or data loss.

**Step 4** — Apply the changes:

```bash
terraform apply -var="project_id=<GCP_PROJECT_ID>"
```

Type `yes` when prompted.

**Step 5** — Commit the Terraform changes:

```bash
git add infra/terraform/
git commit -m "infra: <description>"
git push origin <branch-name>
```

> **Never commit `terraform.tfstate` or `terraform.tfstate.backup`** — state is stored remotely in the `padel-tf-state` GCS bucket.

---

### 5.4 Adding or Rotating Secrets

Secrets are stored in GCP Secret Manager and never in code or `.env` files in production.

**To add a new secret:**

```bash
echo -n '<secret-value>' | gcloud secrets create <secret-name> --data-file=-
```

Then reference it in the Cloud Run service configuration in `infra/terraform/modules/cloud-run/main.tf`:

```hcl
env {
  name = "MY_NEW_SECRET"
  value_source {
    secret_key_ref {
      secret  = "<secret-name>"
      version = "latest"
    }
  }
}
```

Apply the Terraform change to make it available to Cloud Run (see [Section 5.3](#53-infrastructure-changes-terraform)).

**To rotate an existing secret:**

```bash
# Add a new version
echo -n '<new-secret-value>' | gcloud secrets versions add <secret-name> --data-file=-

# Cloud Run picks up 'latest' automatically on next deployment
# Disable the old version once confirmed:
gcloud secrets versions disable <old-version-number> --secret=<secret-name>
```

---

## 6. Manual Deployment to Staging / Production

> The CI pipeline handles staging automatically on merge to `main`. Use these steps for manual deployments or production promotions.

### Build and push the Docker image

```bash
# Set variables
PROJECT_ID=<GCP_PROJECT_ID>
REGION=europe-west2
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/padel-api"
IMAGE_TAG=$(git rev-parse --short HEAD)   # uses current git commit SHA

# Authenticate Docker to Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build the API image
docker build -t "${REGISTRY}/padel-api:${IMAGE_TAG}" ./backend
docker build -t "${REGISTRY}/padel-api:latest"       ./backend

# Build the worker image
docker build -f backend/Dockerfile.worker \
  -t "${REGISTRY}/padel-worker:${IMAGE_TAG}" ./backend
docker build -f backend/Dockerfile.worker \
  -t "${REGISTRY}/padel-worker:latest"       ./backend

# Push both tags
docker push "${REGISTRY}/padel-api:${IMAGE_TAG}"
docker push "${REGISTRY}/padel-api:latest"
docker push "${REGISTRY}/padel-worker:${IMAGE_TAG}"
docker push "${REGISTRY}/padel-worker:latest"
```

### Run database migrations

Migrations must run before the new API revision receives traffic.

```bash
# Run migrations via a one-off Cloud Run Job
gcloud run jobs create run-migrations \
  --image="${REGISTRY}/padel-api:${IMAGE_TAG}" \
  --region=${REGION} \
  --set-cloudsql-instances=${CLOUD_SQL_CONNECTION_NAME} \
  --set-secrets="DATABASE_URL=padel-database-url:latest" \
  --command="alembic" \
  --args="upgrade,head" \
  --project=${PROJECT_ID}

gcloud run jobs execute run-migrations --region=${REGION} --wait

# Check the migration job completed successfully
gcloud run jobs executions list --job=run-migrations --region=${REGION}
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
# Get the API service URL
gcloud run services describe padel-api \
  --region=${REGION} \
  --format="value(status.url)"

# Hit the health endpoint
curl https://<SERVICE_URL>/healthz
```

---

## 7. CI/CD Pipeline

> **Note:** GitHub Actions workflow files (`.github/workflows/`) are not yet created. The steps below describe the intended pipeline to implement. Until the workflow files exist, use the [manual deployment steps](#6-manual-deployment-to-staging--production) above.

### Intended pipeline: push to `main` → staging

```
1. Trigger:  push to main
2. Test:     run pytest
3. Build:    docker build (api + worker images)
4. Push:     push images tagged with git SHA to Artifact Registry
5. Migrate:  run alembic upgrade head via Cloud Run Job
6. Deploy:   gcloud run deploy (api + 3 workers)
7. Smoke:    GET /health — fail the pipeline if non-200
```

### Intended pipeline: production promotion

```
1. Trigger:  manual workflow_dispatch (or tag push e.g. v1.2.3)
2. Verify:   confirm staging is healthy
3. Deploy:   gcloud run deploy pointing production project to the
             same image SHA that is running on staging
4. Migrate:  run alembic upgrade head on the production Cloud SQL instance
5. Smoke:    GET /health on production URL
```

### GitHub Secrets required

| Secret | Description |
|---|---|
| `GCP_SA_KEY` | Service account JSON key for GitHub Actions (`github-actions-deployer`) |
| `GCP_PROJECT_ID` | GCP project ID for staging |
| `GCP_PROJECT_ID_PROD` | GCP project ID for production |

---

## 8. Rollback

### Roll back the Cloud Run service to a previous revision

```bash
# List recent revisions
gcloud run revisions list --service=padel-api --region=europe-west2

# Route 100% of traffic to a previous revision
gcloud run services update-traffic padel-api \
  --region=europe-west2 \
  --to-revisions=<REVISION_NAME>=100
```

### Roll back a database migration

> Use this only if the migration must be undone. Coordinate with the team before running on production.

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
  europe-west2-docker.pkg.dev/<PROJECT_ID>/padel-api/padel-api

# Deploy the specific image SHA
gcloud run deploy padel-api \
  --image="europe-west2-docker.pkg.dev/<PROJECT_ID>/padel-api/padel-api:<SHA>" \
  --region=europe-west2
```

---

## 9. Health Checks & Smoke Tests

### API health endpoint

```bash
curl https://<SERVICE_URL>/healthz
# Expected: 200 OK  {"status": "ok"}
# Note: local dev uses http://localhost:8080/healthz
```

### Check Cloud Run service status

```bash
gcloud run services list --region=europe-west2
```

### Check recent migration history

```bash
# Connect to Cloud SQL via proxy (local)
cloud-sql-proxy <PROJECT>:europe-west2:<INSTANCE> &
DATABASE_URL=postgresql://user:pass@localhost:5432/padel alembic history
```

### View Cloud Run logs

```bash
# API logs
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=padel-api" \
  --limit=50 \
  --format="value(timestamp, textPayload)"

# Worker logs (replace with booking-worker, payment-worker, or notification-worker)
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=padel-booking-worker" \
  --limit=50 \
  --format="value(timestamp, textPayload)"
```

### Check Pub/Sub subscription backlogs

```bash
for TOPIC in booking-events payment-events notification-events; do
  gcloud pubsub subscriptions describe ${TOPIC}-sub \
    --format="value(name, pushConfig.pushEndpoint)"
done
```
