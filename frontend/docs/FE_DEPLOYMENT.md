_Last updated: 2026-05-02 21:30 UTC_

# Frontend Deployment

## Infrastructure Architecture

```
Internet
  │
  └─ <subdomain>.smashbook.app ──▶ Cloudflare (DNS + Proxy + CDN + SSL)
                                        ↓
                                 GCP Load Balancer (Cloud Armor — Cloudflare IPs only)
                                        ↓
                                 GCS Bucket (app build)
```

**Cloud CDN is NOT used.** Cloudflare handles all CDN. Cloud Armor enforces that only Cloudflare edge IPs can reach the origin — direct LB IP access returns 403.

SSL is always enabled. All environments use HTTPS with a Cloudflare Origin Certificate (Full Strict mode).

---

## Two Independent Terraform Layers

```
fe-infra/terraform/
  main.tf / variables.tf / outputs.tf / backend.tf  # Layer 1 — GCP (created once)
  modules/
    storage/          # GCS bucket
    networking/       # Static IP, HTTPS proxies, forwarding rules
    origin_ssl/       # Cloudflare Origin Certificate (GCP SSL resource)
    cloudflare_dns/   # Proxied A record
    armor/            # Cloud Armor — Cloudflare IP allowlist
    cdn/              # Backend bucket + URL maps
    secret_manager/   # GCP Secret Manager secrets
  clients/
    staging/          # Layer 2 — Cloudflare DNS records (staging)
    production/       # Layer 2 — Cloudflare DNS records (production)
```

**Layer 1 (GCP)** is created once and never touched when adding clients.
**Layer 2 (clients/)** is the only thing that changes when onboarding a client. Staging and production follow the same structure.

---

## Domain Convention

| Environment | Staff subdomain              | Player subdomain                  |
| ----------- | ---------------------------- | --------------------------------- |
| Staging     | `<slug>-staging.smashbook.app` | `<slug>-player-staging.smashbook.app` |
| Production  | `<slug>.smashbook.app`        | `<slug>-player.smashbook.app`     |

A client is onboarded to staging first, then promoted to production under the same slug without the `-staging` suffix.

---

## GCP Project Setup (One-time)

```bash
bash fe-infra/setup/create-ci-service-account.sh <PROJECT_ID>
```

This script (idempotent):
1. Enables required GCP APIs: `storage`, `run`, `secretmanager`
2. Creates the `gh-actions-fe-deployer` service account with:
   - `roles/storage.objectAdmin` — deploy builds to GCS
   - `roles/run.viewer` — read `padel-api` Cloud Run URL
   - `roles/secretmanager.secretAccessor` — read secrets at deploy time
3. Exports a key to `./gcp-sa-key.json`

Then add two GitHub secrets:

| Secret           | Value                             |
| ---------------- | --------------------------------- |
| `GCP_SA_FE_KEY`  | Contents of `gcp-sa-key.json`     |
| `GCP_PROJECT_ID` | GCP project ID (e.g. `smashbook-XXXXXX`) |

Delete the key file immediately after:
```bash
rm ./gcp-sa-key.json
```

---

## Cloudflare One-Time Manual Setup

### 1. Create API Token

Cloudflare Dashboard → Profile → API Tokens → Create Token → **Edit Zone DNS** template.

Permissions:
```
Zone → DNS → Edit
Zone → Cache Purge → Purge
Zone → Zone Settings → Edit
```
Scope: `Zone → smashbook.app`

### 2. Get Zone ID

Cloudflare → `smashbook.app` → Overview → Zone ID

Store both in GCP Secret Manager:
```bash
echo -n "<CF_ZONE_ID>" | gcloud secrets create CF_ZONE_ID \
  --data-file=- --project=<PROJECT_ID> --replication-policy=automatic

echo -n "<CF_API_TOKEN>" | gcloud secrets create CF_API_TOKEN \
  --data-file=- --project=<PROJECT_ID> --replication-policy=automatic
```

### 3. Create Origin Certificate

Cloudflare → `smashbook.app` → SSL/TLS → Origin Server → Create Certificate

