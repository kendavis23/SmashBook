# Deployment Steps: Cloudflare + GCP Architecture

## Architecture

```
Internet
   ↓
Cloudflare (DNS + Proxy + CDN + SSL)
   ↓
GCP Load Balancer (Cloud Armor — Cloudflare IPs only)
   ↓
GCS Bucket (Static Frontend)
```

**Cloud CDN is NOT used.** Cloudflare handles all CDN responsibilities.

---

## Two Independent Terraform Layers

GCP infrastructure and Cloudflare DNS are managed in **separate Terraform roots**. This is the critical design decision that allows adding new client subdomains without touching GCP.

```
fe-infra/terraform/
  gcp/          # Layer 1 — GCP LB, GCS, Cloud Armor, origin SSL (created once per env)
  clients/      # Layer 2 — Cloudflare DNS records only (one entry per client)
  modules/
    storage/
    networking/
    origin_ssl/
    cloudflare_dns/
    armor/
```

**Rule:** Never add a client by modifying `gcp/`. Only `clients/` changes when onboarding a new client.

---

## Staging: Multi-Client Subdomain Pattern

### Goal

Multiple client-specific subdomains all resolve to the same GCP LB:

```
ace-staging.smashbook.app    ─┐
really-staging.smashbook.app  ├─→ Cloudflare DNS (proxied) → same GCP LB static IP
newclient-staging.smashbook.app ┘              ↓
                                    Cloud Armor (Cloudflare IPs only)
                                               ↓
                                    GCS Bucket (staging frontend build)
```

### Adding a New Client to Staging

Edit one file only — `fe-infra/terraform/clients/staging/clients.tf`:

```hcl
locals {
  staging_clients = [
    "ace",
    "really",
    "newclient",   # ← add this line, nothing else changes
  ]
}
```

Then apply only the clients layer:

```bash
cd fe-infra/terraform/clients/staging
terraform apply
```

GCP LB, GCS bucket, and Cloud Armor are untouched.

### `clients/staging/clients.tf` — full example

```hcl
locals {
  staging_clients = [
    "ace",
    "really",
  ]
}

data "terraform_remote_state" "gcp_staging" {
  backend = "gcs"
  config = {
    bucket = "smashbook-tf-state"
    prefix = "staging/gcp"
  }
}

module "dns" {
  for_each    = toset(local.staging_clients)
  source      = "../../modules/cloudflare_dns"
  zone_id     = var.cloudflare_zone_id
  record_name = "${each.key}-staging"   # ace-staging → ace-staging.smashbook.app
  lb_ip       = data.terraform_remote_state.gcp_staging.outputs.lb_static_ip
}
```

---

## What Changes vs. What Stays

| Component | Before | After |
|---|---|---|
| DNS zone | GCP Cloud DNS | Cloudflare DNS zone |
| Public TLS cert | GCP Google-managed SSL cert | Cloudflare Universal SSL (auto) |
| Origin TLS cert | Google-managed | Cloudflare Origin Certificate (15-yr, wildcard) |
| CDN | GCP Cloud CDN | Cloudflare CDN (Cloud CDN removed) |
| GCP LB (static IP, forwarding rules) | Unchanged | Unchanged |
| GCS bucket | Unchanged | Unchanged |
| Cloud Armor | None | Required — allow Cloudflare IPs only |
| CI/CD workflows | Unchanged | Add CF cache purge step (mandatory) |
| Secret Manager | Unchanged | Unchanged |

---

## Phase 1 — Cloudflare One-Time Manual Setup

### 1.1 Create API Token

1. Cloudflare Dashboard → Profile → API Tokens → Create Token
2. Template: **Edit Zone DNS**

Permissions:
```
Zone → DNS → Edit
Zone → Cache Purge → Purge
Zone → Zone Settings → Edit
```

Scope: `Zone → smashbook.app`

### 1.2 Get Zone ID

```
Cloudflare → smashbook.app → Overview → Zone ID
```

### 1.3 Create Origin Certificate

```
SSL/TLS → Origin Server → Create Certificate
```

Hostnames:
```
smashbook.app
*.smashbook.app
```

Validity: 15 years

The wildcard `*.smashbook.app` covers all client subdomains (e.g. `ace-staging.smashbook.app`, `really-staging.smashbook.app`) — no new cert needed per client.

Copy:
- Certificate (PEM)
- Private Key

### 1.4 Store Certificate in GCP Secret Manager

```
CF_ORIGIN_CERT_PEM  — certificate PEM
CF_ORIGIN_KEY_PEM   — private key PEM
```

Never hardcode or commit these values.

