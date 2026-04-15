#!/usr/bin/env bash
# =============================================================================
# gcp-setup.sh
# Run this ONCE locally to bootstrap your GCP project for CI/CD.
# Prerequisites: gcloud CLI installed and authenticated (`gcloud auth login`)
# Usage: bash gcp-setup.sh <your-gcp-project-id>
# =============================================================================

set -euo pipefail

PROJECT_ID="${1:?Usage: bash gcp-setup.sh <gcp-project-id>}"
REGION="europe-west2"
SERVICE_ACCOUNT_NAME="github-actions-deployer"
SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
REPO_NAME="padel-api"

echo "🔧 Setting up GCP project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

# ── Enable required APIs ──────────────────────────────────────────────────────
echo "📡 Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com

# ── Create Artifact Registry repository ──────────────────────────────────────
echo "📦 Creating Artifact Registry repository..."
gcloud artifacts repositories create "${REPO_NAME}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Padel booking app backend images" \
  2>/dev/null || echo "  (repository already exists, skipping)"

# ── Create Service Account for GitHub Actions ─────────────────────────────────
echo "👤 Creating service account..."
gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
  --display-name="GitHub Actions Deployer" \
  2>/dev/null || echo "  (service account already exists, skipping)"

# ── Grant required IAM roles ──────────────────────────────────────────────────
echo "🔐 Granting IAM roles..."
ROLES=(
  "roles/run.admin"                    # Deploy to Cloud Run
  "roles/artifactregistry.writer"      # Push Docker images
  "roles/secretmanager.secretAccessor" # Read secrets at runtime
  "roles/iam.serviceAccountUser"       # Act as the Cloud Run service identity
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --quiet
  echo "  ✅ ${ROLE}"
done

# ── Export service account key ────────────────────────────────────────────────
echo "🔑 Exporting service account key..."
gcloud iam service-accounts keys create ./gcp-sa-key.json \
  --iam-account="${SA_EMAIL}"

echo ""
echo "============================================================"
echo "✅ GCP setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy the contents of ./gcp-sa-key.json"
echo "  2. Add it as a GitHub Secret named: GCP_SA_KEY"
echo "  3. Add your GCP Project ID as a GitHub Secret named: GCP_PROJECT_ID"
echo "  4. Delete gcp-sa-key.json from your machine after copying it:"
echo "       rm ./gcp-sa-key.json"
echo ""
echo "  5. Create your secrets in Secret Manager, e.g.:"
echo "       echo -n 'your-db-url' | gcloud secrets create padel-database-url --data-file=-"
echo "       echo -n 'your-secret-key' | gcloud secrets create padel-secret-key --data-file=-"
echo "============================================================"