Hostnames:
```
smashbook.app
*.smashbook.app
```

Validity: 15 years. The wildcard covers all client subdomains — no new cert per client.

Store in GCP Secret Manager:
```bash
echo -n "<CERT_PEM>" | gcloud secrets create CERTIFICATE \
  --data-file=- --project=<PROJECT_ID> --replication-policy=automatic

echo -n "<KEY_PEM>" | gcloud secrets create PRIVATE_KEY \
  --data-file=- --project=<PROJECT_ID> --replication-policy=automatic
```

### 4. Set SSL Mode

Cloudflare → `smashbook.app` → SSL/TLS → Overview → **Full (Strict)**

---

## Layer 1 — Provision GCP Infrastructure

Run once per environment. Never re-run when adding clients.

```bash
export TF_VAR_project_id=<PROJECT_ID>
export TF_VAR_staff_bucket_name=smashbook-staff-frontend
export TF_VAR_player_bucket_name=smashbook-player-frontend

# Optional — override the site URLs stored as GCP secrets (default: staff/player.smashbook.app)
export TF_VAR_staff_site_url=https://ace-staging.smashbook.app
export TF_VAR_player_site_url=https://ace-player-staging.smashbook.app

export TF_VAR_cloudflare_zone_id=$(gcloud secrets versions access latest \
  --secret=CF_ZONE_ID --project=$TF_VAR_project_id)
export TF_VAR_cloudflare_api_token=$(gcloud secrets versions access latest \
  --secret=CF_API_TOKEN --project=$TF_VAR_project_id)
export TF_VAR_origin_cert_pem=$(gcloud secrets versions access latest \
  --secret=CERTIFICATE --project=$TF_VAR_project_id)
export TF_VAR_origin_key_pem=$(gcloud secrets versions access latest \
  --secret=PRIVATE_KEY --project=$TF_VAR_project_id)

bash fe-infra/setup/provision-infra.sh apply   # apply
bash fe-infra/setup/provision-infra.sh plan    # dry-run
bash fe-infra/setup/provision-infra.sh destroy # tear down
```

> **Note:** `destroy` does not remove Secret Manager secrets. Delete manually if needed:
> ```bash
> for s in FRONTEND_WEB_STAFF_BUCKET FRONTEND_WEB_STAFF_SITE_URL \
>           FRONTEND_WEB_PLAYER_BUCKET FRONTEND_WEB_PLAYER_SITE_URL; do
>   gcloud secrets delete "$s" --project=$TF_VAR_project_id
> done
> ```

---

## Layer 2 — Client DNS

Each client gets its own folder under `clients/<env>/<slug>/` with isolated GCS state. Adding, updating, or removing one client never affects any other.

### Directory structure

```
fe-infra/terraform/clients/
  _template/         ← shared module — never apply directly
  staging/
    ace/             ← ace-staging.smashbook.app
  production/
    staff/           ← staff.smashbook.app
    player/          ← player.smashbook.app
    ace/             ← ace.smashbook.app  (after go-live)
```

### Onboard a client

**Step 1 — Export required variable**

```bash
export TF_VAR_project_id=<PROJECT_ID>
```

**Step 2 — Run the script** (from repo root)

```bash
bash fe-infra/setup/add-client.sh <slug> <environment> [staff-domain] [player-domain]
```

Examples:
```bash
# Both portals — staging
bash fe-infra/setup/add-client.sh ace staging ace-staging.smashbook.app ace-player-staging.smashbook.app

# Both portals — production (after client goes live)
bash fe-infra/setup/add-client.sh ace production ace.smashbook.app ace-player.smashbook.app

# Staff portal only
bash fe-infra/setup/add-client.sh beta production beta.smashbook.app

# Player portal only
bash fe-infra/setup/add-client.sh gamma staging "" gamma-player-staging.smashbook.app
```

**Step 3 — Go to the generated folder**

```bash
cd fe-infra/terraform/clients/<env>/<slug>
```

**Step 4 — Export Cloudflare credentials**