### 1.5 Lower DNS TTL (if migrating from GCP Cloud DNS)

Set existing A record TTLs to **60 seconds** at least 24–48 hrs before cutover.

---

## Phase 2 — Terraform: Layer 1 (GCP Infrastructure)

This layer is created **once per environment** and never modified when adding clients.

### Providers (`fe-infra/terraform/gcp/main.tf`)

```hcl
terraform {
  required_providers {
    google     = { source = "hashicorp/google", version = "~> 5.0" }
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.0" }
  }
}
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
```

### Module Structure

```
fe-infra/terraform/modules/
  storage/            # GCS bucket
  networking/         # Load balancer + HTTPS proxy
  origin_ssl/         # Cloudflare origin certificate (wildcard *.smashbook.app)
  cloudflare_dns/     # DNS records (A record, proxied) — used by clients layer
  armor/              # Cloud Armor — Cloudflare IP allowlist
```

**Delete:** `modules/dns/`, `modules/ssl/`, `modules/cdn/` (Cloud CDN not used)

### `modules/cloudflare_dns/main.tf`

Single proxied A record per call. Used by both the production DNS setup and the per-client staging loop.

```hcl
variable "zone_id"     {}
variable "record_name" {}   # e.g. "ace-staging" or "staff"
variable "lb_ip"       {}

resource "cloudflare_record" "frontend_a" {
  zone_id = var.zone_id
  name    = var.record_name
  type    = "A"
  value   = var.lb_ip
  proxied = true
}
```

### `modules/origin_ssl/main.tf`

`google_compute_ssl_certificate` using Cloudflare Origin Certificate PEM.

Variables: `origin_cert_pem`, `origin_key_pem`, `name_prefix`, `project_id`, `dns_config`

Output: `ssl_cert_self_link` (consumed by networking module)

### `modules/armor/main.tf` (Required)

```hcl
resource "google_compute_security_policy" "cloudflare_only" {
  name = "cloudflare-only"
  type = "CLOUD_ARMOR_EDGE"

  rule {
    priority = 1000
    action   = "allow"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = [
          "173.245.48.0/20",
          "103.21.244.0/22",
          # full list at https://www.cloudflare.com/ips/
        ]
      }
    }
  }

  rule {
    priority = 2147483647
    action   = "deny(403)"
    match {
      versioned_expr = "SRC_IPS_V1"
      config { src_ip_ranges = ["*"] }
    }
  }
}
```

Attach via `edge_security_policy` on the backend bucket in `modules/networking/`.

### `fe-infra/terraform/gcp/variables.tf`

**Remove:** `dns_zone_name`, `dns_zone_dns_name`, `create_zone`

**Add:**
- `cloudflare_zone_id` (sensitive)
- `cloudflare_api_token` (sensitive)
- `origin_cert_pem` (sensitive, default `""`)
- `origin_key_pem` (sensitive, default `""`)

### `fe-infra/terraform/gcp/outputs.tf`

**Remove:** `dns_zone_name_servers`

**Add:**
```hcl
output "lb_static_ip" {
  value = module.networking.static_ip_address
}
```

This output is consumed by `clients/staging/clients.tf` via `terraform_remote_state`.

### Regenerate lock file

```bash
terraform init -upgrade
```

---

## Phase 3 — Terraform: Layer 2 (Cloudflare DNS per client)

This layer only creates DNS records. It reads the GCP LB IP from Layer 1's remote state.

### Production DNS Records (`clients/production/clients.tf`)

```hcl
locals {
  production_records = {
    "staff" = module.gcp_prod.outputs.lb_static_ip_staff
    "app"   = module.gcp_prod.outputs.lb_static_ip_player
  }
}
```

| Name | Type | Value | Proxied |
|---|---|---|---|
| `staff` | A | GCP LB static IP (staff) | Yes |
| `app` | A | GCP LB static IP (player) | Yes |
| `www.staff` | CNAME | `staff.smashbook.app` | Yes |
| `www.app` | CNAME | `app.smashbook.app` | Yes |

### Staging DNS Records (`clients/staging/clients.tf`)

One A record per client, all pointing to the same staging LB IP. Adding a client = one line in `staging_clients`.

---

## Phase 4 — Terraform Apply (Layer 1 first)

Apply GCP layer with `-target` to avoid destroying old DNS records before cutover:

```bash
cd fe-infra/terraform/gcp
terraform apply \
  -target=module.origin_ssl_staff.google_compute_ssl_certificate.cloudflare_origin \
  -target=module.origin_ssl_player.google_compute_ssl_certificate.cloudflare_origin \
  -target=module.networking_staff.google_compute_target_https_proxy.frontend \
  -target=module.networking_player.google_compute_target_https_proxy.frontend \
  -target=module.armor.google_compute_security_policy.cloudflare_only
```

