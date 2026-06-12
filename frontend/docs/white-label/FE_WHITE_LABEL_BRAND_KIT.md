_Last updated: 2026-06-12 17:27 UTC_

# White-Label Brand Kit & Onboarding Spec

The intake spec a club (or our onboarding team) fills to add a brand, and the pipeline
that turns that intake into a buildable brand. This is the **convention** half of "the
difference between 3 brands and 50 is automation and convention, not architecture"
([FE_WHITE_LABEL_MOBILE_ARCHITECTURE_PLAN.md](FE_WHITE_LABEL_MOBILE_ARCHITECTURE_PLAN.md) §15).
Adding a brand is **data + a pipeline run**, never bespoke engineering (Phase 6 exit criterion).

---

## 1. What a club supplies (the intake)

The whole point is that the input surface is small. A club provides **one master logo and a
colour spec** — everything else (the full 49-token light/dark theme, every icon size, the
splash, the notification icon) is **generated and validated**.

| Field                  | Required       | Notes                                                                                                            |
| ---------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Brand id**           | ✅             | kebab-case, globally unique (e.g. `ace-london`). Becomes the asset folder + OTA channel prefix.                  |
| **Display name**       | ✅             | Springboard/launcher label + store name (e.g. "Ace London").                                                     |
| **Delivery model**     | ✅             | `shared` (Model B, default — instant, no store build) or `dedicated` (Model A — own store listing).              |
| **Primary colour**     | ✅             | `#RRGGBB`. Drives CTA, hero, active tab, ring + all derived hover/surface/border variants.                       |
| **Secondary colour**   | optional       | Defaults to a near-black neutral. Text / primary surfaces.                                                       |
| **Background colour**  | optional       | Defaults to white (light). Dark-theme background is derived.                                                     |
| **Font family**        | optional       | One of the **curated** bundled set (default `Inter`). No client-supplied font files (licensing/bundle-size, §7). |
| **Master logo**        | ✅ (dedicated) | One high-res square master (SVG preferred, or ≥1024² PNG). All native icons are generated from it.               |
| **In-app logo**        | ✅             | Wordmark/header logo shown inside the app (distinct from the OS icon).                                           |
| **Native bundle ids**  | ✅ (dedicated) | `iosBundleId` + `androidPackage` (e.g. `app.acelondon.player`). Immutable once shipped.                          |
| **Associated domains** | optional       | Universal/app links (e.g. `applinks:ace.london`).                                                                |
| **Tenants served**     | optional       | Subdomains this brand may serve (Model B mapping). Config, not identity (§4).                                    |
| **Store listing copy** | ✅ (dedicated) | Description/subtitle, keywords, screenshots, App Privacy / Play data-safety answers, support + marketing URLs. Required for review — and meaningfully different listings are themselves a Guideline 4.3 mitigation (plan §15/§16). |
| **Push config**        | ✅ (dedicated) | A Firebase app per bundle id → `google-services.json` + `GoogleService-Info.plist` (wired via `app.config.ts` `googleServicesFile`), plus an APNs key registration. Without it, the brand's app silently receives no notifications. |

Everything else in the resolved manifest — the complete theme, scheme, Stripe merchant id,
asset background colours — is **derived** by `defineBrand()`. Reaching for a per-token
override (`themeOverrides` / `nativeOverrides`) often is the "missing abstraction" signal;
prefer extending the generator (§15).

---

## 2. Authoring a brand (the manifest)

A brand is a single `BrandInput` expanded by `defineBrand()`. Copy an existing brand
(`packages/branding/src/brands/ace-staging/brand.config.ts`) and edit the intake fields:

```ts
// packages/branding/src/brands/ace-london/brand.config.ts
import { defineBrand } from "../../define-brand";

export const aceLondonBrand = defineBrand({
    id: "ace-london",
    displayName: "Ace London",
    deliveryModel: "dedicated",
    native: {
        iosBundleId: "app.acelondon.player",
        androidPackage: "app.acelondon.player",
        icon: "./assets/ace-london/icon.png",
        adaptiveIcon: "./assets/ace-london/adaptive-icon.png",
        splash: "./assets/ace-london/splash-icon.png",
        notificationIcon: "./assets/ace-london/notification-icon.png",
    },
    branding: { primaryColor: "#7C3AED" }, // the one essential input
    assets: { logo: "./assets/ace-london/icon.png" },
    links: { support: "…", terms: "…", privacy: "…" },
    tenants: ["ace-london"],
});
```

Then register it (the single iterable — §15):

```ts
// packages/branding/src/registry.ts
import { aceLondonBrand } from "./brands/ace-london/brand.config";
export const brandRegistry = { /* … */, "ace-london": aceLondonBrand };
```

And mirror the **native** identity into `apps/mobile-player/app.config.ts`'s
`BRAND_REGISTRY` (Expo's config loader can't import the TS package at build time — see the
comment in that file).

---

## 3. Generating assets (the pipeline)

