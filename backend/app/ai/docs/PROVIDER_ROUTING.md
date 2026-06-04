_Last updated: 2026-06-04 00:00 UTC_

# AI Provider Routing

The authoritative table for which AI provider serves which feature. Root [CLAUDE.md](../../../../CLAUDE.md) carries the short version of this rule; this is the detailed routing matrix.

## Routing rules

| Output type | Provider | Why |
|---|---|---|
| Natural language (copy, summaries, drafts, conversation) | Anthropic Claude API | Best-in-class generative quality, Anthropic SDK already wired |
| Numbers, scores, classifications | Vertex AI | Tabular/structured ML, lower latency for non-language workloads |
| Vector similarity | pgvector on Cloud SQL | In-database — avoids a separate vector store, embedding column on `player_profiles` |

## Feature → provider matrix

> Provider assignments below come from the design (`/docs/ANALYTICS_AND_AI.md` §11). The **Sprint/group** column follows the 2026-05-29 re-prioritisation (Analytics G7 → AI infra G8 → CRM G9–G10 → Tournaments G11 → Phase 3 G12) — it is mirrored from `DATA_MODEL_TARGET_STATE.md`, which is its source of truth. Keep the **Fallback** column in sync with [FALLBACK_CATALOG.md](FALLBACK_CATALOG.md). `_TBD_` means the provider sub-choice (specific Vertex model, etc.) is still a spike for that sprint.

| Feature | Group | Provider | Sync/Async | Fallback |
|---|---|---|---|---|
| Dynamic pricing | G8 | Vertex AI | sync | `pricing_rules.price_per_slot` |
| Payment anomaly detection | G8 | Vertex AI | async | skip auto-action, surface manual review item |
| Revenue forecasting | G8 | Vertex AI | async | _TBD_ (naive last-period forecast) |
| Revenue anomaly detection | G8 | Vertex AI | async | no flag |
| Gap detection | G9 | Vertex AI | async | empty list (no recommended actions) |
| Smart notifications | G9 | Anthropic | async | static `notification_templates` copy |
| Personalised slot suggestions | G9 | Vertex AI | async | _TBD_ |
| Matchmaking / Fill the Court | G9 | pgvector (+ Vertex AI for copy) | async | players sorted by recent activity |
| Cancellation prediction | G9 | Vertex AI | async | `risk_score = 0.0` (no flag) |
| Churn scoring | G9 | Vertex AI | async | `null` (no score) |
| Re-engagement campaigns | G10 | Anthropic (+ Vertex AI for targeting) | async | template draft / manual authoring |
| AI staffing recommendations | G10 | Vertex AI | async | _TBD_ |
| Membership tier suggestions | G10 | Vertex AI | async | _TBD_ |
| Skill ELO | G11 | Vertex AI | async | last known ELO, no delta |
| Payment dispute auto-flag | G11 | Vertex AI | async | _TBD_ (manual review) |
| Conversational booking | G12 | Anthropic (tool use) | sync (chat) | redirect to standard booking flow |
| AI support chatbot | G12 | Anthropic (tool use) | sync (chat) | create `support_tickets` row, canned reply |
| Training recommendations | G12 | Anthropic | async | _TBD_ |
| Video analysis | G12 | Vertex AI Vision | async | _TBD_ |
| Competitor pricing intel | G12 | Anthropic + Vertex AI | async | _TBD_ |

> **Descoped 2026-05-29** (not in this matrix, do not reintroduce): weather-aware reminders, equipment replacement prediction, AI maintenance scheduling. **Deferred:** structured player segmentation.

## Cross-provider patterns to avoid

- Don't fan out the same request to multiple providers and pick the "best" answer — doubles cost and complicates the inference log.
- Don't route based on tenant preference. Provider routing is a property of the feature, not the tenant.