GCP LB now has Cloudflare origin cert + Cloud Armor installed.

Then apply Layer 2 (DNS):

```bash
cd fe-infra/terraform/clients/staging
terraform apply
```

---

## Phase 5 — DNS Cutover

1. At domain registrar, change name servers for `smashbook.app` to Cloudflare name servers.
2. Set Cloudflare SSL mode to **Full (Strict)** in dashboard.
3. Verify:
   ```bash
   curl -I https://staff.smashbook.app        # expect: server: cloudflare
   curl -I https://app.smashbook.app          # expect: server: cloudflare
   curl -I https://ace-staging.smashbook.app  # expect: server: cloudflare
   ```

---

## Phase 6 — Cleanup

1. Remove Cloud DNS resources from Terraform state and delete the GCP managed zone.
2. Delete old Google-managed SSL certs from GCP.
3. Remove `modules/cdn/` (Cloud CDN disabled — Cloudflare CDN replaces it).
4. Run full `terraform apply` in the GCP layer to sync state.

---

## Setup Script Changes

**`fe-infra/setup/provision-infra.sh`**
- Remove `dns.googleapis.com` from `enable_apis()`
- Validate `TF_VAR_cloudflare_zone_id` instead of `TF_VAR_dns_zone_name`
- Remove `purge_dns_zone` and `purge_dns_state` helper functions

**`fe-infra/setup/rollback.sh`**
- Replace GCP CDN cache invalidation with Cloudflare cache purge API

---

## CI/CD Changes

Add Cloudflare cache purge after every deploy (mandatory — without this users get stale content):

```yaml
- name: Purge Cloudflare cache
  run: |
    curl -X POST \
      "https://api.cloudflare.com/client/v4/zones/${{ secrets.CF_ZONE_ID }}/purge_cache" \
      -H "Authorization: Bearer ${{ secrets.CF_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
```

Add `CF_ZONE_ID` and `CF_API_TOKEN` as GitHub secrets.

Files to update:
- `.github/workflows/deploy-frontend-web-staff.yml`
- `.github/workflows/deploy-frontend-web-player.yml`

---

## Deployment Flow (Ongoing)

```
1. Build frontend (React)
2. Upload to GCS bucket
3. Purge Cloudflare cache  ← MANDATORY
4. Users receive updated content via Cloudflare CDN
```

---

## Critical Files

| File | Change |
|---|---|
| `fe-infra/terraform/gcp/main.tf` | Add CF provider, update module sources |
| `fe-infra/terraform/gcp/variables.tf` | Remove DNS zone vars, add CF + cert vars |
| `fe-infra/terraform/gcp/outputs.tf` | Remove `dns_zone_name_servers`, add `lb_static_ip` |
| `fe-infra/terraform/clients/staging/clients.tf` | Per-client staging DNS — edit to add clients |
| `fe-infra/terraform/clients/production/clients.tf` | Production DNS records |
| `fe-infra/terraform/modules/dns/` | Delete |
| `fe-infra/terraform/modules/ssl/` | Delete |
| `fe-infra/terraform/modules/cdn/` | Delete (Cloud CDN not used) |
| `fe-infra/terraform/modules/cloudflare_dns/` | Create — single A record, used by clients layer |
| `fe-infra/terraform/modules/origin_ssl/` | Create |
| `fe-infra/terraform/modules/armor/` | Create (required) |
| `fe-infra/terraform/.terraform.lock.hcl` | Regenerate with `terraform init -upgrade` |
| `fe-infra/setup/provision-infra.sh` | Remove GCP DNS APIs, update env checks |
| `fe-infra/setup/rollback.sh` | Replace CDN invalidation with CF purge |
| `.github/workflows/deploy-frontend-web-staff.yml` | Add CF purge step |
| `.github/workflows/deploy-frontend-web-player.yml` | Add CF purge step |

---

## Verification

1. `curl -I https://staff.smashbook.app` → `server: cloudflare`
2. `curl -I https://app.smashbook.app` → `server: cloudflare`
3. `curl -I https://ace-staging.smashbook.app` → `server: cloudflare`
4. Cloudflare dashboard → Analytics → confirm traffic flowing through edge
5. Direct GCP LB IP returns 403 (Cloud Armor working)
6. `terraform plan` shows no diff after cleanup apply
7. CI/CD smoke test passes (HTTP 200 + `<!doctype html`)