```bash
export TF_VAR_cloudflare_zone_id=$(gcloud secrets versions access latest \
  --secret=CF_ZONE_ID --project=$TF_VAR_project_id)

export TF_VAR_cloudflare_api_token=$(gcloud secrets versions access latest \
  --secret=CF_API_TOKEN --project=$TF_VAR_project_id)
```

**Step 5 — Apply**

```bash
terraform init
terraform plan
terraform apply
```

**Step 6 — Commit the generated folder**

```bash
git add fe-infra/terraform/clients/<env>/<slug>
git commit -m "chore(infra): onboard <slug> to <env>"
```

### Update a client (e.g. add player portal later)

```bash
cd fe-infra/terraform/clients/<env>/<slug>
# edit terraform.tfvars — add player_domain line
terraform apply
```

### Offboard a client

```bash
export TF_VAR_project_id=<PROJECT_ID>
export TF_VAR_cloudflare_zone_id=$(gcloud secrets versions access latest --secret=CF_ZONE_ID --project=$TF_VAR_project_id)
export TF_VAR_cloudflare_api_token=$(gcloud secrets versions access latest --secret=CF_API_TOKEN --project=$TF_VAR_project_id)

cd fe-infra/terraform/clients/<env>/<slug>
terraform init
terraform destroy

cd -
rm -rf fe-infra/terraform/clients/<env>/<slug>
git add -A && git commit -m "chore(infra): offboard <slug> from <env>"
```

---

## CI/CD Pipelines

Two workflows — one per app (`web-staff`, `web-player`). No cross-triggering.

### Trigger rules

| Changed path                                                     | web-staff | web-player |
| ---------------------------------------------------------------- | --------- | ---------- |
| `apps/web-staff/**`                                              | ✓         |            |
| `apps/web-player/**`                                             |           | ✓          |
| `packages/staff-domain/**`                                       | ✓         |            |
| `packages/player-domain/**`                                      |           | ✓          |
| `packages/api-client/modules/staff/**`                           | ✓         |            |
| `packages/api-client/modules/player/**`                          |           | ✓          |
| `packages/api-client/modules/share/**`                           | ✓         | ✓          |
| `packages/{auth,ui,design-system,config,shared,i18n,testing}/**` | ✓         | ✓          |

### Pipeline stages

```
secrets → lint → test → build → deploy → smoke
```

| Stage   | Detail |
| ------- | ------ |
| secrets | Auth to GCP, fetch `VITE_API_BASE_URL` from Cloud Run + bucket/CF credentials from Secret Manager |
| lint    | `pnpm --filter @repo/<app> lint` |
| test    | `pnpm --filter @repo/<app> test` |
| build   | `pnpm --filter @repo/<app> build` with `VITE_API_BASE_URL` + `VITE_APP_ENV` injected |
| deploy  | Upload versioned build to `gs://<bucket>/<sha>/`, promote to bucket root, set cache headers, purge Cloudflare cache |
| smoke   | HTTP 200 + `<!doctype html` check with 10 retries |

### Smoke test URL

The smoke test URL is derived from the workflow inputs — no Secret Manager entry needed:

```
<slug> + staging   → https://<slug>-staging.smashbook.app
<slug> + production → https://<slug>.smashbook.app
```

---

## Build & Deploy Strategy

### Versioned deployments

Every deploy is stored under the full Git SHA before being promoted to serve live traffic:

```
gs://<bucket>/
  <sha1>/        ← versioned snapshot (preserved for rollback)
    index.html
    assets/
  index.html     ← active (bucket root — served via Cloudflare)
  assets/
```

Deploy steps:
1. Upload build to `gs://<bucket>/<sha>/`
2. Copy to bucket root (promotion — version folders are never deleted)
3. Set cache headers
4. Purge Cloudflare cache

### Cache headers

| Path              | `Cache-Control`                       |
| ----------------- | ------------------------------------- |
| `assets/**`       | `public, max-age=31536000, immutable` |
| `index.html`      | `no-cache, no-store, must-revalidate` |

