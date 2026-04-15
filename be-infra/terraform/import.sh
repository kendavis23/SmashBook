#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# import.sh — Import existing GCP resources into Terraform state
#
# Run this ONCE after `terraform init` to bring existing infrastructure
# under Terraform management without destroying and recreating anything.
#
# Usage:
#   chmod +x import.sh
#   ./import.sh
# ---------------------------------------------------------------------------

set -uo pipefail

PROJECT="smashbook-488121"
REGION="europe-west2"

# Import a resource only if it is not already in state.
tf_import() {
  local address="$1"
  local id="$2"
  if terraform state list | grep -qF "$address"; then
    echo "  already in state, skipping: $address"
  else
    terraform import "$address" "$id"
  fi
}

echo "==> Importing Artifact Registry..."
tf_import \
  google_artifact_registry_repository.padel_api \
  "projects/${PROJECT}/locations/${REGION}/repositories/padel-api"

echo "==> Importing Cloud SQL instance..."
tf_import \
  google_sql_database_instance.main \
  "smashbook-staging"

echo "==> Importing Cloud SQL database..."
tf_import \
  google_sql_database.smashbook \
  "projects/smashbook-488121/instances/smashbook-staging/databases/padel_db"

echo "==> Importing Cloud Run services..."
tf_import \
  google_cloud_run_v2_service.api \
  "projects/${PROJECT}/locations/${REGION}/services/padel-api"

tf_import \
  google_cloud_run_v2_service.booking_worker \
  "projects/${PROJECT}/locations/${REGION}/services/padel-booking-worker"

tf_import \
  google_cloud_run_v2_service.payment_worker \
  "projects/${PROJECT}/locations/${REGION}/services/padel-payment-worker"

tf_import \
  google_cloud_run_v2_service.notification_worker \
  "projects/${PROJECT}/locations/${REGION}/services/padel-notification-worker"

echo "==> Importing service accounts..."
tf_import \
  google_service_account.github_actions \
  "projects/${PROJECT}/serviceAccounts/github-actions-deployer@${PROJECT}.iam.gserviceaccount.com"

# Note: The default compute SA cannot be imported as a managed resource.
# The padel-runtime SA will be created fresh — update Cloud Run services
# to use it after import, replacing 607958067144-compute@developer.gserviceaccount.com

echo "==> Importing Secret Manager secrets..."
for SECRET in \
  padel-database-url \
  padel-database-read-replica-url \
  padel-secret-key \
  stripe-secret-key \
  stripe-webhook-secret \
  sendgrid-api-key \
  padel-platform-api-key; do
  tf_import \
    "google_secret_manager_secret.secrets[\"${SECRET}\"]" \
    "projects/${PROJECT}/secrets/${SECRET}"
done

echo ""
echo "==> Import complete. Run 'terraform plan' to check for drift."
echo "    Expected: some annotation/label differences on Cloud Run services."
echo "    These are safe to apply or add to lifecycle.ignore_changes."
