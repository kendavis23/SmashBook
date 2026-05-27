# SPA Routing — Cloudflare URL Rewrite Rule
#
# Rewrites all non-asset requests to /index.html at the Cloudflare edge
# before they reach the GCS origin. This is required for React SPA routing:
# without it, hard-refreshing a deep URL (e.g. /clubs) hits GCS directly,
# which returns 404 because no file named "clubs" exists in the bucket.
#
# Scope: zone-level — created once in Layer 1, covers all frontend subdomains
# automatically. Uses subdomain naming-convention patterns instead of a wildcard
# so non-frontend subdomains (backend, api, ws, etc.) are never affected.
#
# Subdomain conventions matched:
#   <slug>-staging.smashbook.app          → staff portal  (staging)
#   <slug>-player-staging.smashbook.app   → player portal (staging)
#   <slug>-player.smashbook.app           → player portal (production)
#   <slug>.smashbook.app                  → staff portal  (production)
#     └─ excludes known non-frontend suffixes: staging, player, api,
#        backend, admin, ws, mail, cdn — safe to extend this list
#
# Rule logic:
#   - Skip requests that already have a file extension (JS, CSS, images, fonts…)
#   - Skip requests under /assets/ (Vite hashed build output)
#   - Skip the root path / (GCS serves index.html directly)
#   - Rewrite everything else to /index.html (edge rewrite, not a redirect —
#     browser URL stays unchanged, HTTP status is 200)

resource "cloudflare_ruleset" "spa_rewrite" {
  zone_id     = var.cloudflare_zone_id
  name        = "SPA Routing — Rewrite to index.html"
  description = "Rewrite frontend app routes to index.html for React SPA client-side routing"
  kind        = "zone"
  phase       = "http_request_transform"

  rules {
    action      = "rewrite"
    description = "SPA fallback — rewrite non-asset frontend routes to /index.html"
    enabled     = true

    action_parameters {
      uri {
        path {
          value = "/index.html"
        }
      }
    }

    # Frontend subdomain patterns (naming-convention based — no explicit host list):
    #
    #   <slug>-staging.smashbook.app        → staff staging
    #   <slug>-player-staging.smashbook.app → player staging
    #   <slug>-player.smashbook.app         → player production
    #   <slug>.smashbook.app                → staff production
    #     (excludes known non-frontend suffixes so backend/api/etc. are safe)
    #
    # Adding a new frontend subdomain convention in future?
    #   → Add a matching pattern in the first block below.
    #
    # Adding a new non-frontend subdomain (e.g. ws.smashbook.app)?
    #   → Add `and http.host ne "ws.smashbook.app"` to the exclusion block.

    expression = <<-EOT
      (
        (
          http.host matches r"^[a-z0-9-]+-staging\.smashbook\.app$"
          or http.host matches r"^[a-z0-9-]+-player-staging\.smashbook\.app$"
          or http.host matches r"^[a-z0-9-]+-player\.smashbook\.app$"
          or (
            http.host matches r"^[a-z0-9-]+\.smashbook\.app$"
            and not http.host matches r"^.+-(staging|player|api|backend|admin|ws|mail|cdn)\.smashbook\.app$"
            and http.host ne "admin.smashbook.app"
            and http.host ne "smashbook.app"
          )
        )
        and not http.request.uri.path matches r"\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|otf|eot|map|json|txt|xml|pdf)$"
        and not starts_with(http.request.uri.path, "/assets/")
        and http.request.uri.path ne "/"
      )
    EOT
  }
}
