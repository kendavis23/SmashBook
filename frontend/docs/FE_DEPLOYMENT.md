_Last updated: 2026-04-12 00:00 UTC_

# Frontend Deployment

## Infrastructure Architecture

Each web app has its own independent GCP stack:

```
Internet
  │
  ├─ staff.smashbook.io ──▶ Global LB (static IP) ──▶ HTTPS proxy ──▶ CDN backend bucket ──▶ GCS (web-staff build)
  │
  └─ app.smashbook.io   ──▶ Global LB (static IP) ──▶ HTTPS proxy ──▶ CDN backend bucket ──▶ GCS (web-player build)
```

Per stack:

- **GCS bucket** — hosts the Vite build output, configured as a static website with SPA fallback (`index.html`)
- **CDN backend bucket** — Cloud CDN with `CACHE_ALL_STATIC`, 1h client/default TTL, 24h max TTL, stale-while-revalidate
- **URL maps** — HTTPS serving + HTTP → HTTPS permanent redirect
- **Google-managed SSL certificate** — provisioned and auto-renewed once DNS resolves
- **Global forwarding rules** — ports 80 and 443 on a dedicated global static IP
- **Cloud DNS** — A record → load balancer static IP; `www` CNAME → apex

## Domain Mapping

| App          | Domain               | GCS bucket variable  | Terraform module prefix |
| ------------ | -------------------- | -------------------- | ----------------------- |
| `web-staff`  | `staff.smashbook.io` | `staff_bucket_name`  | `staff`                 |
| `web-player` | `app.smashbook.io`   | `player_bucket_name` | `player`                |

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
3. Add two secrets:
    - `GCP_SA_FE_KEY` — paste the JSON key contents
    - `GCP_PROJECT_ID` — your GCP project ID (e.g. `smashbook-XXXXXX`)
4. Delete the key file from your machine immediately:
    ```bash
    rm ./gcp-sa-key.json
    ```

> **Security:** Never commit `gcp-sa-key.json` to version control.

---

## Terraform Infra (`fe-infra/terraform/`)

```
fe-infra/
  setup/
    provision-infra.sh          — run Terraform + store outputs as Secret Manager secrets
    create-ci-service-account.sh — one-time: create GitHub Actions SA + grant IAM roles
  terraform/
    main.tf               — root: instantiates staff + player module stacks
    variables.tf          — all input vars (project_id, domains, buckets, dns)
    outputs.tf            — IPs, bucket names, URLs per stack
    backend.tf            — GCS remote state backend (written by provision-infra.sh on first run)
    modules/
      storage/            — GCS bucket + allUsers objectViewer IAM
      cdn/                — backend bucket + URL map + HTTP redirect map
      networking/         — static IP, HTTPS/HTTP proxies, forwarding rules
      ssl/                — Google-managed SSL certificate
      dns/                — Cloud DNS A record + www CNAME
      secret_manager/     — Secret Manager secrets for bucket names + site URLs
```

### Required Terraform variables

| Variable             | Description                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `project_id`         | GCP project ID                                                                                                     |
| `staff_domain`       | e.g. `staff.smashbook.io`                                                                                          |
| `staff_bucket_name`  | Globally unique GCS bucket name                                                                                    |
| `player_domain`      | e.g. `app.smashbook.io`                                                                                            |
| `player_bucket_name` | Globally unique GCS bucket name                                                                                    |
| `dns_zone_name`      | Cloud DNS managed zone resource name                                                                               |
| `dns_zone_dns_name`  | DNS name with trailing dot, e.g. `smashbook.io.`                                                                   |
| `create_zone`        | `true` to create the DNS zone; `false` if it exists                                                                |
| `region`             | GCP region (default: `europe-west2`)                                                                               |
| `environment`        | Deployment environment (default: `staging`)                                                                        |
| `dns_config`         | `true` (prod): DNS + SSL + HTTPS. `false` (staging): HTTP only via static IP, no DNS/SSL/redirect. Default: `true` |

### Step 1 — Export variables

Always required:

```bash
export TF_VAR_project_id=<PROJECT_ID>
export TF_VAR_staff_bucket_name=smashbook-staff-frontend
export TF_VAR_player_bucket_name=smashbook-player-frontend

# Optional overrides
export TF_VAR_region=europe-west2
export TF_VAR_environment=staging
```

Required only when using `--dns` (production):

```bash
export TF_VAR_staff_domain=staff.smashbook.io
export TF_VAR_player_domain=app.smashbook.io
export TF_VAR_dns_zone_name=smashbook-zone
export TF_VAR_dns_zone_dns_name=smashbook.io.
```

### Step 2 — Provision / destroy infrastructure

All infrastructure is managed through `provision-infra.sh`. Use `--dns` for production (HTTPS + SSL + DNS) or `--no-dns` for staging (HTTP only via static IP).

```bash
# ── STAGING (HTTP only, no DNS/SSL) ──────────────────────────────────────────

# Apply
bash fe-infra/setup/provision-infra.sh apply --no-dns

# Plan (dry-run)
bash fe-infra/setup/provision-infra.sh plan --no-dns

# Destroy
bash fe-infra/setup/provision-infra.sh destroy --no-dns


# ── PRODUCTION (HTTPS + DNS + SSL) ───────────────────────────────────────────

# First run only — creates the Cloud DNS managed zone
bash fe-infra/setup/provision-infra.sh apply --dns --create-zone

# All subsequent runs
bash fe-infra/setup/provision-infra.sh apply --dns

# Plan (dry-run)
bash fe-infra/setup/provision-infra.sh plan --dns

# Destroy (handles DNS zone cleanup, bucket emptying, and state sync automatically)
bash fe-infra/setup/provision-infra.sh destroy --dns
```

> **`--create-zone` note:** Only pass this flag on the very first production apply — it creates the `smashbook-zone` Cloud DNS managed zone. On all subsequent runs omit it to avoid a Terraform conflict with the already-existing zone.

> **Destroy note:** `destroy` does **not** remove the Secret Manager secrets (`FRONTEND_WEB_STAFF_BUCKET`, `FRONTEND_WEB_STAFF_SITE_URL`, `FRONTEND_WEB_PLAYER_BUCKET`, `FRONTEND_WEB_PLAYER_SITE_URL`). These are created by `gcloud` and are invisible to Terraform. Delete them manually if needed:
>
> ```bash
> for secret in FRONTEND_WEB_STAFF_BUCKET FRONTEND_WEB_STAFF_SITE_URL FRONTEND_WEB_PLAYER_BUCKET FRONTEND_WEB_PLAYER_SITE_URL; do
>   gcloud secrets delete "$secret" --project=$TF_VAR_project_id
> done
> ```

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

---

### 2. DNS zone does not exist on first run

**Error:**

```
Error retrieving record sets for "smashbook-zone": googleapi: Error 404:
The 'parameters.managedZone' resource named 'smashbook-zone' does not exist.
```

**Cause:** Terraform tries to refresh DNS record sets before the zone has been created.

**Fix — two-run workflow:**

**Run 1** — create the zone only:

```bash
export TF_VAR_create_zone=true
bash fe-infra/setup/provision-infra.sh apply
```

**Run 2** — create DNS records and all remaining resources:

```bash
export TF_VAR_create_zone=false
bash fe-infra/setup/provision-infra.sh apply
```

> On all future runs keep `TF_VAR_create_zone=false` (or omit it — default is `false`).

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

| Stage   | Detail                                                                                      |
| ------- | ------------------------------------------------------------------------------------------- |
| secrets | Auth to GCP, fetch `VITE_API_BASE_URL` from Cloud Run + bucket/site_url from Secret Manager |
| lint    | `pnpm --filter @repo/<app> lint`                                                            |
| test    | `pnpm --filter @repo/<app> test`                                                            |
| build   | `pnpm --filter @repo/<app> build` with `VITE_API_BASE_URL` + `VITE_APP_ENV` injected        |
| deploy  | Upload versioned build to `gs://<bucket>/<sha>/`, copy to bucket root, set cache headers    |
| smoke   | HTTP 200 + `<!doctype html` check with 10 retries                                           |

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
  index.html       ← active (bucket root — served by CDN)
  assets/
