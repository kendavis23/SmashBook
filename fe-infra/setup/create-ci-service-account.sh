#!/usr/bin/env bash
# =============================================================================
# create-ci-service-account.sh
# Run this ONCE locally to create the GitHub Actions service account in GCP.
# It grants only the IAM roles the deploy workflows need — nothing more.
# Prerequisites: gcloud CLI installed and authenticated (`gcloud auth login`)
# Usage: bash create-ci-service-account.sh <your-gcp-project-id>
# =============================================================================

set -euo pipefail

PROJECT_ID="${1:?Usage: bash create-ci-service-account.sh <gcp-project-id>}"
SERVICE_ACCOUNT_NAME="gh-actions-fe-deployer"
SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Setting up GCP project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

# ── Enable required APIs ──────────────────────────────────────────────────────
echo "Enabling APIs..."
gcloud services enable \
  storage.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com

# ── Create Service Account ────────────────────────────────────────────────────
echo "Creating service account..."
if gcloud iam service-accounts describe "${SA_EMAIL}" --quiet >/dev/null 2>&1; then
  echo "  (service account already exists, skipping)"
else
  gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
    --display-name="GitHub Actions Frontend Deployer" \
    --description="Used by GitHub Actions to deploy frontend apps to GCS"
  echo "  service account created"
fi

# ── Grant minimal required IAM roles ─────────────────────────────────────────
# These three roles map exactly to what the deploy workflows do:
#   1. gsutil rsync / setmeta        → roles/storage.objectAdmin
#   2. gcloud run services describe  → roles/run.viewer
#   3. gcloud secrets versions access → roles/secretmanager.secretAccessor
echo "Granting IAM roles..."
ROLES=(
  "roles/storage.objectAdmin"              # Upload objects and set metadata on GCS buckets
  "roles/run.viewer"                       # Read Cloud Run service URL (padel-api)
  "roles/secretmanager.secretAccessor"     # Read bucket name and site URL from Secret Manager
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --quiet
  echo "  ${ROLE}"
done

# ── Export service account key ────────────────────────────────────────────────
echo "Exporting service account key..."
gcloud iam service-accounts keys create ./gcp-sa-key.json \
  --iam-account="${SA_EMAIL}"

echo ""
echo "============================================================"
echo "GCP frontend CI/CD setup complete."
echo ""
echo "Next steps:"
echo "  1. Copy the contents of ./gcp-sa-key.json"
echo "  2. Add it as a GitHub Secret named: GCP_SA_FE_KEY"
echo "     GitHub → Settings → Secrets and variables → Actions → New secret"
echo "  3. Add your GCP project ID as a GitHub Secret named: GCP_PROJECT_ID"
echo "  4. Delete the key file from your machine:"
echo "       rm ./gcp-sa-key.json"
echo ""
echo "  Never commit gcp-sa-key.json to version control."
echo "============================================================"
