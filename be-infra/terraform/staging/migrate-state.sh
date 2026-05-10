#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# migrate-state.sh — Move flat resource addresses to module addresses
#
# Run ONCE from be-infra/terraform/staging/ after `terraform init`.
# The existing state file (prefix "staging" in GCS) contains flat addresses
# from the old root-level layout. This script renames them to module addresses
# so Terraform sees the same resources and plans zero changes.
#
# Usage:
#   cd be-infra/terraform/staging
#   terraform init
#   chmod +x migrate-state.sh
#   ./migrate-state.sh
#   terraform plan   # should show no changes if migration succeeded
# ---------------------------------------------------------------------------

set -euo pipefail

sv() {
  local src="$1"
  local dst="$2"
  if terraform state list 2>/dev/null | grep -qF "$src"; then
    echo "  mv: $src → $dst"
    terraform state mv "$src" "$dst"
  else
    echo "  skip (not in state): $src"
  fi
}

echo "==> artifact_registry module"
sv \
  "google_artifact_registry_repository.padel_api" \
  "module.artifact_registry.google_artifact_registry_repository.padel_api"

echo ""
echo "==> iam module — service accounts"
sv \
  "google_service_account.compute" \
  "module.iam.google_service_account.compute"
sv \
  "google_service_account.github_actions" \
  "module.iam.google_service_account.github_actions"

echo ""
echo "==> iam module — GitHub Actions project roles"
for ROLE in \
  "roles/run.admin" \
  "roles/artifactregistry.writer" \
  "roles/cloudsql.client" \
  "roles/secretmanager.viewer" \
  "roles/iam.serviceAccountUser"; do
  sv \
    "google_project_iam_member.github_actions_roles[\"${ROLE}\"]" \
    "module.iam.google_project_iam_member.github_actions_roles[\"${ROLE}\"]"
done

echo ""
echo "==> iam module — compute project roles"
for ROLE in \
  "roles/cloudsql.client" \
  "roles/secretmanager.secretAccessor" \
  "roles/pubsub.publisher" \
  "roles/pubsub.subscriber"; do
  sv \
    "google_project_iam_member.compute_roles[\"${ROLE}\"]" \
    "module.iam.google_project_iam_member.compute_roles[\"${ROLE}\"]"
done

echo ""
echo "==> iam module — Artifact Registry push access"
sv \
  "google_artifact_registry_repository_iam_member.github_actions_push" \
  "module.iam.google_artifact_registry_repository_iam_member.github_actions_push"

echo ""
echo "==> secrets module"
for SECRET in \
  "padel-database-url" \
  "padel-database-read-replica-url" \
  "padel-secret-key" \
  "stripe-secret-key" \
  "stripe-publishable-key" \
  "stripe-webhook-secret" \
  "sendgrid-api-key" \
  "padel-platform-api-key"; do
  sv \
    "google_secret_manager_secret.secrets[\"${SECRET}\"]" \
    "module.secrets.google_secret_manager_secret.secrets[\"${SECRET}\"]"
  sv \
    "google_secret_manager_secret_iam_member.compute_access[\"${SECRET}\"]" \
    "module.secrets.google_secret_manager_secret_iam_member.compute_access[\"${SECRET}\"]"
done

echo ""
echo "==> database module"
sv \
  "google_sql_database_instance.main" \
  "module.database.google_sql_database_instance.main"
sv \
  "google_sql_database.smashbook" \
  "module.database.google_sql_database.smashbook"
sv \
  "google_sql_database_instance.replica" \
  "module.database.google_sql_database_instance.replica"

echo ""
echo "==> cloud_run module"
for SVC in api booking_worker payment_worker notification_worker; do
  sv \
    "google_cloud_run_v2_service.${SVC}" \
    "module.cloud_run.google_cloud_run_v2_service.${SVC}"
done
sv \
  "google_cloud_run_v2_service_iam_member.api_public" \
  "module.cloud_run.google_cloud_run_v2_service_iam_member.api_public"

echo ""
echo "==> pubsub module — topics"
for TOPIC in "booking-events" "payment-events" "notification-events"; do
  sv \
    "google_pubsub_topic.topics[\"${TOPIC}\"]" \
    "module.pubsub.google_pubsub_topic.topics[\"${TOPIC}\"]"
done

echo ""
echo "==> pubsub module — subscriptions"
sv \
  "google_pubsub_subscription.booking_events" \
  "module.pubsub.google_pubsub_subscription.booking_events"
sv \
  "google_pubsub_subscription.payment_events" \
  "module.pubsub.google_pubsub_subscription.payment_events"
sv \
  "google_pubsub_subscription.notification_events" \
  "module.pubsub.google_pubsub_subscription.notification_events"

echo ""
echo "==> pubsub module — Cloud Run IAM invoke bindings"
sv \
  "google_cloud_run_v2_service_iam_member.pubsub_invoke_booking" \
  "module.pubsub.google_cloud_run_v2_service_iam_member.pubsub_invoke_booking"
sv \
  "google_cloud_run_v2_service_iam_member.pubsub_invoke_payment" \
  "module.pubsub.google_cloud_run_v2_service_iam_member.pubsub_invoke_payment"
sv \
  "google_cloud_run_v2_service_iam_member.pubsub_invoke_notification" \
  "module.pubsub.google_cloud_run_v2_service_iam_member.pubsub_invoke_notification"

echo ""
echo "==> storage module"
sv "google_storage_bucket.media"    "module.storage.google_storage_bucket.media"
sv "google_storage_bucket.exports"  "module.storage.google_storage_bucket.exports"
sv "google_storage_bucket.ai_archive" "module.storage.google_storage_bucket.ai_archive"
sv "google_storage_bucket_iam_member.runtime_media"     "module.storage.google_storage_bucket_iam_member.runtime_media"
sv "google_storage_bucket_iam_member.runtime_exports"   "module.storage.google_storage_bucket_iam_member.runtime_exports"
sv "google_storage_bucket_iam_member.runtime_ai_archive" "module.storage.google_storage_bucket_iam_member.runtime_ai_archive"

echo ""
echo "==> Migration complete."
echo "    Run 'terraform plan' — it should report no changes."
echo "    Once confirmed, delete the old flat .tf files in be-infra/terraform/*.tf"
