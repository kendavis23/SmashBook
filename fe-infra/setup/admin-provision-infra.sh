#!/usr/bin/env bash
# =============================================================================
# admin-provision-infra.sh
#
# Manages SmashBook platform admin GCP infrastructure via Terraform.
# This layer provisions the GCS bucket, load balancer, Cloud Armor, and
# Cloudflare Origin SSL certificate for admin.smashbook.app — created once.
#
# No rollback script — use the GitHub Actions workflow to redeploy a specific
# SHA, or re-run with a previous git ref.
#
# USAGE
#   bash admin-provision-infra.sh [action]
#
# ACTIONS
#   apply        Provision / update all infrastructure (default)
#   plan         Dry-run — show what would change, no GCP calls
#   destroy      Tear down all infrastructure safely
#
# EXAMPLES
#   bash admin-provision-infra.sh apply
#   bash admin-provision-infra.sh plan
#   bash admin-provision-infra.sh destroy
#
# PREREQUISITES
#   - terraform + gcloud installed and in PATH
#   - gcloud auth application-default login
#   - Required TF_VAR_* env vars exported (see check_env below)
# =============================================================================
set -euo pipefail

TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../admin-terraform" && pwd)"
REQUIRED_TOOLS=("terraform" "gcloud")

# ─── Helpers ──────────────────────────────────────────────────────────────────
log()     { echo "[$(date '+%H:%M:%S')] $*"; }
success() { echo "[$(date '+%H:%M:%S')] ✓ $*"; }
die()     { echo "[ERROR] $*" >&2; exit 1; }

# ─── Argument parsing ─────────────────────────────────────────────────────────
ACTION="apply"

for arg in "$@"; do
  case "$arg" in
    apply|plan|destroy) ACTION="$arg" ;;
    --help|-h)
      sed -n '/^# USAGE/,/^# PREREQUISITES/p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) die "Unknown argument: $arg. Run with --help for usage." ;;
  esac
done

# ─── Preflight checks ─────────────────────────────────────────────────────────
check_tools() {
  for tool in "${REQUIRED_TOOLS[@]}"; do
    command -v "$tool" &>/dev/null || die "'$tool' is not installed or not in PATH"
  done
}

check_env() {
  : "${TF_VAR_project_id:?Set TF_VAR_project_id}"
  : "${TF_VAR_admin_bucket_name:?Set TF_VAR_admin_bucket_name}"
  : "${TF_VAR_cloudflare_zone_id:?Set TF_VAR_cloudflare_zone_id}"
  : "${TF_VAR_cloudflare_api_token:?Set TF_VAR_cloudflare_api_token}"
  : "${TF_VAR_origin_cert_pem:?Set TF_VAR_origin_cert_pem (fetch from Secret Manager: CERTIFICATE)}"
  : "${TF_VAR_origin_key_pem:?Set TF_VAR_origin_key_pem (fetch from Secret Manager: PRIVATE_KEY)}"
}

# ─── Bootstrap GCS backend for Terraform state (idempotent) ───────────────────
bootstrap_state_bucket() {
  local bucket="tf-state-${TF_VAR_project_id}-admin"
  if ! gcloud storage buckets describe "gs://${bucket}" &>/dev/null; then
    log "Creating Terraform state bucket: gs://${bucket}"
    gcloud storage buckets create "gs://${bucket}" \
      --project="${TF_VAR_project_id}" \
      --location="${TF_VAR_region:-europe-west2}" \
      --uniform-bucket-level-access
    gcloud storage buckets update "gs://${bucket}" --versioning
  else
    log "State bucket already exists: gs://${bucket}"
  fi

  if [[ ! -f "${TERRAFORM_DIR}/backend.tf" ]]; then
    cat > "${TERRAFORM_DIR}/backend.tf" <<EOF
terraform {
  backend "gcs" {
    bucket = "${bucket}"
    prefix = "admin/state"
  }
}
EOF
    log "Wrote ${TERRAFORM_DIR}/backend.tf"
  fi
}

# ─── Enable required GCP APIs ─────────────────────────────────────────────────
enable_apis() {
  log "Enabling required GCP APIs..."
  gcloud services enable \
    storage.googleapis.com \
    compute.googleapis.com \
    secretmanager.googleapis.com \
    --project="${TF_VAR_project_id}" \
    --quiet
}

# ─── Terraform init ───────────────────────────────────────────────────────────
tf_init() {
  log "Running: terraform init"
  cd "${TERRAFORM_DIR}"
  terraform init -upgrade -reconfigure
  terraform validate
}

