# SmashBook Frontend Deployment Architecture (Cloudflare + GCP)

---

## 1. Architecture Overview

```
Internet
   ↓
Cloudflare (DNS + Proxy + CDN + SSL)
   ↓
GCP Load Balancer (Cloud Armor - allow only Cloudflare IPs)
   ↓
GCS Bucket (Static Frontend)
```

---

## 2. Architecture Explanation

### Cloudflare Layer

* DNS management
* Proxy (Orange cloud enabled)
* Global CDN (edge caching)
* SSL termination (public HTTPS)
* Security (WAF, DDoS protection)

### GCP Load Balancer

* Receives traffic only from Cloudflare
* Uses Cloudflare Origin Certificate
* Secured via Cloud Armor (IP restriction)

### GCS Bucket

* Stores static frontend (React build)
* Acts as origin server

---

## 3. Security Design

### Problem

```
User → GCP LB directly ❌ (bypasses Cloudflare)
```

### Solution

```
Allowed → Cloudflare IP ranges
Blocked → All other traffic
```

---

## 4. Terraform Responsibilities

All infrastructure is managed via Terraform.

### Providers

* Google Cloud
* Cloudflare

---

## 5. Terraform Module Structure

```
fe-infra/
 ├── terraform/
 │   ├── main.tf
 │   ├── variables.tf
 │   ├── outputs.tf
 │
 │   ├── modules/
 │   │   ├── storage/            # GCS bucket
 │   │   ├── networking/         # Load balancer + HTTPS proxy
 │   │   ├── origin_ssl/         # Cloudflare origin certificate
 │   │   ├── cloudflare_dns/     # DNS records (A, CNAME, proxy)
 │   │   ├── armor/              # Cloud Armor security policy
 │
 │   └── environments/
 │       ├── staging/
 │       ├── production/
```

---

## 6. Terraform Managed Components

### GCP

* GCS Bucket
* Backend Bucket
* Load Balancer
* HTTPS Proxy
* SSL Certificate (Origin)
* Cloud Armor Policy

⚠️ **Cloud CDN is NOT used**
👉 Cloudflare handles all CDN responsibilities

### Cloudflare

* DNS Records (A, CNAME)
* Proxy enable (`proxied = true`)
* SSL Mode (Full Strict)
* Cache handling

---

## 7. Cloud Armor Configuration (Security)

### Purpose

Restrict access to GCP LB only from Cloudflare IPs.

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
          ...
        ]
      }
    }
  }

  rule {
    priority = 2147483647
    action   = "deny(403)"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}
```

Attach:

```hcl
edge_security_policy = google_compute_security_policy.cloudflare_only.id
```

---

## 8. Cloudflare One-Time Manual Setup

---

### 8.1 Create API Token

1. Cloudflare Dashboard
2. Profile → API Tokens → Create Token
3. Template: **Edit Zone DNS**

Permissions:

```
Zone → DNS → Edit
Zone → Cache Purge → Purge
Zone → Zone Settings → Edit
```

Scope:

```
Zone → smashbook.app
```

---

### 8.2 Get Zone ID

```
Cloudflare → Domain → Overview → Zone ID
```

---

### 8.3 Create Origin Certificate

```
SSL/TLS → Origin Server → Create Certificate
```

Hostnames:

```
smashbook.app
*.smashbook.app
```

Validity:

```
15 years
```

Copy:

* Certificate (PEM)
* Private Key

---

### 8.4 Store Certificate Securely

Recommended:

* GCP Secret Manager

Avoid:

* Hardcoding
* Git commits

---

## 9. DNS Configuration via Terraform

```hcl
resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = "app"
  type    = "A"
  value   = var.lb_ip
  proxied = true
}
```

---

## 10. SSL Configuration

```
SSL Mode = Full (Strict)
```

Flow:

```
User → Cloudflare SSL
Cloudflare → Origin Cert → GCP LB
```

---

## 11. Deployment Flow

```
1. Build frontend (React)
2. Upload to GCS bucket
3. Purge Cloudflare cache (MANDATORY)
4. Users receive updated content via Cloudflare CDN
```

---

## 12. Cloudflare Cache Purge (Required)

This step ensures users always get the latest deployment.

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## 13. Best Practices

* Use Cloudflare CDN only (GCP CDN disabled)
* Enable proxy (orange cloud)
* Use Full (Strict) SSL
* Use wildcard domain in origin cert
* Lock GCP LB with Cloud Armor
* Store secrets securely
* Use versioned frontend builds
* **Always purge Cloudflare cache after deployment**

---

## 14. Final Production Setup

```
Cloudflare:
  DNS + CDN + SSL + Security

GCP:
  Load Balancer + Secure Origin

Storage:
  GCS (static hosting)

Security:
  Cloud Armor (Cloudflare IP only)
```

---

## 15. Summary

| Component   | Responsibility            |
| ----------- | ------------------------- |
| Cloudflare  | DNS, CDN, SSL, Security   |
| Terraform   | Infrastructure automation |
| GCP LB      | Traffic routing           |
| GCS         | Static hosting            |
| Cloud Armor | Access control            |

---
