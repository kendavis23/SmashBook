#!/usr/bin/env bash
# =============================================================================
# rollback.sh
#
# Rolls back a GCS-hosted frontend app to a previously deployed version.
# Version folders (<sha>/) are preserved in the bucket alongside the bucket
# root, which always serves the active build via Cloudflare CDN.
#
# USAGE
#   bash rollback.sh --bucket <bucket-name> --sha <git-sha>
#
# OPTIONS
#   --bucket       GCS bucket name (e.g. smashbook-staff-frontend)
#   --sha          Full or short Git SHA of the version to roll back to
#   --list         List all available versions in the bucket, then exit
#   --dry-run      Show what would happen without making any changes
#   --cf-zone-id   Cloudflare Zone ID (or set CF_ZONE_ID env var)
#   --cf-token     Cloudflare API token (or set CF_API_TOKEN env var)
#
# EXAMPLES
#   # Roll back staff app to a specific SHA (also purges Cloudflare cache)
#   bash rollback.sh --bucket smashbook-staff-frontend --sha a1b2c3d4 \
#     --cf-zone-id <zone-id> --cf-token <api-token>
#
#   # List all available versions first
#   bash rollback.sh --bucket smashbook-staff-frontend --list
#
#   # Preview the rollback without applying it
#   bash rollback.sh --bucket smashbook-staff-frontend --sha a1b2c3d4 --dry-run
#
# PREREQUISITES
#   - gcloud installed and in PATH
#   - gcloud auth application-default login (or GOOGLE_APPLICATION_CREDENTIALS set)
#   - curl installed and in PATH
#   - The target SHA must exist as a versioned folder in the bucket
# =============================================================================
set -euo pipefail

# ─── Helpers ──────────────────────────────────────────────────────────────────
log()     { echo "[$(date '+%H:%M:%S')] $*"; }
success() { echo "[$(date '+%H:%M:%S')] ✓ $*"; }
die()     { echo "[ERROR] $*" >&2; exit 1; }

# ─── Argument parsing ─────────────────────────────────────────────────────────
BUCKET=""
SHA=""
LIST_ONLY=false
DRY_RUN=false
CF_ZONE_ID="${CF_ZONE_ID:-}"
CF_API_TOKEN="${CF_API_TOKEN:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bucket)      BUCKET="$2";        shift 2 ;;
    --sha)         SHA="$2";           shift 2 ;;
    --list)        LIST_ONLY=true;     shift ;;
    --dry-run)     DRY_RUN=true;       shift ;;
    --cf-zone-id)  CF_ZONE_ID="$2";   shift 2 ;;
    --cf-token)    CF_API_TOKEN="$2"; shift 2 ;;
    --help|-h)
      sed -n '/^# USAGE/,/^# PREREQUISITES/p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) die "Unknown argument: $1. Run with --help for usage." ;;
  esac
done

# ─── Preflight ────────────────────────────────────────────────────────────────
check_tools() {
  command -v gcloud &>/dev/null || die "'gcloud' is not installed or not in PATH"
  command -v gsutil &>/dev/null || die "'gsutil' is not installed or not in PATH"
  command -v curl   &>/dev/null || die "'curl' is not installed or not in PATH"
}

check_args() {
  [[ -n "$BUCKET" ]] || die "--bucket is required. Run with --help for usage."

  if [[ "$LIST_ONLY" == false ]]; then
    [[ -n "$SHA" ]] || die "--sha is required (or pass --list to see available versions)."
  fi
}

check_bucket_exists() {
  gcloud storage buckets describe "gs://${BUCKET}" &>/dev/null \
    || die "Bucket 'gs://${BUCKET}' does not exist or you don't have access to it."
}

