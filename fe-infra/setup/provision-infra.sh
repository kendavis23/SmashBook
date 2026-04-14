#!/usr/bin/env bash
# =============================================================================
# provision-infra.sh
#
# Manages all SmashBook frontend GCP infrastructure via Terraform.
#
# USAGE
#   bash provision-infra.sh [action] [options]
#
# ACTIONS
#   apply        Provision / update all infrastructure (default)
#   plan         Dry-run — show what would change, no GCP calls
#   destroy      Tear down all infrastructure safely (handles DNS zone cleanup)
#
# OPTIONS
#   --dns         Enable full DNS + SSL + HTTPS setup (production). Default.
#   --no-dns      HTTP-only load balancer via static IP (staging). No DNS/SSL.
#   --create-zone Create the Cloud DNS managed zone (first apply only).
#                 Omit on all subsequent runs.
#
# EXAMPLES
#   # Staging — HTTP only, no DNS
#   bash provision-infra.sh apply --no-dns
#
#   # Production first run — create DNS zone + full HTTPS
#   bash provision-infra.sh apply --dns --create-zone
#
#   # Production subsequent runs
#   bash provision-infra.sh apply --dns
#
#   # Preview changes
#   bash provision-infra.sh plan --dns
#
#   # Tear everything down (handles zone cleanup automatically)
#   bash provision-infra.sh destroy
#
# PREREQUISITES
#   - terraform + gcloud installed and in PATH
#   - gcloud auth application-default login
#   - Required TF_VAR_* env vars exported (see check_env below)
# =============================================================================
set -euo pipefail

TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../terraform" && pwd)"
REQUIRED_TOOLS=("terraform" "gcloud")

# ─── Helpers ──────────────────────────────────────────────────────────────────
log()     { echo "[$(date '+%H:%M:%S')] $*"; }
success() { echo "[$(date '+%H:%M:%S')] ✓ $*"; }
die()     { echo "[ERROR] $*" >&2; exit 1; }

# ─── Argument parsing ─────────────────────────────────────────────────────────
ACTION="apply"
DNS_CONFIG="true"
CREATE_ZONE="false"

for arg in "$@"; do
  case "$arg" in
    apply|plan|destroy) ACTION="$arg" ;;
    --dns)              DNS_CONFIG="true" ;;
    --no-dns)           DNS_CONFIG="false" ;;
    --create-zone)      CREATE_ZONE="true" ;;
    --help|-h)
      sed -n '/^# USAGE/,/^# PREREQUISITES/p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) die "Unknown argument: $arg. Run with --help for usage." ;;
  esac
done

export TF_VAR_dns_config="$DNS_CONFIG"
export TF_VAR_create_zone="$CREATE_ZONE"

# ─── Preflight checks ─────────────────────────────────────────────────────────
check_tools() {
  for tool in "${REQUIRED_TOOLS[@]}"; do
    command -v "$tool" &>/dev/null || die "'$tool' is not installed or not in PATH"
  done
}

check_env() {
  : "${TF_VAR_project_id:?Set TF_VAR_project_id}"
  : "${TF_VAR_staff_bucket_name:?Set TF_VAR_staff_bucket_name}"
  : "${TF_VAR_player_bucket_name:?Set TF_VAR_player_bucket_name}"
  if [[ "$DNS_CONFIG" == "true" ]]; then
    : "${TF_VAR_staff_domain:?Set TF_VAR_staff_domain (required when --dns)}"
    : "${TF_VAR_player_domain:?Set TF_VAR_player_domain (required when --dns)}"
    : "${TF_VAR_dns_zone_name:?Set TF_VAR_dns_zone_name (required when --dns)}"
    : "${TF_VAR_dns_zone_dns_name:?Set TF_VAR_dns_zone_dns_name (required when --dns)}"
  else
    # Provide safe defaults so Terraform variables are not unbound
    export TF_VAR_staff_domain="${TF_VAR_staff_domain:-staging.staff.local}"
    export TF_VAR_player_domain="${TF_VAR_player_domain:-staging.player.local}"
    export TF_VAR_dns_zone_name="${TF_VAR_dns_zone_name:-unused-zone}"
    export TF_VAR_dns_zone_dns_name="${TF_VAR_dns_zone_dns_name:-unused.local.}"
  fi
}