```

**Why bucket root?** The Terraform CDN backend bucket (`modules/cdn/main.tf`) points its `default_service` directly at the bucket with no path prefix. The GCS `website` block serves `index.html` from the bucket root. The active serving path is therefore always `gs://<bucket>/` (the root).

**Deploy steps (in workflow):**

1. Upload build to `gs://<bucket>/<sha>/` — never overwrites existing files
2. `cp -r` the build files to the bucket root — this is the promotion step (does **not** delete version folders)
3. Set cache headers on the root copies

> **Why `cp`, not `rsync -d`:** `gsutil rsync -r -d` deletes any destination object not present in the source. Since the source is only `dist/`, version folders at the bucket root (e.g. `<sha>/`) would be treated as "extra" and soft-deleted. Using `gsutil -m cp -r dist/. gs://<bucket>/` overwrites only the files that exist locally, leaving version folders untouched.

### Cache headers

| Path pattern                   | `Cache-Control`                       |
| ------------------------------ | ------------------------------------- |
| `assets/**` (hashed filenames) | `public, max-age=31536000, immutable` |
| `index.html`                   | `no-cache, no-store, must-revalidate` |

### SPA routing

GCS `not_found_page` is set to `index.html` — handles client-side routing.

## Rollback

Use the rollback script in `fe-infra/setup/rollback.sh`. It promotes a versioned snapshot back to the bucket root without deleting any other version folders.

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

# Apply rollback
bash fe-infra/setup/rollback.sh --bucket <bucket-name> --sha <git-sha>
```

Short SHAs are supported (e.g. `a1b2c3d`). No infrastructure change or re-build required — rollback takes seconds.

> **CDN cache:** After rollback, the CDN may continue serving stale content for up to 1h. To invalidate immediately:
>
> ```bash
> gcloud compute url-maps invalidate-cdn-cache <url-map-name> --path '/*'
> ```

## Environment Variables

All environment variables are Zod-validated at app startup in `packages/config/env.ts`.

| Variable            | Required | Source in CI                                                |
| ------------------- | -------- | ----------------------------------------------------------- |
| `VITE_API_BASE_URL` | Yes      | Fetched at runtime from Cloud Run (`padel-api` service URL) |
| `VITE_APP_ENV`      | Yes      | `staging` (auto) or `production` (manual dispatch)          |

`VITE_APP_ENV` accepts: `development`, `staging`, `production`.

## GitHub Secrets Required

Only **2 secrets** must be added manually to GitHub. Everything else is fetched from GCP Secret Manager at runtime.

| Secret           | Value                                               |
| ---------------- | --------------------------------------------------- |
| `GCP_SA_FE_KEY`  | JSON key exported by `create-ci-service-account.sh` |
| `GCP_PROJECT_ID` | Your GCP project ID (e.g. `smashbook-XXXXXX`)       |

### Secrets managed by Terraform (do NOT add to GitHub)

These are stored in GCP Secret Manager by `provision-infra.sh` after `terraform apply` and fetched dynamically by the `secrets` job in each workflow:

| GCP Secret                     | Used for                             |
| ------------------------------ | ------------------------------------ |
| `FRONTEND_WEB_STAFF_BUCKET`    | staff deploy — GCS bucket name       |
| `FRONTEND_WEB_STAFF_SITE_URL`  | staff smoke test — public HTTPS URL  |
| `FRONTEND_WEB_PLAYER_BUCKET`   | player deploy — GCS bucket name      |
| `FRONTEND_WEB_PLAYER_SITE_URL` | player smoke test — public HTTPS URL |

`VITE_API_BASE_URL` (for both apps) is fetched directly from the `padel-api` Cloud Run service URL — same pattern as `deploy-staging.yml`.

## Package Names (Turborepo filter)

| App          | Package name       |
| ------------ | ------------------ |
| `web-staff`  | `@repo/web-staff`  |
| `web-player` | `@repo/web-player` |
