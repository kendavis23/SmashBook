_Last updated: 2026-06-12 17:27 UTC_

# White-Label OTA & Rollback Runbook

Operational runbook for shipping over-the-air (OTA) updates and rolling them back per brand,
plus the OTA-channel convention. Implements
[FE_WHITE_LABEL_MOBILE_ARCHITECTURE_PLAN.md](FE_WHITE_LABEL_MOBILE_ARCHITECTURE_PLAN.md) §12.

---

## 1. What can ship OTA vs. needs a store rebuild

The build-time/runtime split (§2) maps directly onto OTA capability. **If a change touches
native identity, it needs a store rebuild; everything else is an OTA.**

| Change                               | Mechanism                  | Speed         |
| ------------------------------------ | -------------------------- | ------------- |
| Theme colour / token fix             | **OTA**                    | minutes       |
| In-app logo swap, copy change        | **OTA**                    | minutes       |
| Feature-flag default flip            | **OTA** or backend flag    | minutes       |
| JS / feature logic change            | **OTA** (shared JS bundle) | minutes       |
| App name / icon / splash / bundle id | **Store rebuild**          | days (review) |
| New native module                    | **Store rebuild**          | days          |

The published JS bundle is **brand-agnostic** — it reads its active brand at runtime
(`extra.brandId` for Model A; tenant→brand selection for Model B). One published JS update
can serve all brands; **channels** isolate which binaries actually receive it.

---

## 2. Channel convention

**One OTA channel per brand × environment**, named `<brandId>-<environment>`:

```
_default-production     ace-staging-production     ace-london-production
_default-preview        ace-staging-preview        ace-london-preview
```

- The channel is set per build: the CI matrix passes `--channel <brandId>-<profile>`
  (`scripts/brand-matrix.mjs` derives it), and an EAS Update targets the same channel.
- A brand's OTA must **never** land on another brand's binary. The channel name +
  `runtimeVersion` policy + the build-embedded `extra.brandId` guard are the three locks.
- `eas.json` defines only the **default** channels (`development` / `preview` / `production`)
  for un-parameterised local builds; per-brand channels are set at build invocation time, not
  hardcoded in `eas.json` (which is strict JSON and can't carry the matrix).

> **Channel vs. branch:** EAS distinguishes _channels_ (what a binary points at) from
> _branches_ (what an update is published to), linked by a mapping that defaults to 1:1 by
> name. This runbook relies on that default — `<brandId>-<environment>` names both, and
> commands below use `--channel` / `--branch` accordingly. **Never re-point a brand channel
> at a differently-named branch**; if a mapping is ever changed (e.g. for a staged rollout),
> every `--branch` invocation here must follow the mapping, not the name.

---

## 3. Publishing an OTA update

```bash
# from apps/mobile-player — publish a runtime/JS change to ONE brand×env channel
ACTIVE_BRAND=ace-london eas update \
  --channel ace-london-production \
  --message "fix CTA colour contrast"

# all dedicated brands at once (loop the registry — never a hand list):
for B in $(node ../../packages/branding/scripts/brand-matrix.mjs \
            | sed 's/^matrix=//' \
            | node -e "process.stdin.once('data',d=>console.log(JSON.parse(d).brand.map(x=>x.id).join('\n')))"); do
  ACTIVE_BRAND="$B" eas update --channel "$B-production" --message "shared JS fix"
done
```

**Runtime version:** use a `runtimeVersion` policy (`appVersion` or `fingerprint`) so an OTA
bundle only lands on compatible binaries. Bumping a native dependency changes the fingerprint
and correctly stops the OTA from reaching old binaries (they need a store rebuild instead).

---

## 4. Rollback

EAS Update rolls back by **republishing a previous update to the channel** (the "roll back to
embedded / previous update" flow). There is no in-place delete that un-ships an update — you
ship a newer update that supersedes it.

```bash
# 1. find the update to roll back to (per channel)
eas update:list --branch ace-london-production

# 2a. republish a known-good previous update group to the channel
eas update:republish --group <GOOD_GROUP_ID>

# 2b. …or roll the channel back to the binary's embedded bundle (nuclear option)
eas update:roll-back-to-embedded --channel ace-london-production
```

### Per-brand rollback procedure

1. **Confirm scope.** Is the bad update brand-specific (a colour/copy change to one brand) or
   the shared JS bundle (affects every brand on that update)? Check `eas update:list` per
   channel; the shared JS group id will appear across multiple brand channels.
2. **Roll back the affected channel(s).** For a shared-JS regression, republish the last-good
   group to **every** affected `<brand>-production` channel (loop as in §3). For a single
   brand, only that channel.
3. **Verify.** Re-open the app on the affected brand; confirm it pulls the rolled-back update
   (force-quit + relaunch to fetch). Watch crash/error dashboards **filtered to the brand** —
   this presupposes events are tagged with `brandId` (plan §15/§16); aggregate dashboards
   will hide a single-brand regression.
4. **Record.** Note the bad group id, the good group id rolled back to, and the affected
   channels in the incident log. Open a fix-forward PR — rollback is a stopgap, not the fix.

> **Guard rail:** because channels isolate brands, a rollback on `ace-london-production` does
> **not** touch `_default-production`. Always roll back the _narrowest_ set of channels that
> were actually serving the bad update.

---

## 5. Store submission (out of scope for OTA, here for completeness)

Native changes (name/icon/splash/bundle id/native modules) require a store rebuild + review.
The `mobile-brand-build.yml` workflow **builds**; promotion to the stores (`eas submit`) is a
separate, **human-gated** step (Apple Guideline 4.3 risk, §16) — never automatic.
