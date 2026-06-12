_Last updated: 2026-06-12 15:45 UTC_

> **✅ Adopted 2026-06-12:** the §2 G9 split and all five §3 schema additions are now in `DATA_MODEL_TARGET_STATE.md`, which was restructured against the refined backlog with **go-live after Sprint 10**. Group mapping after the restructure: **G9a** = messaging core (Sprint 9, + consent columns + chat columns from old G12); **G9-360** = player 360 (`player_profiles` sans embedding + `tags`, `player_notes`; Sprint 9–10); **G9b** = `player_engagement_scores` (Sprint 10); **G8** = AI core platform incl. `automation_mode` + frequency cap (Sprint 9); **G13** = gap detection + `ai_recommendations` + pgvector embedding (Sprint 11, post-go-live); **G15** = cancellation prediction (Sprint 13). Group references in the body below predate the restructure — read them through this mapping.

# CRM + AI — Database Evaluation & User Story Prioritization

**Purpose:** CRM is becoming a primary objective of SmashBook, correlated with the AI roadmap. This doc maps the open backlog (issues.json, reviewed 2026-06-10) to the schema work in `DATA_MODEL_TARGET_STATE.md`, identifies gaps in the target state, and tiers the user stories by demonstrability — Tier 1 is "show a prospect on a screen share", Tier 3 is "co-develop with the first client once trust is established".

**Status legend:** ⬜ not started · 🚧 in progress · ✅ done

---

## 1. Where the database stands

The CRM substrate is **entirely unbuilt** — but already well-designed in `DATA_MODEL_TARGET_STATE.md`:

| Group | Contents | Status |
|---|---|---|
| G8 — AI infrastructure | `ai_inference_log` (partitioned), `ai_feature_flags`, `clubs` AI guardrail columns | ⬜ |
| G9 — CRM I | `player_profiles` (pgvector), `player_engagement_scores`, `notification_templates`, `message_deliveries`, `gap_detection_events`, `cancellation_predictions`, `bookings.cancellation_risk_score`/`campaign_id` | ⬜ |
| G10 — CRM II | `campaigns`, `ai_recommendations` (inbox variant — design decision due at Sprint 10 kickoff), `membership_plan_pricing` | ⬜ |

Already in place and reusable for CRM:
- `users` G1 columns (`is_suspended`, `suspension_reason`, `preferred_notification_channel`) and G7 demographics (`date_of_birth`, `gender`, `postcode`, lat/long — capture flow not built).
- Analytics MVs: `mv_player_value` already serves **inactive-members** and **most-active** endpoints — the rule-based churn list is nearly free.
- `promo_codes` (G6) with a `campaign_id` placeholder UUID awaiting the G10 FK.
- `support_tickets`/`support_messages` (G6) for the player↔club chat half of CRM.

---

## 2. Key recommendation — split G9 into G9a (messaging, no AI) and G9b (AI scoring)

`notification_templates` + `message_deliveries` have **no dependency on `ai_inference_log`** or any model call. Every Tier-1 story below needs them; none needs AI. Pull them into a **G9a** migration that can land immediately (before or alongside G8), leaving the AI-dependent tables (`player_profiles`, `player_engagement_scores`, `gap_detection_events`, `cancellation_predictions`) as **G9b** behind G8.

---

## 3. Schema gaps not yet in the target state (proposed additions)

These are the deltas this evaluation adds on top of the existing G8–G10 design. None contradicts the May-2026 simplification; each maps to a concrete backlog item.

### 3.1 Automation mode per AI feature — *the "club config for automated actions" setting*
- [ ] `ai_feature_flags.automation_mode` ENUM: `suggest` | `approve` | `auto`, default `suggest`.
  - `suggest` — AI writes to `ai_recommendations` inbox only; staff acts manually.
  - `approve` — AI prepares the action (campaign draft, gap offer); a staff click executes it.
  - `auto` — AI executes within guardrails and logs to the inbox retrospectively.