# ─── List available versions ──────────────────────────────────────────────────
list_versions() {
  log "Available versions in gs://${BUCKET}/:"
  echo ""
  # Each versioned deployment is stored as a <sha>/ prefix (40-char hex)
  gsutil ls "gs://${BUCKET}/" \
    | grep -E 'gs://[^/]+/[a-f0-9]{6,40}/$' \
    | sed "s|gs://${BUCKET}/||;s|/$||" \
    | sort \
    || echo "  (no versioned snapshots found)"
  echo ""
  log "To roll back: bash rollback.sh --bucket ${BUCKET} --sha <sha-from-above>"
}

# ─── Resolve SHA to the full versioned prefix ────────────────────────────────
resolve_sha() {
  local prefix="gs://${BUCKET}/${SHA}/"

  # Check for an exact match first
  if gsutil ls "${prefix}" &>/dev/null; then
    echo "${prefix}"
    return
  fi

  # Try prefix match for short SHAs
  local matches
  matches=$(gsutil ls "gs://${BUCKET}/" \
    | grep -E "gs://[^/]+/[a-f0-9]{6,40}/$" \
    | grep "gs://${BUCKET}/${SHA}" \
    || true)

  local count
  count=$(echo "$matches" | grep -c . || true)

  if [[ "$count" -eq 0 ]]; then
    die "No version found matching SHA '${SHA}' in gs://${BUCKET}/. Run --list to see available versions."
  elif [[ "$count" -gt 1 ]]; then
    echo "[ERROR] Ambiguous SHA '${SHA}' matches multiple versions:" >&2
    echo "$matches" >&2
    exit 1
  fi

  # Strip trailing newline and return the single match
  echo "$matches" | head -1
}

# ─── Purge Cloudflare cache ───────────────────────────────────────────────────
purge_cloudflare_cache() {
  if [[ -z "$CF_ZONE_ID" || -z "$CF_API_TOKEN" ]]; then
    log "CF_ZONE_ID / CF_API_TOKEN not set — skipping Cloudflare cache purge."
    log "Cloudflare may serve stale content for up to its TTL. Purge manually:"
    log "  curl -X POST https://api.cloudflare.com/client/v4/zones/<zone-id>/purge_cache \\"
    log "    -H 'Authorization: Bearer <token>' \\"
    log "    -H 'Content-Type: application/json' \\"
    log "    --data '{\"purge_everything\":true}'"
    return
  fi

  log "Purging Cloudflare cache..."
  local response
  response=$(curl -s -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}')

  if echo "$response" | grep -q '"success":true'; then
    success "Cloudflare cache purged. Users will receive updated content immediately."
  else
    log "WARNING: Cloudflare cache purge may have failed. Response: ${response}"
  fi
}

# ─── Rollback ────────────────────────────────────────────────────────────────
run_rollback() {
  local versioned_prefix
  versioned_prefix=$(resolve_sha)

  log "Rolling back gs://${BUCKET}/ to: ${versioned_prefix}"

  if [[ "$DRY_RUN" == true ]]; then
    log "[DRY RUN] Would copy: ${versioned_prefix}. → gs://${BUCKET}/"
    log "[DRY RUN] Would set cache headers on assets/** and index.html"
    log "[DRY RUN] Would purge Cloudflare cache"
    log "[DRY RUN] No changes made."
    return
  fi

  log "Promoting versioned build to bucket root..."
  # cp -r preserves version folders — never use rsync -d here
  gsutil -m cp -r "${versioned_prefix}." "gs://${BUCKET}/"

  log "Setting cache headers..."
  gsutil -m setmeta \
    -h "Cache-Control:public,max-age=31536000,immutable" \
    "gs://${BUCKET}/assets/**"
  gsutil setmeta \
    -h "Cache-Control:no-cache,no-store,must-revalidate" \
    "gs://${BUCKET}/index.html"

  success "Rollback complete. Active version: ${SHA}"

  purge_cloudflare_cache
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  check_tools
  check_args
  check_bucket_exists

  if [[ "$LIST_ONLY" == true ]]; then
    list_versions
    exit 0
  fi

  log "=== SmashBook Frontend Rollback — bucket=${BUCKET} sha=${SHA} dry_run=${DRY_RUN} ==="
  run_rollback
  log "=== Done ==="
}

main