# ─── Bootstrap GCS backend for Terraform state (idempotent) ───────────────────
bootstrap_state_bucket() {
  local bucket="tf-state-${TF_VAR_project_id}-frontend"
  if ! gcloud storage buckets describe "gs://${bucket}" &>/dev/null; then
    log "Creating Terraform state bucket: gs://${bucket}"
    gcloud storage buckets create "gs://${bucket}" \
      --project="${TF_VAR_project_id}" \
      --location="${TF_VAR_region:-US}" \
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
    prefix = "frontend/state"
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
    dns.googleapis.com \
    certificatemanager.googleapis.com \
    secretmanager.googleapis.com \
    --project="${TF_VAR_project_id}" \
    --quiet
}

# ─── Terraform init ───────────────────────────────────────────────────────────
tf_init() {
  log "Running: terraform init"
  cd "${TERRAFORM_DIR}"
  terraform init -reconfigure
  terraform validate
}

# ─── Store terraform outputs as GCP secrets ───────────────────────────────────
store_secrets() {
  log "Storing terraform outputs as GCP secrets..."
  cd "${TERRAFORM_DIR}"

  local SECRET_NAMES=(
    "FRONTEND_WEB_STAFF_BUCKET"
    "FRONTEND_WEB_STAFF_SITE_URL"
    "FRONTEND_WEB_PLAYER_BUCKET"
    "FRONTEND_WEB_PLAYER_SITE_URL"
  )
  local SECRET_VALUES=(
    "$(terraform output -raw staff_bucket_name)"
    "$(terraform output -raw staff_frontend_url)"
    "$(terraform output -raw player_bucket_name)"
    "$(terraform output -raw player_frontend_url)"
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
  success "Infrastructure provisioned."
  log ""
  log "  Staff  URL : $(terraform output -raw staff_frontend_url)"
  log "  Player URL : $(terraform output -raw player_frontend_url)"
  log "  Staff  IP  : $(terraform output -raw staff_static_ip_address)"
  log "  Player IP  : $(terraform output -raw player_static_ip_address)"
}

# ─── PLAN ─────────────────────────────────────────────────────────────────────
run_plan() {
  cd "${TERRAFORM_DIR}"
  terraform plan
}

# ─── DESTROY ──────────────────────────────────────────────────────────────────

# Empty a GCS bucket before Terraform tries to delete it.
# Terraform's force_destroy handles buckets with objects only after the resource
# is refreshed — this ensures it for buckets that were created before the flag
# was set to true.
empty_bucket() {
  local bucket="$1"
  if gcloud storage buckets describe "gs://${bucket}" --project="${TF_VAR_project_id}" &>/dev/null; then
    log "  Emptying bucket: gs://${bucket}"
    gcloud storage rm -r "gs://${bucket}/**" --quiet 2>/dev/null || true
  fi
}

# Delete all non-NS/SOA records from the zone, then delete the zone.
# GCP refuses to delete a zone that still has records in it.
purge_dns_zone() {
  local zone_name="$1"
  if ! gcloud dns managed-zones describe "${zone_name}" \
      --project="${TF_VAR_project_id}" &>/dev/null; then
    log "  DNS zone '${zone_name}' not found in GCP — skipping."
    return
  fi

  log "  Purging DNS records from zone '${zone_name}'..."
  local records
  records=$(gcloud dns record-sets list \
    --zone="${zone_name}" \
    --project="${TF_VAR_project_id}" \
    --format="csv[no-heading](name,type,ttl,rrdatas)" 2>/dev/null || true)

  local transaction_started=false
  cd "${TERRAFORM_DIR}"  # gcloud dns transaction writes a file here

  while IFS=',' read -r name type ttl rrdatas; do
    [[ -z "$name" ]] && continue
    # NS and SOA are managed by GCP — skip them
    [[ "$type" == "NS" || "$type" == "SOA" ]] && continue

    if [[ "$transaction_started" == false ]]; then
      gcloud dns record-sets transaction start \
        --zone="${zone_name}" --project="${TF_VAR_project_id}"
      transaction_started=true
    fi

    log "    Removing ${type} ${name}"
    gcloud dns record-sets transaction remove \
      --zone="${zone_name}" \
      --project="${TF_VAR_project_id}" \
      --name="${name}" \
      --type="${type}" \
      --ttl="${ttl}" \
      "${rrdatas}"
  done <<< "$records"

  if [[ "$transaction_started" == true ]]; then
    gcloud dns record-sets transaction execute \
      --zone="${zone_name}" --project="${TF_VAR_project_id}"
    success "  DNS records removed."
  else
    log "  No non-NS/SOA records found."
  fi

  log "  Deleting DNS zone '${zone_name}'..."
  gcloud dns managed-zones delete "${zone_name}" \
    --project="${TF_VAR_project_id}" --quiet
  success "  DNS zone '${zone_name}' deleted."
}

# Remove DNS record set resources from Terraform state.
# If the zone is already gone from GCP, Terraform can't delete the record sets —
# removing them from state lets destroy proceed without errors.
purge_dns_state() {
  cd "${TERRAFORM_DIR}"
  local resources=(
    "module.dns_staff.google_dns_managed_zone.frontend[0]"
    "module.dns_staff.google_dns_record_set.frontend_a[0]"
    "module.dns_staff.google_dns_record_set.www_cname[0]"
    "module.dns_player.google_dns_managed_zone.frontend[0]"
    "module.dns_player.google_dns_record_set.frontend_a[0]"
    "module.dns_player.google_dns_record_set.www_cname[0]"
  )
  for r in "${resources[@]}"; do
    if terraform state list | grep -qF "${r}"; then
      log "  Removing from state: ${r}"
      terraform state rm "${r}"
    fi
  done
}

# Push force_destroy = true to GCS buckets so Terraform can delete them even
# when they contain objects (build artefacts / versioned snapshots).
unlock_buckets() {
  cd "${TERRAFORM_DIR}"
  log "Applying force_destroy to GCS buckets..."
  terraform apply \
    -target=module.storage_staff.google_storage_bucket.frontend \
    -target=module.storage_player.google_storage_bucket.frontend \
    -auto-approve
}

run_destroy() {
  cd "${TERRAFORM_DIR}"

  log "=== Step 1/4: Empty GCS buckets ==="
  empty_bucket "${TF_VAR_staff_bucket_name}"
  empty_bucket "${TF_VAR_player_bucket_name}"

  log "=== Step 2/4: Purge and delete DNS zone ==="
  if [[ "$DNS_CONFIG" == "true" ]]; then
    purge_dns_zone "${TF_VAR_dns_zone_name}"
  else
    log "  dns_config=false — no DNS zone to clean up."
  fi

  log "=== Step 3/4: Sync Terraform state with GCP reality ==="
  purge_dns_state
  unlock_buckets

  log "=== Step 4/4: Terraform destroy ==="
  terraform destroy -auto-approve

  success "All infrastructure destroyed."
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  log "=== SmashBook Frontend Infrastructure — action=${ACTION} dns_config=${DNS_CONFIG} create_zone=${CREATE_ZONE} ==="
  check_tools
  check_env
  bootstrap_state_bucket
  enable_apis
  tf_init

  case "$ACTION" in
    apply)   run_apply ;;
    plan)    run_plan ;;
    destroy) run_destroy ;;
  esac

  log "=== Done ==="
}

main