- This is the trust dial for the first client: every AI feature launches in `suggest`, gets promoted to `approve`, and only graduates to `auto` per-feature once the club is comfortable. `is_enabled` stays the on/off switch; `automation_mode` is orthogonal.
- Scope note: `ai_feature_flags` is tenant-level. Per-club overrides are deliberately deferred (YAGNI) until a multi-club tenant asks; the per-club **numeric guardrails** already planned on `clubs` (G8: `gap_detection_threshold_pct`, `max_gap_discount_pct`, `churn_inactive_days_threshold`) cover club-level variation for now.

### 3.2 Marketing consent — required before the first campaign send
- [ ] `users.marketing_opt_in` BOOLEAN default `false` + `users.marketing_opt_in_updated_at` TIMESTAMPTZ nullable.
- `message_deliveries.status` has an `unsubscribed` value but there is **nowhere to store the standing preference** — without this, an unsubscribe doesn't stop the next campaign. UK/EU clubs (GBP default) make this a GDPR/PECR compliance item, not a nice-to-have. Transactional sends (booking confirmations, reminders) are exempt and keyed off `preferred_notification_channel` as today.
- Campaign send pipeline must filter `WHERE marketing_opt_in = true`; the unsubscribe link flips the flag.

### 3.3 Segment tags — the missing home for auto-segmentation (#102)
- [ ] `player_profiles.tags` TEXT[] default `{}` + GIN index.
- **Inconsistency found in the target state:** `campaigns.target_filter` example references `"tags": ["competitive"]`, and #102 (auto-segment casual/competitive/corporate) needs an output column — but no `tags` column exists anywhere after `player_segments` was dropped. A tag array on `player_profiles` (AI-written, staff-editable) serves both, without resurrecting the segment tables.

### 3.4 Staff notes on players (#49)
- [ ] New small table `player_notes`: `id`, `club_id`, `user_id`, `author_id` (FK → users), `body` TEXT, `created_at`. Append-only.
- The classic CRM timeline ("called about membership renewal 3/6"). Deliberately minimal — no categories, no pinning, until a club asks.

### 3.5 Frequency guardrail (with automation mode)
- [ ] `clubs.max_marketing_msgs_per_week` INTEGER default `2` — hard cap consulted by any `auto`-mode sender so a player can't be hit by gap offers + re-engagement + flash sale in one week. Enforced against `message_deliveries WHERE source='campaign'` (plus `notification_type='gap_offer'`) per user per rolling 7 days.

---

## 4. User story priority tiers

### Tier 1 — Clear & obvious: demoable, deterministic, no model calls
*The CRM screens a prospect immediately understands. Build first; everything works without an AI provider key.*

