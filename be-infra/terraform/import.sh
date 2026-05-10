#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# import.sh — Import existing GCP resources into Terraform state
#
# Run this ONCE from be-infra/terraform/staging/ after `terraform init`,
# if starting fresh without existing state.
# (If migrating from the old flat layout, use staging/migrate-state.sh instead.)
#
# Usage:
#   cd be-infra/terraform/staging
#   terraform init
#   chmod +x ../import.sh
#   ../import.sh
# ---------------------------------------------------------------------------

set -uo pipefail

PROJECT="smashbook-488121"
REGION="europe-west2"

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
  "module.artifact_registry.google_artifact_registry_repository.padel_api" \
  "projects/${PROJECT}/locations/${REGION}/repositories/padel-api"

echo "==> Importing Cloud SQL..."
tf_import \
  "module.database.google_sql_database_instance.main" \
  "smashbook-staging"
tf_import \
  "module.database.google_sql_database.smashbook" \
  "projects/smashbook-488121/instances/smashbook-staging/databases/padel_db"
tf_import \
  "module.database.google_sql_database_instance.replica" \
  "smashbook-staging-replica"

echo "==> Importing Cloud Run services..."
tf_import \
  "module.cloud_run.google_cloud_run_v2_service.api" \
  "projects/${PROJECT}/locations/${REGION}/services/padel-api"
tf_import \
  "module.cloud_run.google_cloud_run_v2_service.booking_worker" \
  "projects/${PROJECT}/locations/${REGION}/services/padel-booking-worker"
tf_import \
  "module.cloud_run.google_cloud_run_v2_service.payment_worker" \
  "projects/${PROJECT}/locations/${REGION}/services/padel-payment-worker"
tf_import \
  "module.cloud_run.google_cloud_run_v2_service.notification_worker" \
  "projects/${PROJECT}/locations/${REGION}/services/padel-notification-worker"

echo "==> Importing service accounts..."
tf_import \
  "module.iam.google_service_account.github_actions" \
  "projects/${PROJECT}/serviceAccounts/github-actions-deployer@${PROJECT}.iam.gserviceaccount.com"
tf_import \
  "module.iam.google_service_account.compute" \
  "projects/${PROJECT}/serviceAccounts/padel-runtime@${PROJECT}.iam.gserviceaccount.com"

echo "==> Importing Secret Manager secrets..."
for SECRET in \
  padel-database-url \
  padel-database-read-replica-url \
  padel-secret-key \
  stripe-secret-key \
  stripe-publishable-key \
  stripe-webhook-secret \
  sendgrid-api-key \
  padel-platform-api-key; do
  tf_import \
    "module.secrets.google_secret_manager_secret.secrets[\"${SECRET}\"]" \
    "projects/${PROJECT}/secrets/${SECRET}"
done

echo ""
echo "==> Import complete. Run 'terraform plan' to check for drift."
