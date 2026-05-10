#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# fix-state.sh — Finish the flat → module state migration.
#
# Run from be-infra/terraform/staging/ after terraform init.
#
# Logic per resource:
#   flat exists + module exists → rm the flat (import already handled it)
#   flat exists + module missing → mv flat to module
#   flat missing               → skip (nothing to do)
# ---------------------------------------------------------------------------

set -euo pipefail

in_state() { terraform state list 2>/dev/null | grep -qxF "$1"; }

fix() {
  local flat="$1" module="$2"
  if ! in_state "$flat"; then
    echo "  skip: $flat"
    return
  fi
  if in_state "$module"; then
    echo "  rm  (duplicate — module already imported): $flat"
    terraform state rm "$flat"
  else
    echo "  mv: $flat → $module"
    terraform state mv "$flat" "$module"
  fi
}

echo "==> service accounts"
fix 'google_service_account.compute'        'module.iam.google_service_account.compute'
fix 'google_service_account.github_actions' 'module.iam.google_service_account.github_actions'

echo ""
echo "==> artifact registry"
fix 'google_artifact_registry_repository.padel_api' \
    'module.artifact_registry.google_artifact_registry_repository.padel_api'
fix 'google_artifact_registry_repository_iam_member.github_actions_push' \
    'module.iam.google_artifact_registry_repository_iam_member.github_actions_push'

echo ""
echo "==> project IAM — compute roles"
for ROLE in "roles/cloudsql.client" "roles/pubsub.publisher" "roles/pubsub.subscriber" "roles/secretmanager.secretAccessor"; do
  fix "google_project_iam_member.compute_roles[\"${ROLE}\"]" \
      "module.iam.google_project_iam_member.compute_roles[\"${ROLE}\"]"
done

echo ""
echo "==> project IAM — github actions roles"
for ROLE in "roles/run.admin" "roles/artifactregistry.writer" "roles/cloudsql.client" "roles/secretmanager.viewer" "roles/iam.serviceAccountUser"; do
  fix "google_project_iam_member.github_actions_roles[\"${ROLE}\"]" \
      "module.iam.google_project_iam_member.github_actions_roles[\"${ROLE}\"]"
done

echo ""
echo "==> cloud sql"
fix 'google_sql_database_instance.main'    'module.database.google_sql_database_instance.main'
fix 'google_sql_database.smashbook'        'module.database.google_sql_database.smashbook'
fix 'google_sql_database_instance.replica' 'module.database.google_sql_database_instance.replica'

echo ""
echo "==> cloud run services"
fix 'google_cloud_run_v2_service.api'               'module.cloud_run.google_cloud_run_v2_service.api'
fix 'google_cloud_run_v2_service.booking_worker'    'module.cloud_run.google_cloud_run_v2_service.booking_worker'
fix 'google_cloud_run_v2_service.payment_worker'    'module.cloud_run.google_cloud_run_v2_service.payment_worker'
fix 'google_cloud_run_v2_service.notification_worker' 'module.cloud_run.google_cloud_run_v2_service.notification_worker'
fix 'google_cloud_run_v2_service_iam_member.api_public' \
    'module.cloud_run.google_cloud_run_v2_service_iam_member.api_public'

echo ""
echo "==> pubsub topics"
for TOPIC in "booking-events" "payment-events" "notification-events"; do
  fix "google_pubsub_topic.topics[\"${TOPIC}\"]" \
      "module.pubsub.google_pubsub_topic.topics[\"${TOPIC}\"]"
done

echo ""
echo "==> pubsub subscriptions"
fix 'google_pubsub_subscription.booking_events'     'module.pubsub.google_pubsub_subscription.booking_events'
fix 'google_pubsub_subscription.payment_events'     'module.pubsub.google_pubsub_subscription.payment_events'
fix 'google_pubsub_subscription.notification_events' 'module.pubsub.google_pubsub_subscription.notification_events'

echo ""
echo "==> pubsub cloud run iam members"
fix 'google_cloud_run_v2_service_iam_member.pubsub_invoke_booking' \
    'module.pubsub.google_cloud_run_v2_service_iam_member.pubsub_invoke_booking'
fix 'google_cloud_run_v2_service_iam_member.pubsub_invoke_payment' \
    'module.pubsub.google_cloud_run_v2_service_iam_member.pubsub_invoke_payment'
fix 'google_cloud_run_v2_service_iam_member.pubsub_invoke_notification' \
    'module.pubsub.google_cloud_run_v2_service_iam_member.pubsub_invoke_notification'

echo ""
echo "==> secrets + iam"
for SECRET in "padel-database-url" "padel-database-read-replica-url" "padel-secret-key" \
              "stripe-secret-key" "stripe-publishable-key" "stripe-webhook-secret" \
              "sendgrid-api-key" "padel-platform-api-key"; do
  fix "google_secret_manager_secret.secrets[\"${SECRET}\"]" \
      "module.secrets.google_secret_manager_secret.secrets[\"${SECRET}\"]"
  fix "google_secret_manager_secret_iam_member.compute_access[\"${SECRET}\"]" \
      "module.secrets.google_secret_manager_secret_iam_member.compute_access[\"${SECRET}\"]"
done

echo ""
echo "==> storage buckets + iam"
fix 'google_storage_bucket.media'      'module.storage.google_storage_bucket.media'
fix 'google_storage_bucket.exports'    'module.storage.google_storage_bucket.exports'
fix 'google_storage_bucket.ai_archive' 'module.storage.google_storage_bucket.ai_archive'
fix 'google_storage_bucket_iam_member.runtime_media'     'module.storage.google_storage_bucket_iam_member.runtime_media'
fix 'google_storage_bucket_iam_member.runtime_exports'   'module.storage.google_storage_bucket_iam_member.runtime_exports'
fix 'google_storage_bucket_iam_member.runtime_ai_archive' 'module.storage.google_storage_bucket_iam_member.runtime_ai_archive'

echo ""
echo "==> done. Run 'terraform plan' to verify."
