_Last updated: 2026-06-04 00:00 UTC_

# AI Fallback Catalog

Every AI feature must have a deterministic non-AI fallback. When the feature flag is off, the model errors, or the call times out, the fallback runs and `ai_inference_log.fallback_used` is set to `true`.

This file is the contract: if your feature is not in this table, it cannot ship.

## Fallback contract

A fallback must:
1. Be deterministic (same input → same output).
2. Not call any external service (database reads from `pricing_rules`, `notification_templates`, etc. are fine).
3. Return a value of the same shape as the AI response (so downstream code does not branch on success vs fallback).
4. Run in <50ms (it is on the critical path when AI is degraded).

## Feature → fallback

> Fill in as each feature ships.

| Feature | Fallback behaviour | Data source |
|---|---|---|
| Dynamic pricing | Return `price_per_slot` for the matching rule | `pricing_rules` |
| Gap detection | Return empty list (no recommended actions) | n/a |
| Smart notifications | Use the static `notification_templates.body_default` | `notification_templates` |
| Payment anomaly detection | Skip auto-action, surface a manual review item | `support_tickets` (category=`booking_inquiry`) |
| Revenue forecasting | Naive last-period (carry-forward) forecast; no anomaly flag | `mv_revenue_by_club_day_service` |
| Matchmaking | Return players sorted by recent activity | `player_profiles` |
| Fill the Court | _TBD_ | _TBD_ |
| Cancellation prediction | Return `risk_score = 0.0` (no flag) | n/a |
| Skill ELO | Use last known ELO, no delta | `player_profiles.elo` |
| Churn scoring | Return `null` (no score, do not gate logic on absence) | n/a |
| Campaign generation | Return a template draft with placeholder copy | `campaign_templates` |
| Conversational booking | HTTP 302 to standard booking UI | n/a |
| AI support chatbot | Create a `support_tickets` row, return canned "human will reply" message | `support_tickets` |
| Video analysis | _TBD_ | _TBD_ |
| Training recommendations | _TBD_ | _TBD_ |
| Market intelligence | _TBD_ | _TBD_ |

## Testing the fallback path

Every AI endpoint must include a test that:
1. Disables the feature flag for the test tenant in `ai_feature_flags`
2. Calls the endpoint
3. Asserts the response shape matches the AI response shape
4. Asserts `ai_inference_log.fallback_used = true` for the resulting row