### SPA routing

GCS `not_found_page` is set to `index.html` — handles client-side routing.

---

## Rollback

```bash
# List available versions
bash fe-infra/setup/rollback.sh --bucket <bucket-name> --list

# Dry-run
bash fe-infra/setup/rollback.sh --bucket <bucket-name> --sha <git-sha> --dry-run

# Apply rollback + purge Cloudflare cache
bash fe-infra/setup/rollback.sh --bucket <bucket-name> --sha <git-sha> \
  --cf-zone-id <CF_ZONE_ID> --cf-token <CF_API_TOKEN>
```

Short SHAs are supported. No rebuild required — rollback takes seconds.

---

## Environment Variables

All env vars are Zod-validated at app startup in `packages/config/env.ts`.

| Variable            | Required | Source in CI |
| ------------------- | -------- | ------------ |
| `VITE_API_BASE_URL` | Yes      | Fetched from Cloud Run (`padel-api` service URL) |
| `VITE_APP_ENV`      | Yes      | `staging` (auto) or `production` (manual dispatch) |

`VITE_APP_ENV` accepts: `development`, `staging`, `production`.

---

## Secrets Reference

### GitHub Secrets

| Secret           | Value |
| ---------------- | ----- |
| `GCP_SA_FE_KEY`  | JSON key from `create-ci-service-account.sh` |
| `GCP_PROJECT_ID` | GCP project ID |

### GCP Secret Manager

| Secret                         | Used for |
| ------------------------------ | -------- |
| `FRONTEND_WEB_STAFF_BUCKET`    | staff deploy — GCS bucket name |
| `FRONTEND_WEB_PLAYER_BUCKET`   | player deploy — GCS bucket name |
| `CF_ZONE_ID`                   | Cloudflare cache purge (all workflows) |
| `CF_API_TOKEN`                 | Cloudflare cache purge (all workflows) |
| `CERTIFICATE`                  | Cloudflare Origin Certificate PEM |
| `PRIVATE_KEY`                  | Cloudflare Origin Certificate key PEM |

`VITE_API_BASE_URL` is fetched directly from the `padel-api` Cloud Run service URL — not stored as a secret.

---

## Website Deployment

The marketing website (`smashbook.app`) uses the same architecture but has its own isolated Terraform root — no client-layer separation.

```
fe-infra/website-terraform/
  main.tf / variables.tf / outputs.tf / backend.tf
```

```bash
export TF_VAR_project_id=<PROJECT_ID>
export TF_VAR_website_bucket_name=smashbook-website-frontend
export TF_VAR_website_domain=smashbook.app

export TF_VAR_cloudflare_zone_id=$(gcloud secrets versions access latest \
  --secret=CF_ZONE_ID --project=$TF_VAR_project_id)
export TF_VAR_cloudflare_api_token=$(gcloud secrets versions access latest \
  --secret=CF_API_TOKEN --project=$TF_VAR_project_id)
export TF_VAR_origin_cert_pem=$(gcloud secrets versions access latest \
  --secret=CERTIFICATE --project=$TF_VAR_project_id)
export TF_VAR_origin_key_pem=$(gcloud secrets versions access latest \
  --secret=PRIVATE_KEY --project=$TF_VAR_project_id)

bash fe-infra/setup/website-provision-infra.sh apply
```

CI/CD pipeline: `secrets → build → deploy → smoke` (no lint/test — website has no domain logic).

To roll back: trigger `workflow_dispatch` on `deploy-frontend-website` with a known-good SHA.

### GCP Secrets

| Secret                      | Used for |
| --------------------------- | -------- |
| `FRONTEND_WEBSITE_BUCKET`   | deploy — GCS bucket name |
| `FRONTEND_WEBSITE_SITE_URL` | smoke test — `https://smashbook.app` |

---

## Package Names (Turborepo filter)

| App          | Package name       |
| ------------ | ------------------ |
| `web-staff`  | `@repo/web-staff`  |
| `web-player` | `@repo/web-player` |
| `website`    | `@repo/website`    |