# ─── Import pre-existing resources that may have been created outside Terraform ─
import_existing() {
  cd "${TERRAFORM_DIR}"

  # Cloud Armor policy — shared resource, created once; may already exist if a
  # previous apply partially succeeded before state was initialised.
  local armor_tf_addr="module.armor.google_compute_security_policy.cloudflare_only"
  local armor_gcp_id="projects/${TF_VAR_project_id}/global/securityPolicies/cloudflare-only"

  if terraform state show "${armor_tf_addr}" &>/dev/null; then
    log "Cloud Armor policy already in state — skipping import."
  elif gcloud compute security-policies describe cloudflare-only \
        --project="${TF_VAR_project_id}" --global &>/dev/null 2>&1; then
    log "Cloud Armor policy exists in GCP but not in state — importing..."
    terraform import "${armor_tf_addr}" "${armor_gcp_id}"
    success "Imported Cloud Armor policy."
  else
    log "Cloud Armor policy not found in GCP — will be created by apply."
  fi
}

# ─── Store terraform outputs as GCP secrets ───────────────────────────────────
store_secrets() {
  log "Storing terraform outputs as GCP secrets..."
  cd "${TERRAFORM_DIR}"

  local SECRET_NAMES=(
    "FRONTEND_ADMIN_BUCKET"
    "FRONTEND_ADMIN_SITE_URL"
  )
  local SECRET_VALUES=(
    "$(terraform output -raw admin_bucket_name)"
    "https://admin.smashbook.app"
  )

  for i in "${!SECRET_NAMES[@]}"; do
    local name="${SECRET_NAMES[$i]}"
    local value="${SECRET_VALUES[$i]}"
    if gcloud secrets describe "${name}" --project="${TF_VAR_project_id}" &>/dev/null; then
      echo -n "${value}" | gcloud secrets versions add "${name}" \
        --data-file=- --project="${TF_VAR_project_id}"
      log "  Updated secret: ${name}"
    else
      echo -n "${value}" | gcloud secrets create "${name}" \
        --data-file=- --project="${TF_VAR_project_id}" \
        --replication-policy="automatic"
      log "  Created secret: ${name}"
    fi
  done
  success "Secrets stored in Secret Manager."
}

# ─── APPLY ────────────────────────────────────────────────────────────────────
run_apply() {
  cd "${TERRAFORM_DIR}"
  log "Planning..."
  terraform plan -out=tfplan
  log "Applying..."
  terraform apply tfplan
  rm -f tfplan
  store_secrets
  success "Admin infrastructure provisioned."
  log ""
  log "  Admin IP : $(terraform output -raw admin_static_ip_address)"
  log ""
  log "Next: Cloudflare DNS A record for admin.smashbook.app is managed by Terraform (proxied)."
}

# ─── PLAN ─────────────────────────────────────────────────────────────────────
run_plan() {
  cd "${TERRAFORM_DIR}"
  terraform plan
}

# ─── DESTROY ──────────────────────────────────────────────────────────────────
empty_bucket() {
  local bucket="$1"
  if gcloud storage buckets describe "gs://${bucket}" --project="${TF_VAR_project_id}" &>/dev/null; then
    log "  Emptying bucket: gs://${bucket}"
    gcloud storage rm -r "gs://${bucket}/**" --quiet 2>/dev/null || true
  fi
}

unlock_bucket() {
  cd "${TERRAFORM_DIR}"
  log "Applying force_destroy to GCS bucket..."
  terraform apply \
    -target=module.storage_admin.google_storage_bucket.frontend \
    -auto-approve
}

run_destroy() {
  cd "${TERRAFORM_DIR}"

  log "=== Step 1/3: Empty GCS bucket ==="
  empty_bucket "${TF_VAR_admin_bucket_name}"

  log "=== Step 2/3: Unlock bucket for Terraform destroy ==="
  unlock_bucket

  log "=== Step 3/3: Terraform destroy ==="
  terraform destroy -auto-approve

  success "Admin GCP infrastructure destroyed."
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  log "=== SmashBook Admin Infrastructure — action=${ACTION} ==="
  check_tools
  check_env
  bootstrap_state_bucket
  enable_apis
  tf_init
  import_existing

  case "$ACTION" in
    apply)   run_apply ;;
    plan)    run_plan ;;
    destroy) run_destroy ;;
  esac

  log "=== Done ==="
}

main
