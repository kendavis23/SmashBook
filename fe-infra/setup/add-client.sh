#!/usr/bin/env bash
# add-client.sh — scaffold a new per-client Terraform workspace
#
# Usage:
#   bash fe-infra/setup/add-client.sh <client-slug> <environment> [staff-domain] [player-domain]
#
# Examples:
#   bash fe-infra/setup/add-client.sh ace staging ace-staging.smashbook.app ace-player-staging.smashbook.app
#   bash fe-infra/setup/add-client.sh beta production beta.smashbook.app beta-player.smashbook.app
#   bash fe-infra/setup/add-client.sh gamma staging "" gamma-player-staging.smashbook.app  # player only

set -euo pipefail

# ─── Args ─────────────────────────────────────────────────────────────────────

CLIENT="${1:-}"
ENV="${2:-}"
STAFF_DOMAIN="${3:-}"
PLAYER_DOMAIN="${4:-}"

if [[ -z "$CLIENT" || -z "$ENV" ]]; then
  echo "Usage: $0 <client-slug> <environment> [staff-domain] [player-domain]"
  echo ""
  echo "  client-slug   Short identifier, e.g. ace, beta, gamma"
  echo "  environment   staging or production"
  echo "  staff-domain  e.g. ace-staging.smashbook.app  (omit to skip staff DNS)"
  echo "  player-domain e.g. ace-player-staging.smashbook.app  (omit to skip player DNS)"
  exit 1
fi

if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "Error: environment must be 'staging' or 'production'"
  exit 1
fi

if [[ -z "$STAFF_DOMAIN" && -z "$PLAYER_DOMAIN" ]]; then
  echo "Error: at least one of staff-domain or player-domain must be provided"
  exit 1
fi

# ─── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TARGET_DIR="$REPO_ROOT/fe-infra/terraform/clients/$ENV/$CLIENT"

if [[ -d "$TARGET_DIR" ]]; then
  echo "Error: $TARGET_DIR already exists. Client '$CLIENT' is already onboarded for $ENV."
  exit 1
fi

# ─── Scaffold ─────────────────────────────────────────────────────────────────

: "${TF_VAR_project_id:?Set TF_VAR_project_id before running this script}"

mkdir -p "$TARGET_DIR"

# backend.tf — full config, no external .tfbackend needed
cat > "$TARGET_DIR/backend.tf" <<EOF
terraform {
  backend "gcs" {
    bucket = "tf-state-${TF_VAR_project_id}-frontend"
    prefix = "$ENV/clients/$CLIENT"
  }
}
EOF

# terraform.tfvars
{
  echo "environment      = \"$ENV\""
  [[ -n "$STAFF_DOMAIN" ]]  && echo "staff_domain     = \"$STAFF_DOMAIN\""
  [[ -n "$PLAYER_DOMAIN" ]] && echo "player_domain    = \"$PLAYER_DOMAIN\""
  echo "tf_state_bucket  = \"tf-state-${TF_VAR_project_id}-frontend\""
  echo "tf_state_prefix  = \"frontend/state\""
} > "$TARGET_DIR/terraform.tfvars"

# main.tf
cat > "$TARGET_DIR/main.tf" <<EOF
module "dns" {
  source = "../../_template"

  environment          = var.environment
  cloudflare_api_token = var.cloudflare_api_token
  cloudflare_zone_id   = var.cloudflare_zone_id
  staff_domain         = var.staff_domain
  player_domain        = var.player_domain
  tf_state_bucket      = var.tf_state_bucket
  tf_state_prefix      = var.tf_state_prefix
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_zone_id" {
  type      = string
  sensitive = true
}

variable "environment" {
  type = string
}

variable "staff_domain" {
  type    = string
  default = ""
}

variable "player_domain" {
  type    = string
  default = ""
}

variable "tf_state_bucket" {
  type = string
}

variable "tf_state_prefix" {
  type    = string
  default = "frontend/state"
}
EOF

echo ""
echo "✓ Scaffolded: $TARGET_DIR"
echo ""
echo "Next steps:"
echo ""
echo "  export TF_VAR_cloudflare_zone_id=\$(gcloud secrets versions access latest --secret=CF_ZONE_ID --project=\$TF_VAR_project_id)"
echo "  export TF_VAR_cloudflare_api_token=\$(gcloud secrets versions access latest --secret=CF_API_TOKEN --project=\$TF_VAR_project_id)"
echo ""
echo "  cd $TARGET_DIR"
echo "  terraform init"
echo "  terraform plan"
echo "  terraform apply"
echo ""
echo "To destroy later:"
echo "  cd $TARGET_DIR && terraform destroy"
echo "  rm -rf $TARGET_DIR  # remove the folder after destroying"
