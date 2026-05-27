output "ruleset_id" {
  description = "Cloudflare Ruleset ID for the SPA URL rewrite rule"
  value       = cloudflare_ruleset.spa_rewrite.id
}