The asset generator is **registry-driven**: it reads each brand's accent colour and output
paths straight from the resolved manifest (via `scripts/brands.generated.json`, kept in sync
by `asset-descriptors.test.ts`) and emits every required size from one master geometry.
No per-brand asset script — adding a brand to the registry is enough.

```bash
# from packages/branding
REGEN=1 pnpm test -- asset-descriptors   # 1. refresh the registry → JSON projection
node scripts/generate-assets.mjs ace-london   # 2. generate that brand's assets
node scripts/generate-assets.mjs              # …or all brands
node scripts/generate-assets.mjs --dedicated  # …or only Model A brands
```

| Asset (`native.<key>`) | Size      | Alpha                            | Used for                         |
| ---------------------- | --------- | -------------------------------- | -------------------------------- |
| `icon`                 | 1024×1024 | **no** (App Store rejects alpha) | iOS app icon                     |
| `adaptiveIcon`         | 1024×1024 | yes                              | Android adaptive icon foreground |
| `splash`               | 1024×1024 | yes                              | Native splash logo               |
| `notificationIcon`     | 96×96     | yes (white-on-transparent)       | Android notification icon        |

> The generated PNGs are correctly-dimensioned **placeholders** (accent field + geometric
> mark). For a production dedicated brand, hand the master logo to a designer and drop the
> exported PNGs in at the sizes above — the dimensions and alpha rules are validated in CI
> regardless of source (§4), so a bad export fails the build, not a customer's first launch.

---

## 4. CI validation (the gate)

`pnpm --filter @repo/branding test` runs `validate-brands` and must pass before any native
build (plan §11). It asserts, for **every** brand in the registry:

- the manifest Zod-validates and defines all 49 `ThemeColors` tokens (`schema.test.ts`);
- the theme token set matches the mobile `ThemeColors` contract (compile-time parity guard);
- all four native assets exist **and are at the correct dimensions + alpha** (`asset-dimensions.test.ts`);
- `brands.generated.json` is in sync with the registry (`asset-descriptors.test.ts`).

The `.github/workflows/mobile-brand-build.yml` workflow runs this as its first gate.

---

## 5. New-brand checklist

1. Fill the intake (§1); confirm `dedicated` vs `shared`.
2. Author `brands/<id>/brand.config.ts`; register in `registry.ts`; mirror native into `app.config.ts`.
3. `REGEN=1 pnpm test -- asset-descriptors` → `node scripts/generate-assets.mjs <id>`.
4. Replace placeholder PNGs with final art (dedicated brands only).
5. `pnpm --filter @repo/branding test` — green (schema + dimensions + sync).
6. **Dedicated only — native onboarding** (the per-brand manual steps):
    - `eas init` under the brand's account → real `easProjectId`; update `brand.config.ts` + `app.config.ts`.
    - `eas credentials` → provision iOS cert/provisioning + Android keystore (EAS-managed, §10).
    - Provision the brand's Firebase app + APNs key; add `google-services.json` /
      `GoogleService-Info.plist` and wire them via `googleServicesFile` (plan §10).
    - `ACTIVE_BRAND=<id> npx expo start` — verify the theme renders in the dev client.
    - `ACTIVE_BRAND=<id> eas build --profile preview --platform all` → smoke-test on TestFlight /
      internal track — **including receiving a push notification** (the per-brand push config is
      the easiest thing to get silently wrong).
    - Prepare the store listing (description, keywords, screenshots, App Privacy / data-safety
      answers, support URL) — `eas submit` is blocked without it.
    - Create OTA channel `<id>-production` (and `<id>-preview`) in EAS Update.
    - Production build via the workflow; **manual approval gate** before `eas submit` (Apple Guideline 4.3 / Play repetitive-content, §16).
7. **Shared (Model B)** — no native build: add the club's subdomain to the brand's `tenants[]`
   (and the backend brand↔tenant mapping row once that endpoint lands, §13). The shared
   `_default` binary re-skins to the brand at runtime.

See [FE_WHITE_LABEL_OTA_RUNBOOK.md](FE_WHITE_LABEL_OTA_RUNBOOK.md) for channels, OTA updates, and rollback.

---

## 6. Offboarding a brand (the reverse path)

Defined now, before the first churn — not improvised during one.

1. **Dedicated (Model A):** publish a final OTA with an end-of-service notice → remove the
   store listing (or transfer the app to the club's own accounts — cleanest when they owned
   the accounts from the start, plan §15) → remove the brand from `registry.ts` (drops it
   from the build matrix, asset pipeline, and CI automatically — the registry is the single
   iterable) → revoke EAS credentials, push keys, and CI secrets for the brand → stop
   publishing to its OTA channels.
2. **Shared (Model B):** remove the club's subdomain from the brand's `tenants[]` (and the
   backend mapping row) — players fall back to `_default` at next brand resolution. No build.
3. **Either way:** bundle ids are never reused for a different brand, and the retired brand
   id is not recycled (OTA channel history and incident logs reference it).