| Issue | Story | Schema needed |
|---|---|---|
| [#130](https://github.com/kendavis23/SmashBook/issues/130) / [#167](https://github.com/kendavis23/SmashBook/issues/167) | Messaging infrastructure | **G9a**: `notification_templates`, `message_deliveries` |
| [#42](https://github.com/kendavis23/SmashBook/issues/42) | Pre-game reminder notifications | G9a + existing `clubs.reminder_hours_before` |
| [#17](https://github.com/kendavis23/SmashBook/issues/17) | Waitlist slot-open notification | G9a + existing `waitlist_entries` |
| [#91](https://github.com/kendavis23/SmashBook/issues/91) | Automated confirmations / reminders / waitlist alerts | G9a (this is the umbrella of the two above) |
| [#48](https://github.com/kendavis23/SmashBook/issues/48) | Staff send messages to players about bookings | G9a (`source='template'`, manual trigger) |
| [#67](https://github.com/kendavis23/SmashBook/issues/67) | Announcements & club news | `announcements` ✅ already migrated (G6) — endpoint work only |
| [#49](https://github.com/kendavis23/SmashBook/issues/49) | Staff view player profile + booking history | `player_profiles` (non-AI columns) + proposed `player_notes` (§3.4) + `tags` (§3.3) |
| [#50](https://github.com/kendavis23/SmashBook/issues/50) | Flag/suspend policy-breaching players | `users.is_suspended` ✅ already live — endpoint work only |
| [#99](https://github.com/kendavis23/SmashBook/issues/99) *(rule-based half)* | At-risk player list (no booking in X days) | `clubs.churn_inactive_days_threshold` (G8 col) — list itself already served by `mv_player_value` inactive-members endpoint |
| [#64](https://github.com/kendavis23/SmashBook/issues/64)/[#65](https://github.com/kendavis23/SmashBook/issues/65)/[#66](https://github.com/kendavis23/SmashBook/issues/66) | Player↔club support in-app | `support_tickets`/`support_messages` ✅ already migrated (G6) |
| [#244](https://github.com/kendavis23/SmashBook/issues/244)/[#245](https://github.com/kendavis23/SmashBook/issues/245) | Demographics + catchment map | `users` G7 cols ✅ — needs the registration intake/capture flow |

> The "player 360" screen — profile, booking history, spend (from `mv_player_value`), notes, tags, message history (from `message_deliveries`), suspension control — is the single most persuasive CRM demo and is buildable entirely from Tier 1.

### Tier 2 — AI-assisted, human-in-the-loop: co-develop with first client
*AI drafts, staff approves. Launch every feature in `automation_mode='suggest'`/`'approve'`.*

| Issue | Story | Schema needed |
|---|---|---|
| [#201](https://github.com/kendavis23/SmashBook/issues/201) | AI Phase 1 infrastructure | **G8** (prerequisite for everything below) |
| [#99](https://github.com/kendavis23/SmashBook/issues/99) *(AI half)* + [#100](https://github.com/kendavis23/SmashBook/issues/100) | Churn scoring + AI-drafted re-engagement messages | G9b: `player_engagement_scores`; Anthropic draft → `campaigns` row with `ai_drafted=true`, `is_approved=false` |
| [#79](https://github.com/kendavis23/SmashBook/issues/79)/[#80](https://github.com/kendavis23/SmashBook/issues/80)/[#81](https://github.com/kendavis23/SmashBook/issues/81)/[#82](https://github.com/kendavis23/SmashBook/issues/82) | Gap detection → targeted discount offers → smart notifications | G9b: `gap_detection_events`; offers delivered via `message_deliveries` (`notification_type='gap_offer'`); conversion via `converted_at` |
| [#102](https://github.com/kendavis23/SmashBook/issues/102) | Auto-segmentation (casual/competitive/corporate) | `player_profiles.tags` (§3.3) — Vertex classification writes tags |
| [#72](https://github.com/kendavis23/SmashBook/issues/72) | AI recommends segments to target with promo pricing | **G10**: `ai_recommendations` inbox + `campaigns.target_filter` |
| [#70](https://github.com/kendavis23/SmashBook/issues/70) | Apply discounts/promo codes to bookings | `promo_codes` ✅ — endpoint work; ties campaigns to redemptions |
| [#71](https://github.com/kendavis23/SmashBook/issues/71) | Dynamic pricing (suggest/approve mode) | G8 + existing `pricing_rules` surge columns |
| [#94](https://github.com/kendavis23/SmashBook/issues/94) | Auto-built skill & preference profile | G9b: `player_profiles` behavioural columns + nightly profile worker |

**`ai_recommendations` decision falls due here** *(now group G13, due at **Sprint 11 kickoff** after the 2026-06-12 restructure)*: confirm the **thin-inbox** variant (recommended in the target-state architectural note) — structured data stays in `gap_detection_events` / `player_engagement_scores` / etc.; the inbox row is just status/priority/title/rationale + polymorphic `source_event_id`.

### Tier 3 — Autonomous & complex: after client trust is earned
*Same tables, `automation_mode='auto'` — plus genuinely harder models. Don't show these first; sell them as the roadmap.*

| Issue | Story | Schema needed |
|---|---|---|
| [#101](https://github.com/kendavis23/SmashBook/issues/101) | Fully automatic re-engagement campaigns | flip churn pipeline to `auto` + §3.5 frequency cap |
| [#74](https://github.com/kendavis23/SmashBook/issues/74) | Hands-off dynamic pricing | flip pricing to `auto` |
| [#96](https://github.com/kendavis23/SmashBook/issues/96) | Cancellation prediction + early release prompt | G9b: `cancellation_predictions`, `bookings.cancellation_risk_score` |
| [#92](https://github.com/kendavis23/SmashBook/issues/92) | Skill/availability matchmaking | `player_profiles.embedding` (pgvector) + ivfflat index |
| [#83](https://github.com/kendavis23/SmashBook/issues/83) | AI slot suggestions from playing patterns | `player_profiles` prefs + embedding |
| [#86](https://github.com/kendavis23/SmashBook/issues/86) | Membership tier / top-up suggestions | `ai_recommendations` (`membership_upsell`) + `membership_plan_pricing` (G10) |
| [#76](https://github.com/kendavis23/SmashBook/issues/76) | AI insights dashboard (NL summaries) | no new tables — reads MVs + `ai_inference_log` |
| [#77](https://github.com/kendavis23/SmashBook/issues/77)/[#73](https://github.com/kendavis23/SmashBook/issues/73)/[#78](https://github.com/kendavis23/SmashBook/issues/78) | Payment anomaly/fraud alerts, auto-retry | `payments` G4 cols ✅ (`anomaly_flagged`, `retry_count`, …) + `ai_recommendations` (`anomaly_alert`) |
| [#109](https://github.com/kendavis23/SmashBook/issues/109)–[#112](https://github.com/kendavis23/SmashBook/issues/112) | Conversational booking / AI support chatbot | G12 — unchanged |

---

## 5. Migration build order

- [ ] **M1 — G9a (messaging core, no AI):** `notification_templates`, `message_deliveries` (+ enums `MessageSource`, `DeliveryStatus`, `NotificationChannel` reuse). Add §3.2 consent columns to `users` in the same migration. *(Unblocks all Tier-1 messaging stories.)*
- [ ] **M2 — Player 360 support:** `player_profiles` **without** `embedding` (defer pgvector + Cloud SQL flag until matchmaking), with §3.3 `tags`; new `player_notes` (§3.4). `UNIQUE(user_id, club_id)`.
- [ ] **M3 — G8 (AI foundation):** `ai_inference_log` (hand-written partition DDL — autogenerate won't emit it), `ai_feature_flags` **with §3.1 `automation_mode`**, `clubs` guardrail columns (+ §3.5 frequency cap), `subscription_plans` non-AI flag columns. Then retro-fit the deferred FKs (`skill_level_history.ai_inference_id`, `support_messages.ai_inference_id`).
- [ ] **M4 — G9b (churn scoring):** `player_engagement_scores` only *(trimmed 2026-06-12: `gap_detection_events` moved to G13/Sprint 11 and `cancellation_predictions` + `bookings.cancellation_risk_score` to G15/Sprint 13 — their stories are post-go-live; `bookings.campaign_id` moved to M5 with `campaigns`)*.
- [ ] **M5 — G10 (campaigns):** `campaigns`, `bookings.campaign_id`, `membership_plan_pricing`; enforce the deferred `promo_codes.campaign_id` FK. *(`ai_recommendations` moved to G13/Sprint 11 — confirm the thin-inbox variant at Sprint 11 kickoff.)*
- [ ] **M6 — G13 (post-go-live, Sprint 11):** `gap_detection_events`; `ai_recommendations`; `player_profiles.embedding` vector(384) + ivfflat index (`CREATE EXTENSION vector`; enable `cloudsql.enable_pgvector` first).

Each migration follows the Database Change Workflow in `CLAUDE.md` (autogenerate, review, up/down verify, update `DATA_MODEL.md` + flip target-state status + `ENTITY_RELATIONSHIPS.md`).

---

## 6. Backlog hygiene findings

1. ~~**Sprint labels disagree with the re-prioritised migration groups.**~~ **Resolved 2026-06-12** — the backlog settled the other way round from what this note predicted (churn #99/#101 → Sprint 10, gap detection #79–#82 → Sprint 11), and `DATA_MODEL_TARGET_STATE.md` was restructured to match the backlog (the backlog is now the source of truth for sprint anchors).
2. ~~**#102 has no schema home**~~ **Resolved 2026-06-12** — `player_profiles.tags` (§3.3) adopted into the target state (group G9-360).
3. **No consent model in the backlog** — §3.2 is now in the target state (`users.marketing_opt_in`, group G9a), but should still become a tracked issue; it blocks the first real campaign send (Sprint 10, pre-go-live).
4. **`ai_recommendations` decision** is due at **Sprint 11 kickoff** (moved to G13 in the 2026-06-12 restructure) — resolve it when M6 is scheduled, per the architectural note (thin inbox).
