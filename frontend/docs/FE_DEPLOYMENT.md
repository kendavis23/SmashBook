_Last updated: 2026-05-02 16:00 UTC_

# Frontend Deployment

## Infrastructure Architecture

```
Internet
  │
  ├─ staff.smashbook.app ──▶ Cloudflare (DNS + Proxy + CDN + SSL)
  │                              ↓
  │                       GCP Load Balancer (Cloud Armor — Cloudflare IPs only)
  │                              ↓
  │                       GCS Bucket (web-staff build)
  │
  └─ app.smashbook.app   ──▶ Cloudflare (DNS + Proxy + CDN + SSL)
                                 ↓
                          GCP Load Balancer (Cloud Armor — Cloudflare IPs only)
                                 ↓
                          GCS Bucket (web-player build)
```

**Cloud CDN is NOT used.** Cloudflare handles all CDN responsibilities. GCP Cloud Armor enforces that only Cloudflare edge IPs can reach the origin load balancer.

SSL is always enabled in every environment. Both staging and production use HTTPS with a Cloudflare Origin Certificate (Full Strict mode). There is no HTTP-only path.

---

## Two Independent Terraform Layers

GCP infrastructure and Cloudflare DNS are managed in **separate Terraform roots**. This is the critical design decision that allows adding new client subdomains without touching GCP.

```
fe-infra/terraform/
  main.tf / variables.tf / outputs.tf / backend.tf  # Layer 1 — GCP (created once per env)
  modules/
    storage/          # GCS bucket + public IAM
    networking/       # Static IP, HTTPS/HTTP proxies, forwarding rules
    origin_ssl/       # Cloudflare Origin Certificate (GCP SSL resource)
    cloudflare_dns/   # Single proxied A record — used by clients layer
    armor/            # Cloud Armor — Cloudflare IP allowlist
    cdn/              # Backend bucket + URL maps (CDN disabled, Armor attached)
    secret_manager/   # GCP Secret Manager secrets
  clients/
    staging/          # Layer 2 — Cloudflare DNS records for staging subdomains
    production/       # Layer 2 — Cloudflare DNS records for production
```

**Rule:** Never add a client by modifying the GCP layer (`main.tf`). Only the `clients/` layer changes when onboarding a new client.

---

## Domain Mapping

| App          | Domain                | GCS bucket variable  |
| ------------ | --------------------- | -------------------- |
| `web-staff`  | `staff.smashbook.app` | `staff_bucket_name`  |
| `web-player` | `app.smashbook.app`   | `player_bucket_name` |

---

## GCP Project Setup (One-time)

Before deploying, bootstrap the GCP project with the service account that GitHub Actions uses for all frontend deployments.

### Run the bootstrap script

```bash
bash ../fe-infra/setup/create-ci-service-account.sh <PROJECT_ID>
```

This script (idempotent — safe to re-run):

1. Enables the required GCP APIs: `storage`, `run`, `secretmanager`
2. Creates the `gh-actions-fe-deployer` service account
3. Grants only the three roles the deploy workflows actually need:
    - `roles/storage.objectAdmin` — `gsutil rsync` and `gsutil setmeta` on GCS
    - `roles/run.viewer` — read the `padel-api` Cloud Run service URL
    - `roles/secretmanager.secretAccessor` — read bucket name and site URL from Secret Manager
4. Exports a key to `./gcp-sa-key.json`

### Add the GitHub Secrets

After running the script:

1. Copy the full contents of `gcp-sa-key.json`
2. Go to **GitHub → Settings → Secrets and variables → Actions → New secret**
3. Add these secrets:
    - `GCP_SA_FE_KEY` — paste the JSON key contents
    - `GCP_PROJECT_ID` — your GCP project ID (e.g. `smashbook-XXXXXX`)
4. Delete the key file from your machine immediately:
    ```bash
    rm ./gcp-sa-key.json
    ```

> **Security:** Never commit `gcp-sa-key.json` to version control.
>
> **Note:** `CF_ZONE_ID` and `CF_API_TOKEN` are **not** GitHub secrets. They are stored in GCP Secret Manager and fetched dynamically by the `secrets` job in each workflow. Store them with:
> ```bash
> echo -n "<CF_ZONE_ID_VALUE>" | gcloud secrets create CF_ZONE_ID \
>   --data-file=- --project=<PROJECT_ID> --replication-policy=automatic
>
> echo -n "<CF_API_TOKEN_VALUE>" | gcloud secrets create CF_API_TOKEN \
>   --data-file=- --project=<PROJECT_ID> --replication-policy=automatic
> ```

