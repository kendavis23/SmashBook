_Last updated: 2026-05-23 00:00 UTC_

# AI Provider Routing

The authoritative table for which AI provider serves which feature. Root [CLAUDE.md](../../../../CLAUDE.md) carries the short version of this rule; this is the detailed routing matrix.

## Routing rules

| Output type | Provider | Why |
|---|---|---|
| Natural language (copy, summaries, drafts, conversation) | Anthropic Claude API | Best-in-class generative quality, Anthropic SDK already wired |
| Numbers, scores, classifications | Vertex AI | Tabular/structured ML, lower latency for non-language workloads |
| Vector similarity | pgvector on Cloud SQL | In-database — avoids a separate vector store, embedding column on `player_profiles` |

## Feature → provider matrix

> Fill this in as each AI feature lands. Keep the "Fallback" column in sync with [FALLBACK_CATALOG.md](FALLBACK_CATALOG.md).

| Feature | Sprint | Provider | Sync/Async | Fallback |
|---|---|---|---|---|
| Dynamic pricing | G7 | _TBD_ | sync | `pricing_rules.price_per_slot` |
| Gap detection | G7 | _TBD_ | async | _TBD_ |
| Smart notifications | G7 | Anthropic | async | static template copy |
| Autonomous finance | G8 | _TBD_ | async | _TBD_ |
| Matchmaking | G9 | pgvector | async | proceed without suggestions |
| Fill the Court | G9 | pgvector | async | _TBD_ |
| Cancellation prediction | G9 | Vertex AI | async | _TBD_ |
| Skill ELO | G9 | _TBD_ | async | _TBD_ |
| Churn scoring | G10 | Vertex AI | async | _TBD_ |
| Campaign generation | G10 | Anthropic | async | manual campaign authoring |
| Conversational booking | G11 | Anthropic | sync (chat) | redirect to standard booking flow |
| AI support chatbot | G11 | Anthropic | sync (chat) | human ticket queue |
| Video analysis | G12 | _TBD_ | async | _TBD_ |
| Training recommendations | G12 | _TBD_ | async | _TBD_ |
| Market intelligence | G12 | _TBD_ | async | _TBD_ |

## Cross-provider patterns to avoid

- Don't fan out the same request to multiple providers and pick the "best" answer — doubles cost and complicates the inference log.
- Don't route based on tenant preference. Provider routing is a property of the feature, not the tenant.