---

## Cloudflare One-Time Manual Setup

### 1. Create API Token

1. Cloudflare Dashboard → Profile → API Tokens → Create Token
2. Template: **Edit Zone DNS**

Permissions:
```
Zone → DNS → Edit
Zone → Cache Purge → Purge
Zone → Zone Settings → Edit
```

Scope: `Zone → smashbook.app`

### 2. Get Zone ID

```
Cloudflare → smashbook.app → Overview → Zone ID
```

Store it in GCP Secret Manager (see [GCP Project Setup](#gcp-project-setup-one-time) note above).

### 3. Create Origin Certificate

```
SSL/TLS → Origin Server → Create Certificate
```

Hostnames:
```
smashbook.app
*.smashbook.app
```

Validity: 15 years

The wildcard `*.smashbook.app` covers all client subdomains (e.g. `ace-staging.smashbook.app`) — no new cert is needed per client.

Copy:
- Certificate (PEM)
- Private Key

### 4. Store Certificate in GCP Secret Manager

```bash
echo -n "<CERT_PEM>" | gcloud secrets create CERTIFICATE \
  --data-file=- --project=<PROJECT_ID> --replication-policy=automatic

echo -n "<KEY_PEM>" | gcloud secrets create PRIVATE_KEY \
  --data-file=- --project=<PROJECT_ID> --replication-policy=automatic
```

Never hardcode or commit these values.

### 5. Set Cloudflare SSL Mode

After DNS cutover, set **Full (Strict)** in Cloudflare Dashboard → `smashbook.app` → SSL/TLS → Overview.

---

## Layer 1 — GCP Infrastructure (`fe-infra/terraform/`)

This layer is created **once per environment** and never modified when adding clients.

### Required Terraform Variables

| Variable               | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `project_id`           | GCP project ID                                                              |
| `staff_bucket_name`    | Globally unique GCS bucket name for staff portal                            |
| `player_bucket_name`   | Globally unique GCS bucket name for player portal                           |
| `cloudflare_zone_id`   | Cloudflare Zone ID for `smashbook.app` (sensitive)                          |
| `cloudflare_api_token` | Cloudflare API token (sensitive)                                            |
| `origin_cert_pem`      | Cloudflare Origin Certificate PEM (from Secret Manager: `CERTIFICATE`)      |
| `origin_key_pem`       | Cloudflare Origin Certificate private key PEM (from Secret Manager: `PRIVATE_KEY`) |
| `region`               | GCP region (default: `europe-west2`)                                        |
| `environment`          | Deployment environment tag (default: `staging`)                             |

### Step 1 — Export variables

```bash
export TF_VAR_project_id=<PROJECT_ID>
export TF_VAR_staff_bucket_name=smashbook-staff-frontend
export TF_VAR_player_bucket_name=smashbook-player-frontend

# Fetch Cloudflare credentials + cert/key from Secret Manager (never hardcode)
export TF_VAR_cloudflare_zone_id=$(gcloud secrets versions access latest \
  --secret=CF_ZONE_ID --project=$TF_VAR_project_id)
export TF_VAR_cloudflare_api_token=$(gcloud secrets versions access latest \
  --secret=CF_API_TOKEN --project=$TF_VAR_project_id)
export TF_VAR_origin_cert_pem=$(gcloud secrets versions access latest \
  --secret=CERTIFICATE --project=$TF_VAR_project_id)
export TF_VAR_origin_key_pem=$(gcloud secrets versions access latest \
  --secret=PRIVATE_KEY --project=$TF_VAR_project_id)

# Optional overrides
export TF_VAR_region=europe-west2
export TF_VAR_environment=staging
```

### Step 2 — Provision / destroy GCP infrastructure

All GCP infrastructure is managed through `provision-infra.sh`.

```bash
# Apply (idempotent — safe to re-run)
bash fe-infra/setup/provision-infra.sh apply

# Plan (dry-run)
bash fe-infra/setup/provision-infra.sh plan

# Destroy GCP resources (DNS records in clients/ are separate)
bash fe-infra/setup/provision-infra.sh destroy
```

> **Destroy note:** `destroy` does **not** remove the Secret Manager secrets (`FRONTEND_WEB_STAFF_BUCKET`, `FRONTEND_WEB_STAFF_SITE_URL`, `FRONTEND_WEB_PLAYER_BUCKET`, `FRONTEND_WEB_PLAYER_SITE_URL`). Delete them manually if needed:
>
> ```bash
> for secret in FRONTEND_WEB_STAFF_BUCKET FRONTEND_WEB_STAFF_SITE_URL FRONTEND_WEB_PLAYER_BUCKET FRONTEND_WEB_PLAYER_SITE_URL; do
>   gcloud secrets delete "$secret" --project=$TF_VAR_project_id
> done
> ```

---

## Layer 2 — Cloudflare DNS (`fe-infra/terraform/clients/`)

This layer only creates Cloudflare DNS records. It reads the GCP LB IPs from Layer 1's remote state.

**Both staging and production follow the same rule:** no DNS record is created unless you explicitly pass the domain variable. Omitting a variable means that record is skipped entirely.

### Variables (staging and production both)

| Variable               | Required | Description                                                                   |
| ---------------------- | -------- | ----------------------------------------------------------------------------- |
| `cloudflare_api_token` | Yes      | Cloudflare API token with Zone:DNS:Edit                                       |
| `cloudflare_zone_id`   | Yes      | Cloudflare Zone ID for `smashbook.app`                                        |
| `staff_domain`         | No       | Full FQDN for staff portal (e.g. `staff.smashbook.app`). Omit to skip staff DNS. |
| `player_domain`        | No       | Full FQDN for player portal (e.g. `app.smashbook.app`). Omit to skip player DNS. |

### How DNS records are derived from the domain variable

For each domain you pass, Terraform creates **two records**:

| Variable value              | A record name  | CNAME name          | CNAME value                 |
| --------------------------- | -------------- | ------------------- | --------------------------- |
| `staff.smashbook.app`       | `staff`        | `www.staff`         | `staff.smashbook.app`       |
| `ace-staging.smashbook.app` | `ace-staging`  | `www.ace-staging`   | `ace-staging.smashbook.app` |

The subdomain label is derived automatically by taking everything before the first `.`.

### Examples

**Staff only:**
```bash
export TF_VAR_cloudflare_zone_id=$(gcloud secrets versions access latest --secret=CF_ZONE_ID --project=<PROJECT_ID>)
export TF_VAR_cloudflare_api_token=$(gcloud secrets versions access latest --secret=CF_API_TOKEN --project=<PROJECT_ID>)
export TF_VAR_staff_domain=staff.smashbook.app

cd fe-infra/terraform/clients/production   # or clients/staging
terraform init
terraform apply
```

Creates: `staff` A record + `www.staff` CNAME. Player records untouched.

**Player only:**
```bash
export TF_VAR_player_domain=app.smashbook.app
# (plus zone_id and api_token)
terraform apply
```

**Both at once:**
```bash
export TF_VAR_staff_domain=staff.smashbook.app
export TF_VAR_player_domain=app.smashbook.app
terraform apply
```

**Staging client example:**
```bash
export TF_VAR_staff_domain=ace-staging.smashbook.app
export TF_VAR_player_domain=ace-player-staging.smashbook.app
terraform apply
```

### Plan / Destroy clients layer

```bash
cd fe-infra/terraform/clients/staging   # or clients/production
terraform plan
terraform destroy
```

---

## DNS Cutover

1. At domain registrar, change name servers for `smashbook.app` to Cloudflare name servers.
2. Set Cloudflare SSL mode to **Full (Strict)** in dashboard.
3. Verify:
   ```bash
   curl -I https://staff.smashbook.app       # expect: server: cloudflare
   curl -I https://app.smashbook.app         # expect: server: cloudflare
   curl -I https://ace-staging.smashbook.app # expect: server: cloudflare
   ```
4. Direct GCP LB IP should return 403 (Cloud Armor working).

---

## Known Issues & Fixes

### 1. Missing Application Default Credentials

**Error:**

```
storage.NewClient() failed: dialing: google: could not find default credentials
```

**Cause:** Terraform uses ADC (Application Default Credentials), not the `gcloud` CLI session.

**Fix:**

```bash
gcloud auth application-default login
```

Run this once locally before any `terraform` or `provision-infra.sh` command.

### 2. Lock file needs regenerating after provider changes

After adding the Cloudflare provider (`cloudflare/cloudflare ~> 4.0`), regenerate the lock file:

```bash
cd fe-infra/terraform
terraform init -upgrade
```

Commit the updated `.terraform.lock.hcl`.

### 3. Cloud Armor `CLOUD_ARMOR_EDGE` type

`edge_security_policy` on a backend bucket requires the policy type to be `CLOUD_ARMOR_EDGE`. A standard `CLOUD_ARMOR` policy will fail to attach. The `armor/` module creates the correct type.

---

## CI/CD Pipelines

Two independent workflows — one per app. No cross-triggering.

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

| Stage   | Detail                                                                                        |
| ------- | --------------------------------------------------------------------------------------------- |
| secrets | Auth to GCP, fetch `VITE_API_BASE_URL` from Cloud Run + bucket/site_url/CF credentials from Secret Manager |
| lint    | `pnpm --filter @repo/<app> lint`                                                              |
| test    | `pnpm --filter @repo/<app> test`                                                              |
| build   | `pnpm --filter @repo/<app> build` with `VITE_API_BASE_URL` + `VITE_APP_ENV` injected         |
| deploy  | Upload versioned build to `gs://<bucket>/<sha>/`, copy to bucket root, set cache headers, **purge Cloudflare cache** |
| smoke   | HTTP 200 + `<!doctype html` check with 10 retries                                             |

### Deployment Flow

```
1. Build frontend (React/Vite)
2. Upload versioned build to GCS: gs://<bucket>/<sha>/
3. Promote to active: copy to bucket root
4. Set cache headers (assets = immutable, index.html = no-cache)
5. Purge Cloudflare cache  ← MANDATORY — without this users get stale content
6. Users receive updated content via Cloudflare CDN
```

---

## Build & Deploy Strategy

### Vite build

Each app builds to `frontend/apps/<app>/dist/`. The build is uploaded as a GitHub Actions artifact and downloaded in the deploy job (build and deploy are separate jobs, enabling re-deploy without rebuild if needed).

### Versioned deployments (GitHub SHA)

Every deployment is stored under a versioned prefix using the full Git SHA before being promoted to serve live traffic:

```
gs://<bucket>/
  <sha1>/          ← versioned snapshot (preserved for rollback)
    index.html
    assets/
  <sha2>/          ← another versioned snapshot
    ...
  index.html       ← active (bucket root — served by Cloudflare CDN)
  assets/
```

**Why bucket root?** The backend bucket (`modules/cdn/main.tf`) points its `default_service` directly at the bucket with no path prefix. The GCS `website` block serves `index.html` from the bucket root.

**Deploy steps (in workflow):**

1. Upload build to `gs://<bucket>/<sha>/` — never overwrites existing files
2. `cp -r` the build files to the bucket root — the promotion step (does **not** delete version folders)
3. Set cache headers on the root copies
4. Purge Cloudflare cache — users get fresh content immediately

> **Why `cp`, not `rsync -d`:** `gsutil rsync -r -d` deletes any destination object not present in the source. Since the source is only `dist/`, version folders at the bucket root (e.g. `<sha>/`) would be treated as "extra" and deleted. Using `gsutil -m cp -r dist/. gs://<bucket>/` overwrites only the files that exist locally, leaving version folders untouched.

### Cache headers

| Path pattern                   | `Cache-Control`                       |
| ------------------------------ | ------------------------------------- |
| `assets/**` (hashed filenames) | `public, max-age=31536000, immutable` |
| `index.html`                   | `no-cache, no-store, must-revalidate` |

### SPA routing

GCS `not_found_page` is set to `index.html` — handles client-side routing.

---

## Rollback

Use the rollback script in `fe-infra/setup/rollback.sh`. It promotes a versioned snapshot back to the bucket root and purges the Cloudflare cache.

### List available versions

```bash
bash fe-infra/setup/rollback.sh --bucket <bucket-name> --list
```

Or look up the SHA from git:

```bash
git log --oneline frontend/apps/web-staff/
```

### Roll back to a specific SHA

```bash
# Preview first (no changes made)
bash fe-infra/setup/rollback.sh --bucket <bucket-name> --sha <git-sha> --dry-run

# Apply rollback + purge Cloudflare cache
bash fe-infra/setup/rollback.sh --bucket <bucket-name> --sha <git-sha> \
  --cf-zone-id <CF_ZONE_ID> --cf-token <CF_API_TOKEN>
```

Short SHAs are supported (e.g. `a1b2c3d`). No infrastructure change or re-build required — rollback takes seconds. The Cloudflare cache purge ensures users see the rolled-back version immediately.

---

## Environment Variables

All environment variables are Zod-validated at app startup in `packages/config/env.ts`.

| Variable            | Required | Source in CI                                                |
| ------------------- | -------- | ----------------------------------------------------------- |
| `VITE_API_BASE_URL` | Yes      | Fetched at runtime from Cloud Run (`padel-api` service URL) |
| `VITE_APP_ENV`      | Yes      | `staging` (auto) or `production` (manual dispatch)          |

`VITE_APP_ENV` accepts: `development`, `staging`, `production`.

---

## GitHub Secrets Required

| Secret           | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| `GCP_SA_FE_KEY`  | JSON key exported by `create-ci-service-account.sh`         |
| `GCP_PROJECT_ID` | GCP project ID (e.g. `smashbook-XXXXXX`)                    |

### Secrets managed in GCP Secret Manager (do NOT add to GitHub)

All other secrets are stored in GCP Secret Manager and fetched dynamically by the `secrets` job in each workflow:

| GCP Secret                     | Used for                                                  |
| ------------------------------ | --------------------------------------------------------- |
| `FRONTEND_WEB_STAFF_BUCKET`    | staff deploy — GCS bucket name                            |
| `FRONTEND_WEB_STAFF_SITE_URL`  | staff smoke test — public HTTPS URL                       |
| `FRONTEND_WEB_PLAYER_BUCKET`   | player deploy — GCS bucket name                           |
| `FRONTEND_WEB_PLAYER_SITE_URL` | player smoke test — public HTTPS URL                      |
| `CF_ZONE_ID`                   | Cloudflare Zone ID — used by both workflows to purge cache |
| `CF_API_TOKEN`                 | Cloudflare API token — used by both workflows to purge cache |
| `CERTIFICATE`                  | Cloudflare Origin Certificate PEM                         |
| `PRIVATE_KEY`                  | Cloudflare Origin Certificate key PEM                     |

`VITE_API_BASE_URL` (for both apps) is fetched directly from the `padel-api` Cloud Run service URL.

---

## Verification Checklist

After applying all layers:

1. `curl -I https://staff.smashbook.app` → `server: cloudflare`
2. `curl -I https://app.smashbook.app` → `server: cloudflare`
3. `curl -I https://ace-staging.smashbook.app` → `server: cloudflare`
4. Direct GCP LB IP returns 403 (Cloud Armor working)
5. Cloudflare dashboard → Analytics → confirm traffic flowing through edge
6. `terraform plan` shows no diff after full apply
7. CI/CD smoke test passes (HTTP 200 + `<!doctype html`)

---

## Package Names (Turborepo filter)

| App          | Package name       |
| ------------ | ------------------ |
| `web-staff`  | `@repo/web-staff`  |
| `web-player` | `@repo/web-player` |
| `website`    | `@repo/website`    |

---

## Website Deployment

The marketing website (`smashbook.app`) follows the same architecture as `web-staff` and `web-player` but lives in its own isolated Terraform root with no client-layer separation — there is only one domain, no per-client DNS records.

### Architecture

```
Internet
  │
  └─ smashbook.app ──▶ Cloudflare (DNS + Proxy + CDN + SSL)
                            ↓
                     GCP Load Balancer (Cloud Armor — Cloudflare IPs only)
                            ↓
                     GCS Bucket (website build)
```

### Terraform Root

```
fe-infra/website-terraform/
  main.tf / variables.tf / outputs.tf / backend.tf   # Layer 1 — GCP only
```

All modules are shared from `fe-infra/terraform/modules/` — no duplication. Terraform creates both the GCP infrastructure **and** the Cloudflare DNS records (`smashbook.app` A record + `www` CNAME) in one apply — no manual DNS step needed.

### Required Terraform Variables

| Variable               | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `project_id`           | GCP project ID                                                              |
| `website_bucket_name`  | Globally unique GCS bucket name for website                                 |
| `cloudflare_zone_id`   | Cloudflare Zone ID for `smashbook.app` (sensitive)                          |
| `cloudflare_api_token` | Cloudflare API token (sensitive)                                            |
| `origin_cert_pem`      | Cloudflare Origin Certificate PEM (from Secret Manager: `CERTIFICATE`)      |
| `origin_key_pem`       | Cloudflare Origin Certificate private key PEM (from Secret Manager: `PRIVATE_KEY`) |
| `region`               | GCP region (default: `europe-west2`)                                        |
| `environment`          | Deployment environment tag (default: `production`)                          |
| `website_domain`       | CNAME target for `www` record (e.g. `smashbook.app`). Omit to skip the www CNAME. |

### Provision

```bash
export TF_VAR_project_id=<PROJECT_ID>
export TF_VAR_website_bucket_name=smashbook-website-frontend

# Fetch Cloudflare credentials + cert/key from Secret Manager (never hardcode)
export TF_VAR_cloudflare_zone_id=$(gcloud secrets versions access latest \
  --secret=CF_ZONE_ID --project=$TF_VAR_project_id)
export TF_VAR_cloudflare_api_token=$(gcloud secrets versions access latest \
  --secret=CF_API_TOKEN --project=$TF_VAR_project_id)
export TF_VAR_origin_cert_pem=$(gcloud secrets versions access latest \
  --secret=CERTIFICATE --project=$TF_VAR_project_id)
export TF_VAR_origin_key_pem=$(gcloud secrets versions access latest \
  --secret=PRIVATE_KEY --project=$TF_VAR_project_id)

# Pass website_domain to also create www.smashbook.app → smashbook.app CNAME
export TF_VAR_website_domain=smashbook.app

# Apply
bash fe-infra/setup/website-provision-infra.sh apply

# Dry-run
bash fe-infra/setup/website-provision-infra.sh plan
```

The apex A record (`smashbook.app` → LB IP) is always created. The `www` CNAME is only created when `TF_VAR_website_domain` is set.

The script stores two GCP secrets after provisioning:

| GCP Secret                  | Value                    |
| --------------------------- | ------------------------ |
| `FRONTEND_WEBSITE_BUCKET`   | GCS bucket name          |
| `FRONTEND_WEBSITE_SITE_URL` | `https://smashbook.app`  |

### Rollback

No dedicated rollback script. To serve a previous version, redeploy from a known-good SHA via `workflow_dispatch` on the `deploy-frontend-website` workflow — pick any SHA listed under `gs://<bucket>/`.

### CI/CD Pipeline — `deploy-frontend-website.yml`

Triggered on:
- Push to `main` when `frontend/apps/website/**` or `.github/workflows/deploy-frontend-website.yml` changes
- Manual `workflow_dispatch` (default env: `production`)

Stages: `secrets → build → deploy → smoke` (no lint/test jobs — website has no domain logic).

| Stage   | Detail                                                                                    |
| ------- | ----------------------------------------------------------------------------------------- |
| secrets | Fetch `FRONTEND_WEBSITE_BUCKET`, `FRONTEND_WEBSITE_SITE_URL`, `CF_ZONE_ID`, `CF_API_TOKEN` from GCP Secret Manager |
| build   | `pnpm --filter @repo/website build` with `VITE_APP_ENV` injected                         |
| deploy  | Upload versioned build → `gs://<bucket>/<sha>/`, promote to root, set cache headers, **purge Cloudflare cache** |
| smoke   | HTTP 200 + `<!doctype html` check with 10 retries                                        |

### GCP Secrets Required

| GCP Secret                  | Used for                              |
| --------------------------- | ------------------------------------- |
| `FRONTEND_WEBSITE_BUCKET`   | deploy — GCS bucket name              |
| `FRONTEND_WEBSITE_SITE_URL` | smoke test — public HTTPS URL         |
| `CF_ZONE_ID`                | Cloudflare cache purge                |
| `CF_API_TOKEN`              | Cloudflare cache purge                |
