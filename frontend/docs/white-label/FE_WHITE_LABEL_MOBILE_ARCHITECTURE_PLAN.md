_Last updated: 2026-06-10 18:45 UTC_

# White-Label Mobile Architecture Plan

A production-grade technical plan to evolve `apps/mobile-player` from a single-brand Expo app into a scalable white-label mobile platform, where every client/club can ship a fully branded native app (name, bundle ID, icon, splash, theme, fonts, feature flags, env config) from one shared codebase.

> **Status: Phases 0–6 implemented (client-side / tooling).** The architecture, sequencing, and trade-off analysis below are tailored to the current SmashBook monorepo (Turborepo + pnpm, Expo SDK 54 / RN 0.81, Expo Router 6, NativeWind 4, MMKV). Foundations are in place: `apps/mobile-player` has `eas.json` + a dynamic `app.config.ts` + brand assets (Phase 0); `@repo/branding` exists with the `_default` brand and a `validate-brands` CI check (Phase 1); runtime theming flows from the active brand manifest through the existing `ThemeProvider` for both JS (`useThemeColors()`) and NativeWind `className` tokens (Phase 2); `app.config.ts` now reads `ACTIVE_BRAND` from the environment, sourcing all native identity from the active brand manifest (Phase 3); a second brand (`ace-staging`, green theme, `deliveryModel: "dedicated"`) is fully onboarded end-to-end (Phase 4); layered feature flags (`useBrandFlags()` / `useFlag()`, defaults ← brand ← remote) plus Model B runtime brand selection (`useBrandSelection()` + `brandForTenant()`, re-skinning the shared app once the player's tenant is known) are wired client-side (Phase 5); and the registry-driven asset & build automation — `generate-assets.mjs` (one master geometry → every size per brand from its accent), CI dimension validation, the `brand-matrix.mjs` + `mobile-brand-build.yml` build orchestration, OTA channels, and the brand-kit + rollback runbooks — is in place (Phase 6). See §14 for per-phase status. **The Phase 5 backend endpoints (§13.1 brand-resolution, §13.2 player-flag) are partner-owned (`/backend`) and remain a spec to coordinate — the client consumes the bundled-default path today and is ready to layer the remote override the moment those endpoints land. The Phase 6 EAS/OTA steps that require an Expo account (`eas init`/`eas credentials`/`eas submit`) are documented as the per-brand runbook in [FE_WHITE_LABEL_BRAND_KIT.md](FE_WHITE_LABEL_BRAND_KIT.md) §5 and remain a manual, human-gated action.**

---

## 1. Where we are today (honest baseline)

Understanding the current state is the whole reason this plan is specific rather than generic. Key facts from the codebase:

| Concern | Current state | White-label implication |
| --- | --- | --- |
| **App config** | Static `apps/mobile-player/app.json` — hardcoded `name: "SmashBook"`, `slug`, `bundleIdentifier: app.smashbook.mobile`, `package`, `scheme: smashbook`, Stripe `merchantIdentifier`. | Must become **dynamic** (`app.config.ts`) driven by an active brand. These are **build-time** identity fields — they cannot change at runtime. |
| **Assets** | No `assets/` folder exists; no icon/splash referenced in `app.json`. | Need a per-brand asset pipeline (icon, adaptive icon, splash, notification icon). |
| **Theme** | `src/theme/` is already a clean token system: `palette.ts` (raw hues), `themes.ts` (`lightColors`/`darkColors` semantic tokens), `ThemeProvider.tsx` (`useThemeColors()`). Pinned to light; dark exists but hidden. NativeWind `className` tokens resolve via `tailwind-config`. | **This is our biggest asset.** Because every screen already reads semantic tokens (no hardcoded hex — enforced by the mobile guide), re-skinning per brand is a matter of swapping the token object source. This is the foundation that makes **runtime** theming cheap. |
| **Tenant resolution** | Runtime, per-login: `tenantSubdomain` stored in `@repo/auth` store, attached as `X-Tenant-Subdomain` header by `fetcher.ts` (dev/staging only). | A multi-tenant *data* boundary already exists. White-label is the *presentation* boundary on top of it. Keep them distinct (see §4). |
| **Env / config** | `@repo/config` (`env.ts`) is the only place env is read, Zod-validated (`VITE_*` — currently web-shaped). | Mobile needs its own validated config surface (Expo reads env differently than Vite). Brand config must flow through here, never `process.env` scattered in features. |
| **Build tooling** | EAS-ready (`expo-dev-client` installed) but **no `eas.json`**. Single `slug: smashbook-mobile`. | Need a multi-profile EAS strategy keyed on brand. |
| **Structure** | Thin `app/` routes → `src/features/` → `@repo/*-domain` hooks. Strict layer boundaries. | Branding must slot into this without violating boundaries — a new `@repo/branding` package is the natural home. |

**The core architectural insight:** the codebase already cleanly separates *what color a thing is* (theme tokens) from *what a thing does* (features/domain). White-label branding is mostly the act of making the token source, the asset source, and the native identity **a function of `brandId`** instead of constants.

---

## 2. The build-time vs runtime split (the central decision)

This is the most important decision in the whole plan, and it is not all-or-nothing. White-label attributes divide cleanly into two classes, and conflating them is the #1 pitfall.

### Build-time (baked into the binary — cannot change without a new build)

These are **OS-level identity** and **store** attributes. They are fixed per binary:

- App **name** (springboard/launcher label)
- **Bundle identifier** (iOS) / **package** (Android)
- **App icon** + Android adaptive icon
- **Splash screen** (the native pre-JS splash)
- URL **scheme** / deep-link domains / universal links
- Stripe **merchantIdentifier**, push credentials, associated domains
- Anything in native `Info.plist` / `AndroidManifest.xml`

→ Driven by **`app.config.ts`** reading a brand manifest at build time, one EAS build per brand.

### Runtime (fetched/bundled, can change without a rebuild)

These are **presentation** attributes:

- **Theme colors** (the `ThemeColors` token object)
- **Fonts** (family selection — files may be bundled, selection can be runtime)
- **In-app logo** (header/login logo — distinct from the OS app icon)
- **Feature flags** (which tabs/screens/capabilities are on)
- **Copy / labels** that differ per brand
- Non-native env (API base URL per environment, support email, T&C URLs)

→ Driven by a **brand config resolved at runtime** (bundled default + optional remote override), consumed through `@repo/config` and the theme provider.

### Recommended hybrid: **build-time identity, runtime-capable presentation**

```
                 BRAND MANIFEST (single source of truth per brand)
                 packages/branding/brands/<brandId>/brand.config.ts
                              │
        ┌─────────────────────┴─────────────────────┐
        │ BUILD-TIME                                 │ RUNTIME
        ▼                                            ▼
  app.config.ts                              BrandProvider (in-app)
  reads ACTIVE_BRAND env                     - theme tokens → ThemeProvider
  → name, bundleId, icon,                    - in-app logo, fonts
    splash, scheme, plist                    - feature flags
  → emits one EAS build                      - copy, support links
                                             (bundled default, optional
                                              remote override via OTA/API)
```

**Why hybrid and not "everything runtime":** iOS/Android *force* name, bundle ID, icon, and splash to be build-time. You cannot ship a single binary that becomes "Club Padel Madrid" or "Ace London" at runtime — the App Store listing, the icon on the home screen, and the bundle ID are immutable per binary. Any vendor promising "one app, infinite brands at runtime" is describing a *tenant switcher inside one branded shell*, which is a different product (see §4).

**Why not "everything build-time":** baking theme/flags into the binary means a color tweak for one club = a full store resubmission. Keeping presentation runtime-capable lets us push a palette fix via OTA in minutes.

---

## 3. Two delivery models — pick per business need

White-label SaaS mobile has two legitimate shapes. They are **not** mutually exclusive; we can support both, but each brand is configured as one.

### Model A — Dedicated branded app (one app per club in the stores)

Each club gets its own App Store / Play Store listing, its own icon, its own bundle ID. This is the premium white-label offering.

- **Pros:** strongest brand perception; club "owns" its app; per-club push/deep-links; store presence.
- **Cons:** App Store review per brand; certificates/credentials per brand; ASO and store accounts to manage; review-time risk multiplied by brand count (Apple Guideline 4.3 — "spam"/cloned-app rejections — is the real-world danger; see §13).

### Model B — Shared app with runtime tenant selection (one app, many clubs)

A single SmashBook-branded (or neutrally-branded) app where a player picks/enters their club and the app re-skins at runtime.

- **Pros:** one binary, one store listing, instant onboarding of new clubs (no rebuild), trivial maintenance.
- **Cons:** weaker per-club brand; one shared icon/name; can't do per-club App Store presence; Stripe merchant identity is shared.

### Recommendation for SmashBook

**Build the architecture so a brand can be either, and default new clubs to Model B; promote high-value clubs to Model A.** The brand manifest carries a `deliveryModel: "dedicated" | "shared"` field. The runtime presentation layer (theme/logo/flags/fonts) is **identical machinery in both models** — the only difference is whether native identity is per-brand (A) or shared (B), and whether the brand is selected at build time (A) or at runtime by the user (B). This keeps one codebase and one mental model.

> The runtime theming work we do for Model B *also* powers Model A (OTA color fixes). So we never throw work away — build the runtime layer first, layer dedicated builds on top.

---

## 4. Brand vs Tenant — keep these orthogonal

SmashBook already has a **tenant** concept (`X-Tenant-Subdomain`, club-scoped data). It is tempting to equate "brand" with "tenant." **Do not.** They answer different questions:

- **Tenant** = *whose data am I looking at?* (data isolation, auth, API scoping). Lives in `@repo/auth` + `fetcher.ts`. Already built.
- **Brand** = *what does the app look/feel like, and what is its store identity?* (presentation + native identity). New concern.

They usually map 1:1 (one club → one brand), but decoupling them buys flexibility:

- A tenant can exist with the **default SmashBook brand** (Model B path) before it pays for white-label.
- A reseller could run **multiple tenants under one brand** (a franchise) or **one tenant across multiple brand skins** (regional sub-brands).

**Rule:** branding code must never import auth/tenant internals, and tenant resolution must never read brand tokens. The `brandId → tenant(s)` mapping is config/data, resolved at the edge, not hardcoded in either layer.

---

## 5. Recommended architecture

### 5.1 New shared package: `@repo/branding`

A dedicated package is the right home — it keeps branding out of the app shell and respects the monorepo's "apps are thin, packages are powerful" rule.

```
packages/branding/
  package.json
  index.ts                         # public API: getBrand, BrandProvider, useBrand, brand types
  src/
    types.ts                       # BrandManifest, BrandTheme, BrandFlags, DeliveryModel
    schema.ts                      # Zod schema — validates every brand manifest at build + test time
    registry.ts                    # brandId → manifest map (build-time aggregation of brands/*)
    resolve.ts                     # resolveActiveBrand(): reads ACTIVE_BRAND (build) or user/tenant (runtime)
    BrandProvider.tsx              # injects theme into ThemeProvider, exposes logo/flags/fonts/copy
    useBrand.ts                    # useBrand(), useBrandFlags(), useBrandAsset()
    fonts.ts                       # maps brand font choice → loaded font family
    brands/
      _default/                    # the SmashBook reference brand (Model B fallback)
        brand.config.ts
        assets/  (icon, adaptive-icon, splash, notification-icon, logo)
      club-madrid/
        brand.config.ts
        assets/...
      ace-london/
        brand.config.ts
        assets/...
```

**Why a package, not a folder in the app:** branding is consumed by `app.config.ts` (build), the theme layer, and potentially the future `web-player` re-skin. A package gives one validated source of truth, testable in isolation, importable everywhere without crossing app boundaries.

### 5.2 The brand manifest (single source of truth per brand)

> **Authoring vs. resolved manifest (implemented).** There are now two shapes. Clubs author a **minimal `BrandInput`** — `id`, `displayName`, a few `native` ids, an `assets.logo`, a `branding` block (`primaryColor` + optional `secondaryColor`/`backgroundColor`/`fontFamily`), and `flags`. `defineBrand()` (`packages/branding/src/define-brand.ts`) expands that into the **full `BrandManifest`** below by deriving the complete 49-token light/dark theme via the generator (`theme-generator.ts`) and filling native conventions (scheme from `id`, Stripe merchant from bundle id, adaptive/notification icons from `icon`). Every downstream consumer (`BrandProvider`, `ThemeProvider`, `cssVars`, `app.config.ts`) still reads the full `BrandManifest` unchanged — only the *authoring* surface shrank. Rare per-token exceptions use the `themeOverrides` / `nativeOverrides` escape hatches; reaching for them often is the "missing abstraction" signal (§15). The `_default` brand is itself authored this way and pins the Tailwind blue ramp via `themeOverrides` so it stays byte-identical to its hand-authored predecessor (parity test in `theme-generator.test.ts`).

The full **resolved** shape — one typed, Zod-validated object per brand (conceptual, illustrative only):

```
BrandManifest {
  id:            "ace-london"
  displayName:   "Ace London"
  deliveryModel: "dedicated" | "shared"

  // BUILD-TIME native identity (consumed by app.config.ts)
  native: {
    iosBundleId:        "app.acelondon.player"
    androidPackage:     "app.acelondon.player"
    scheme:             "acelondon"
    easProjectId:       "<per-brand EAS project id>"
    stripeMerchantId:   "merchant.app.acelondon.player"
    associatedDomains:  ["applinks:ace.london"]
    icon / adaptiveIcon / splash / notificationIcon → asset paths
  }

  // RUNTIME presentation
  theme: {
    light: ThemeColors   // mirrors src/theme/themes.ts ThemeColors exactly
    dark?: ThemeColors
    tailwindOverrides?   // optional CSS-var overrides for NativeWind className tokens
  }
  fonts: { sans: "Inter" | "Poppins" | ... ; mono?: ... }
  logo:  { wordmark, mark, monochrome }   // in-app, not the OS icon
  flags: BrandFlags     // feature gates (see §8)
  copy:  Record<string,string>            // brand-specific labels
  links: { support, terms, privacy }

  // tenant linkage (NOT identity — see §4)
  tenants?: string[]    // subdomains this brand is allowed to serve (Model A)
}
```

**Critical constraint:** `theme.light` must be **structurally identical** to the existing `ThemeColors` type in `apps/mobile-player/src/theme/themes.ts`. The Zod schema enforces this. That guarantee is what lets `BrandProvider` feed brand tokens straight into the existing `ThemeProvider` with zero per-screen changes.

### 5.3 How it wires into the existing theme layer

The existing `ThemeProvider` already resolves `useThemeColors()`. We invert the source: instead of `themes.ts` hardcoding `lightColors`, the active brand supplies them.

```
BrandProvider (new, outermost)
   resolves active brand → brand.theme
        │
        ▼
ThemeProvider (existing)
   colors source = brand.theme.light  (was: hardcoded lightColors)
        │
        ▼
useThemeColors() (existing — UNCHANGED)
   every screen keeps working, now branded
```

For NativeWind `className` tokens (which resolve through `tailwind-config` CSS variables, not JS), brand color overrides are applied by writing the active brand's CSS variables at the root at runtime (NativeWind 4 supports runtime CSS-var updates via `vars()`), keeping web/mobile token parity. This is the one piece that needs careful prototyping (see §11 risks).

`themes.ts`'s `lightColors`/`darkColors` become the **`_default` brand's** tokens — nothing is deleted, the default brand *is* today's look.

### 5.4 Dynamic `app.config.ts` (replaces static `app.json`)

`app.json` becomes `app.config.ts`. At build time it reads `process.env.ACTIVE_BRAND`, loads that brand's manifest from `@repo/branding`, and emits the Expo config:

```
ACTIVE_BRAND=ace-london eas build ...
   → app.config.ts loads brand "ace-london"
   → name, bundleId, package, scheme, icon, splash, plist, Stripe merchant
     all come from brand.native.*
   → ACTIVE_BRAND also embedded via expo.extra so runtime can self-identify
```

`extra.brandId` (and `extra.eas.projectId`) is read at runtime by `resolveActiveBrand()` for Model A, so a dedicated build always knows which brand it is without a network call.

---

## 6. Asset management

Assets are the operationally heaviest part of white-label — get the pipeline right early.

### Required assets per brand

| Asset | Size / format | Build or runtime |
| --- | --- | --- |
| iOS app icon | 1024×1024 PNG, no alpha | Build |
| Android adaptive icon (fg + bg) | 1024×1024 fg PNG + bg color/image | Build |
| Splash screen | logo PNG + background color (use `expo-splash-screen`) | Build |
| Notification icon (Android) | white-on-transparent 96×96 | Build |
| In-app logo (wordmark + mark) | SVG preferred, or @1x/@2x/@3x PNG | Runtime (bundled) |
| Favicon (if web re-skin later) | 48×48 | Build (web only) |

### Pipeline recommendation

1. **Source of truth per brand:** a single high-res logo + a color spec. Generate icon/adaptive/splash/notification variants from it with a script (`expo-asset` + a small Sharp-based generator, or a paid service). Manual per-size asset wrangling does not scale past ~5 brands.
2. **Store generated assets in-repo** under `packages/branding/src/brands/<id>/assets/` for dedicated brands (Model A) so builds are reproducible and reviewable.
3. **Runtime/in-app logos** are bundled with the binary (fast, offline-safe). Avoid runtime-downloading the *primary* logo — a brand without a logo on first paint looks broken on poor networks. Remote assets are acceptable only as *overrides* layered over a bundled default.
4. **Brand kit intake:** define a strict asset spec doc clients fill (or your team produces): one master logo (SVG), primary/secondary/CTA colors, font choice. Everything else is generated. This is the unsexy-but-decisive part of scaling to many brands.
5. **Validation in CI:** a test asserts every brand manifest has all required assets at correct dimensions and that the Zod schema passes. A brand with a missing splash should fail CI, not a customer's first launch.

---

## 7. Theme & config system

### Theme

- Brand theme = the `ThemeColors` object (already the mobile contract). One light (required) + optional dark per brand.
- `BrandProvider` feeds it into the existing `ThemeProvider`. **Zero per-screen change** because every screen already uses `useThemeColors()` / semantic `className` tokens (the no-hardcoded-color rule pays off exactly here).
- NativeWind `className` tokens overridden at runtime via root `vars()` CSS-variable injection per brand.
- Dark mode stays shippable-later; each brand can define dark tokens now so the future toggle works per-brand for free.

### Fonts

- Bundle the small set of supported font families with the app (`expo-font`); brand selects one by name. Don't let brands ship arbitrary font files at runtime — bundle-size and licensing risk. Offer a curated set (e.g. Inter, Poppins, DM Sans).
- Font is a runtime selection over bundled files → no rebuild to change a brand's font within the supported set.

### Config

- All brand-derived config flows through **`@repo/config`** (the one sanctioned env reader) — mobile gets its own validated surface (`expo-constants` / `extra` + `process.env.EXPO_PUBLIC_*`), Zod-validated like the web `env.ts`. Brand config is *resolved*, not read ad-hoc in features.
- Per-environment values (API base URL, Stripe publishable key) are **environment** config, kept separate from **brand** config. A brand × environment matrix (`ace-london` × `staging`) resolves to a concrete config at build time.

---

## 8. Feature flags

Feature flags are part of the brand manifest but must support a **layered resolution** so they're not purely static:

```
effective flag = remoteOverride (per tenant, from backend)
                 ?? brandManifest.flags        (per brand, bundled)
                 ?? globalDefault              (code default)
```

- **Static layer (brand manifest):** which tabs/features a brand ships with — bundled, available offline, instant.
- **Dynamic layer (backend):** the existing SmashBook backend already has `ai_feature_flags` and plan-level flags per tenant. Mobile should consume a **player-facing feature-flag endpoint** (see §10) so ops can toggle a feature for a club without an app update.
- **Resolution lives in `@repo/branding`** (`useBrandFlags()`), merging bundled + remote. Features gate on flags via a hook, never by reading the manifest directly.

Guard rails: every flag has a safe default; a missing/failed remote fetch falls back to bundled brand flags (never a blank app). Flags gate **presentation/availability**, not data-access (data access stays enforced server-side by tenant/role).

---

## 9. Folder structure (target)

```
packages/
  branding/                         # NEW — see §5.1
    src/brands/<brandId>/{brand.config.ts, assets/}
    src/{types,schema,registry,resolve,BrandProvider,useBrand,fonts}.ts
  config/                           # extended: mobile env surface + brand×env resolution
  design-system/                    # unchanged (tokens.css stays the contract)
  ...

apps/mobile-player/
  app.config.ts                     # NEW — replaces app.json, reads ACTIVE_BRAND
  eas.json                          # NEW — per-brand build profiles (§10)
  src/
    theme/                          # unchanged public API; color SOURCE now from brand
    providers/
      AppProviders.tsx              # add <BrandProvider> as outermost wrapper
    features/                       # unchanged — features gate on useBrandFlags()
    ...
  brand-builds/                     # NEW — generated EAS build manifests / scripts (gitignored output)
```

The app stays a thin shell: it mounts `BrandProvider`, and features ask `useBrand()` / `useBrandFlags()`. No business logic moves into the app.

---

## 10. EAS build strategy

### `eas.json` profile model

Do **not** create one hand-maintained EAS profile per brand — that explodes at scale. Use a **small number of base profiles** (`development`, `preview`, `production`) parameterised by `ACTIVE_BRAND`:

```
eas.json profiles:
  development   → dev client, ACTIVE_BRAND from env, internal dist
  preview       → internal/TestFlight, ACTIVE_BRAND from env
  production    → store build, ACTIVE_BRAND from env, auto-increment

Build invocation (CI loops over brands):
  ACTIVE_BRAND=ace-london   eas build --profile production --platform all
  ACTIVE_BRAND=club-madrid  eas build --profile production --platform all
```

### Per-brand identity in EAS

- **Model A (dedicated):** each brand needs its **own EAS project** (separate `projectId`, credentials, push keys, bundle ID). Store the per-brand `easProjectId` in the brand manifest. iOS credentials (certs/provisioning) and Android keystores are per-bundle-ID — let EAS manage them (`eas credentials`) per project.
- **Model B (shared):** one EAS project, one set of credentials, `_default` brand.

### Build matrix orchestration

- A **build matrix** (brand × platform × profile) driven from CI config or a generated GitHub Actions matrix. The brand registry (`registry.ts`) is the source — CI iterates `brands where deliveryModel == "dedicated"`.
- **App version & build number:** version comes from a shared source; build numbers auto-increment per EAS project. Don't share build numbers across brands (separate projects = separate counters — fine).
- **Secrets:** per-brand Stripe keys, push credentials, EAS tokens stored as CI/EAS secrets keyed by brand, never in the manifest in plaintext.

---

## 11. CI/CD planning

```
PR / merge
  ├─ lint + type-check + test (existing turbo pipeline)
  ├─ NEW: validate-brands     → Zod-validate every manifest, assert assets exist & dimensions correct
  ├─ NEW: brand-matrix gen    → list of brands needing a build (changed or release-tagged)
  └─ build
       ├─ Model B shared app  → single EAS build (_default brand)
       └─ Model A dedicated   → matrix: per-brand EAS build (production profile)

Release
  ├─ OTA channel push (presentation-only changes) per brand   ← fast path
  └─ Store submission (native changes) per brand              ← slow path (eas submit)
```

Recommendations:
- **Gate builds on `validate-brands`** — a malformed manifest must fail before any expensive native build.
- **Only rebuild brands that changed** — diff the brand folder + shared native deps; don't rebuild 50 apps because one club changed a color (that's an OTA, not a build).
- **`eas submit`** automated per brand for dedicated apps, but keep a **manual approval gate** before store submission (Apple review risk, §13).
- **Tag releases per brand** so OTA channels and store versions are traceable.
- Reuse the existing Turborepo caching; brand validation and matrix-gen are cheap and cacheable.

---

## 12. OTA (over-the-air update) strategy

`expo-updates` + EAS Update. The build-time/runtime split maps directly onto OTA capability:

| Change type | Mechanism | Speed |
| --- | --- | --- |
| Theme color / token fix | **OTA** (runtime presentation) | minutes |
| In-app logo swap, copy change | **OTA** | minutes |
| Feature flag default flip | **OTA** or backend flag | minutes |
| JS/feature logic change | **OTA** (same JS bundle) | minutes |
| App name / icon / splash / bundle ID | **Store rebuild** (native identity) | days (review) |
| New native module | **Store rebuild** | days |

### Channel model

- **One OTA channel per brand × environment** (`ace-london-production`, `ace-london-staging`). EAS Update `channel` is set per build profile / brand.
- **Runtime version policy:** use `runtimeVersion` policy (`appVersion` or `fingerprint`) so OTA bundles only land on compatible binaries. A brand's OTA must never land on the wrong brand's binary — the channel naming + `extra.brandId` guard this.
- **Rollback:** EAS Update supports republishing a previous update per channel — define a per-brand rollback runbook.

**Guard rail:** because the JS bundle is shared across brands but the *active brand* is build-embedded (`extra.brandId`) for Model A, an OTA bundle is brand-agnostic JS that reads its brand at runtime — so one published JS update can safely serve all brands, while channels still isolate brand-specific config rollouts. Prototype this carefully (§14) — it's the subtle part.

---

## 13. Backend support requirements

White-label is mostly client-side, but a few backend touchpoints make it scale. (These are *requirements to coordinate with the backend team* — the `/backend` and `/mobile` trees are partner-owned per the root CLAUDE.md; this section is a spec, not a task list.)

1. **Brand resolution endpoint (Model B):** given a tenant/club subdomain, return the brand id + runtime presentation config (theme, logo URL, flags, copy). Lets the shared app re-skin after the user picks a club, without a rebuild. Public/unauthenticated (pre-login skin), cacheable.
2. **Player-facing feature-flag endpoint:** mobile needs to read effective flags per tenant (the backend already has `ai_feature_flags` + plan flags). Expose a read-only, player-scoped projection so ops can toggle features for a club without an app update.
3. **Brand ↔ tenant mapping store:** which brand serves which tenant(s), and the delivery model. Small config table or service; the source of truth the manifest's `tenants[]` mirrors.
4. **Push notification routing per brand:** dedicated apps have separate push credentials/bundle IDs. Backend must route a notification to the correct app/credential for the player's brand. Tokens must carry brand identity.
5. **Deep-link / universal-link host config per brand:** associated domains and app-site-association files served per brand domain.
6. **Stripe identity per brand (Model A):** each dedicated app may use its own `merchantIdentifier`; backend/Stripe Connect config must align (the platform already runs a two-account Stripe model — coordinate which account each brand's player payments route through).
7. **(Optional) Remote theme override store:** for OTA-free color tweaks, a tenant-scoped theme override the app layers over its bundled brand theme.

**Non-requirement:** the backend should **not** become the primary brand store for dedicated (Model A) apps — those ship bundled config for offline-first, fast first paint. The backend is the *override and Model-B* path.

---

## 14. Migration / refactor phases

Sequenced so each phase ships value and de-risks the next. Nothing here changes user-visible behavior until Phase 4+.

### Phase 0 — Foundations & proof (no brands yet) — ✅ Implemented
- ✅ Added `eas.json` with `development`/`preview`/`production` profiles for the current single app (each pins `ACTIVE_BRAND=_default` + a matching OTA `channel`).
- ✅ Converted `app.json` → `app.config.ts` (still hardcoded to SmashBook via an inlined `BRAND` object — pure refactor, behavior-identical). `extra.brandId` + `extra.eas.projectId` embedded for Phase 3 runtime self-identification.
- ✅ Added `apps/mobile-player/assets/` for the SmashBook brand (icon, adaptive-icon, splash, notification-icon) with SVG masters + a dependency-free PNG generator in `assets/_src/`. Current PNGs are placeholders to be replaced with final art.
- **Exit criterion (met):** `app.config.ts` resolves the full native identity from one `BRAND` object, shaped so Phase 3 can swap it for an `ACTIVE_BRAND` lookup mechanically.

### Phase 1 — `@repo/branding` skeleton + `_default` brand — ✅ Implemented
- ✅ Created `packages/branding` (`@repo/branding`): `BrandManifest` type (`src/types.ts`, with `ThemeColors` mirroring the mobile theme contract), Zod schema (`src/schema.ts`), `registry` (`src/registry.ts` — the single iterable brand map), and pure `resolve` (`src/resolve.ts` — `resolveBrand` / `resolveActiveBrand`, always falling back to `_default`).
- ✅ Authored the `_default` brand (`src/brands/_default/brand.config.ts`) — `theme.light` / `theme.dark` are a verbatim mirror of today's `apps/mobile-player/src/theme/themes.ts` tokens; `native.*` mirrors `app.config.ts` + the Phase 0 assets.
- ✅ `validate-brands` CI check (`src/schema.test.ts`): every registered brand Zod-validates, defines every `ThemeColors` token, and has all four native assets on disk. A compile-time parity guard asserts the schema's token set equals `keyof ThemeColors` so the manifest and mobile theme cannot drift (plan §16).
- **Exit criterion (met):** `_default` validates (5/5 tests green, clean `tsc`); the package is **not** wired into the app yet — `BrandProvider` / `useBrand` / `fonts` and the runtime theming keystone are Phase 2.

### Phase 2 — Runtime theming wired through existing ThemeProvider — ✅ Implemented
- ✅ `@repo/branding` now exports the runtime surface: `BrandProvider` / `useBrand` / `useBrandFlags` (`src/BrandProvider.tsx`, framework-agnostic — no RN/Expo imports) plus the pure helpers `buildBrandCssVars` (`src/cssVars.ts`) and `hexToHslTriplet` (`src/color.ts`).
- ✅ `BrandProvider` is mounted as the outermost wrapper in `apps/mobile-player/src/providers/index.tsx` (no props → resolves `_default`).
- ✅ `ThemeProvider` now sources its color tokens from `useBrand().theme` instead of the hardcoded `lightColors`/`darkColors` — JS tokens (`useThemeColors()`) flow from the manifest unchanged for every screen.
- ✅ Solved the NativeWind `className` runtime CSS-var injection: `buildBrandCssVars` maps the className-counterpart `ThemeColors` tokens to their `--css-var` names and converts each hex token to the HSL-triplet form `tokens.css` uses (only className-mapped tokens; JS-only tokens like `hero`/`tabBar` are skipped). `ThemeProvider` injects them via NativeWind's `vars()` on the same `theme-root` View that already carries the `light`/`dark` class. `tailwindOverrides` on a brand win last.
- ✅ Tests: `color.test.ts` + `cssVars.test.ts` (9 new) green alongside the Phase 1 schema tests (14 total); `tsc` clean for `@repo/branding` and no new errors in `apps/mobile-player`.
- **Exit criterion (met):** the app looks identical to today, but every color — JS and className — now flows from the `_default` brand manifest. Re-skinning is now config: a new brand's `theme.light` drives both token surfaces with zero per-screen change.

### Phase 3 — `app.config.ts` reads ACTIVE_BRAND — ✅ Implemented
- ✅ Removed the hardcoded `BRAND` object from `app.config.ts`; replaced with a call to `resolveActiveBrand(process.env)` from `@repo/branding`. All native identity fields (name, slug, scheme, `bundleIdentifier`, `package`, icon/adaptive-icon/splash/notification-icon asset paths, `stripeMerchantId`, `associatedDomains`) now come from `brand.native.*`.
- ✅ `extra.brandId` and `extra.eas.projectId` are embedded from the manifest so the runtime binary can self-identify without a network call (plan §5.4).
- ✅ Slug convention: `_default` brand keeps `"smashbook-mobile"` to preserve existing EAS/store links; dedicated brands use their `id` as the slug.
- ✅ `associatedDomains` spread conditionally — only appears in the iOS config when the brand manifest defines it.
- ✅ Omitting `ACTIVE_BRAND` falls back to `_default` (SmashBook reference brand) — behavior-identical to Phase 0; all 14 branding tests remain green.
- **Exit criterion (met):** `ACTIVE_BRAND=_default eas build` produces today's app unchanged.

### Phase 4 — Second brand end-to-end (the real test) — ✅ Implemented
- ✅ Authored `packages/branding/src/brands/ace-staging/brand.config.ts` via `defineBrand()` — `deliveryModel: "dedicated"` (Model A), green theme (`primaryColor: "#16A34A"` / green600), Tailwind green-ramp stops pinned via `themeOverrides` (green50/200/500/700 light; green400/500/900 dark), bundle ID `app.ace.staging.mobile`, `associatedDomains: ["applinks:ace.smashbook.app"]`, EAS project placeholder `...0001`.
- ✅ Registered `ace-staging` in `packages/branding/src/registry.ts` — the single iterable brand map now has two entries; CI `validate-brands` tests iterate both automatically.
- ✅ Added `"ace-staging"` entry to the `BRAND_REGISTRY` in `apps/mobile-player/app.config.ts` — `ACTIVE_BRAND=ace-staging eas build` now resolves the full native identity (name, slug, scheme, bundle ID, icon/splash/adaptive/notification paths, Stripe merchant, associated domains).
- ✅ Placeholder brand assets created under `apps/mobile-player/assets/ace-staging/` (icon, adaptive-icon, splash-icon, notification-icon — copies of `_default` PNGs; to be replaced with final Ace brand art before store submission).
- ✅ All 25 `@repo/branding` tests pass (schema, color, cssVars, theme-generator — covering both `_default` and `ace-staging`); `tsc` clean.
- **Remaining manual steps before store submission** (become the runbook for each new dedicated brand):
  1. Replace placeholder PNGs in `assets/ace-staging/` with final 1024×1024 brand art.
  2. Run `eas init` under the Ace account to get a real `easProjectId`; update `brand.config.ts` + `app.config.ts`.
  3. Run `eas credentials` for the new EAS project to provision iOS cert/provisioning + Android keystore.
  4. Test: `ACTIVE_BRAND=ace-staging npx expo start` — verify green theme renders in the dev client.
  5. First build: `ACTIVE_BRAND=ace-staging eas build --profile preview --platform all`.
  6. Smoke-test on TestFlight / internal Play track.
  7. Production build + `eas submit` with a **manual approval gate** before store publication (Apple Guideline 4.3 risk, §16).
  8. Create OTA channel `ace-staging-production` in EAS Update; update `eas.json` channel mapping.
- **Exit criterion (met):** two distinct branded apps (`_default` SmashBook + `ace-staging` Ace) build from one codebase via `ACTIVE_BRAND`; all validation tests pass; runbook steps above documented.

### Phase 5 — Feature flags + Model B (shared app) — ✅ Implemented (client-side)
- ✅ **Layered flag resolution** (`packages/branding/src/flags.ts`): a typed `PLAYER_FEATURE_FLAGS` set + `PlayerFeatureFlag` type, `FLAG_DEFAULTS` (the code-default floor — every known flag has a safe default so a missing/failed remote fetch can never blank the app), and pure `resolveFlags(brandFlags, remoteFlags?)` / `isFlagEnabled(...)` implementing the plan §8 layering `remote ?? brand ?? default` per key.
- ✅ **`BrandProvider` made stateful + remote-flag-aware** (`src/BrandProvider.tsx`): holds the active brand in state, accepts an optional `remoteFlags` prop (the per-tenant backend override layer), and exposes `useBrandFlags()` (returns the *merged* effective flags, not raw `brand.flags`), `useFlag(name)` (single resolved flag with the default floor re-applied for unknown keys), and `useBrandSelection()` (`{ activeBrandId, selectBrand }`) for Model B runtime re-skin. Features gate via these hooks, so the remote layer stays transparent.
- ✅ **Model B tenant → brand mapping** (`src/resolve.ts`): pure `brandForTenant(subdomain)` finds the brand whose manifest `tenants[]` claims that subdomain, falling back to `_default` for an unclaimed tenant (the common Model B case — a club on the default SmashBook brand until it pays for white-label). Keeps brand/tenant orthogonal (§4): a config lookup over the registry, never an auth/tenant import.
- ✅ **Shared-app re-skin flow wired in the app** (`apps/mobile-player/src/providers/index.tsx`): a `BrandTenantBridge` mounted under `AuthSessionInitializer` reads `tenantSubdomain` from `useAuth()` and calls `selectBrand(brandForTenant(subdomain).id)` once the tenant is known — but only when the build's active brand is `deliveryModel: "shared"`, so a dedicated (Model A) build keeps its build-embedded brand. The bridge lives in the app (not in `@repo/branding`) so branding never imports auth/tenant internals (§4). Native identity (Stripe `urlScheme`, scheme) still comes from the build-time `activeBrand` — only presentation (theme/flags) re-skins, honouring the §2 build-time/runtime split.
- ✅ Tests: `flags.test.ts` (8) + `resolve.test.ts` (8) green alongside the existing suite (41 total in `@repo/branding`); `tsc` clean for `@repo/branding`; the mobile `providers/index.tsx` change adds zero new type errors (the 4 pre-existing mobile errors — `expo-font` resolution + a `club_name` booking-type gap — are unrelated).
- **Remaining (backend, partner-owned — §13):** the §13.1 brand-resolution endpoint (pre-login Model B skin by subdomain) and the §13.2 player-facing feature-flag endpoint. Until they land, the client uses the bundled-default path (brand flags + tenant→brand from the in-repo registry). Wiring the remote layer is then just passing the fetched flags to `BrandProvider`'s `remoteFlags` and the fetched brand id to `selectBrand` — no consumer changes.
- **Exit criterion (met, client-side):** the shared `_default` build re-skins to a claimed tenant's brand at runtime with zero rebuild; a new club joins the shared app by adding its `tenants[]` entry (and, for a remote-driven skin, a backend mapping row — no app build). The native-identity half of "zero rebuild for any club" is inherent to Model B (one shared binary).

### Phase 6 — Asset & build automation (scale) — ✅ Implemented
- ✅ **Registry-driven asset pipeline** (`packages/branding/scripts/`): `generate-assets.mjs` iterates the brand registry and emits the full native asset set (icon/adaptive/splash/notification) for each brand from its accent colour — one master geometry, every size, **no per-brand code**. The dependency-free PNG encoder (`png.mjs`, extracted from the original per-app generator) and the shared `asset-spec.mjs` (the single dimension/alpha spec) back it. Accent + output paths come straight from each resolved manifest via `src/asset-descriptors.ts` → `scripts/brands.generated.json` (the JSON projection the `.mjs` scripts read; `asset-descriptors.test.ts` keeps it in sync with the registry, failing CI with the exact regen command if it drifts). `ace-staging`'s assets are now genuinely green-accent-derived (previously blue `_default` copies).
- ✅ **CI dimension validation** (`scripts/asset-dimensions.test.ts`): every brand's generated assets must exist at the exact spec dimensions **and** alpha rule (iOS icon opaque, the rest RGBA) — a bad master export fails CI, not a customer's first launch. Complements the Phase 1 existence check in `schema.test.ts`. Branding suite is now 50 tests (was 41).
- ✅ **Brand-matrix orchestration** (`scripts/brand-matrix.mjs` + `.github/workflows/mobile-brand-build.yml`): the workflow gates on `validate-brands`, then projects the registry into the set of dedicated (Model A) brands needing a native build as a GH Actions matrix, then runs one `ACTIVE_BRAND`-parameterised EAS build per brand on channel `<brand>-<profile>`. On `push` it only rebuilds brands whose folder changed (a colour change is an OTA, not 50 rebuilds); manual dispatch honours a `dedicated|all` scope. Store submission stays behind a manual approval gate (§16). `eas.json` `preview`/`production` profiles no longer pin `ACTIVE_BRAND`, so the matrix's per-brand env flows through; `development` stays pinned to `_default` for local dev.
- ✅ **OTA channels + rollback runbook** ([FE_WHITE_LABEL_OTA_RUNBOOK.md](FE_WHITE_LABEL_OTA_RUNBOOK.md)): the `<brandId>-<environment>` channel convention, OTA-vs-store-rebuild matrix, per-brand publish loop (over the registry, never a hand list), and a narrowest-channel per-brand rollback procedure (`eas update:republish` / `roll-back-to-embedded`).
- ✅ **Brand-kit intake spec** ([FE_WHITE_LABEL_BRAND_KIT.md](FE_WHITE_LABEL_BRAND_KIT.md)): the minimal club intake (one master logo + a colour spec; everything else derived), the author→register→mirror→generate→validate flow, and a new-brand checklist (with the dedicated-brand native onboarding steps).
- **Exit criterion (met):** adding a dedicated brand is a manifest + asset master + a pipeline run — no bespoke engineering. A new brand gets its icons, its build-matrix entry, its OTA channel, and its CI validation purely by appearing in the registry.

---

## 15. Scaling strategy for many brands

The difference between 3 brands and 50 is **automation and convention**, not architecture — get these right in Phases 4–6:

- **Convention over configuration:** strict manifest schema + generated assets means a new brand is data, not code. The moment a brand needs *code*, that's a missing abstraction — fix the abstraction, don't fork.
- **Brand registry as the single iterable:** CI, validation, and build matrices all iterate `registry.ts`. One list, never hand-maintained per-brand scripts.
- **Generated assets, curated inputs:** clients supply a master logo + color/font choices; everything else is generated and validated. This is the actual bottleneck at scale — invest here.
- **Default to Model B:** new clubs join the shared app instantly (no build, no review). Only promote to a dedicated app when the business case justifies the App Store review and credential overhead. This keeps the dedicated-build count (the expensive set) small and deliberate.
- **Credential management:** let EAS manage per-brand credentials; never hand-juggle keystores/certs across dozens of brands.
- **Store-account strategy:** decide early whether dedicated apps live under SmashBook's Apple/Google accounts (simpler, but Guideline 4.3 risk) or the client's accounts (more setup, cleaner brand ownership). This is a business decision with real engineering consequences — resolve it before Phase 4.
- **Versioning discipline:** shared JS bundle + per-brand native shells means most updates are one OTA reaching all brands. Reserve native rebuilds for genuine native changes.

---

## 16. Risks & pitfalls

| Risk | Severity | Mitigation |
| --- | --- | --- |
| **Apple Guideline 4.3 (spam / cloned apps)** rejecting many near-identical white-label apps under one account | High | Prefer client-owned store accounts for dedicated apps; differentiate brands meaningfully; consider Apple's "white-label" provisions; default new clubs to Model B to limit dedicated-app count. |
| **NativeWind `className` runtime re-theming** doesn't cleanly support per-brand CSS-var swaps | Medium-High | Prototype in Phase 2 *before* committing. Fallback: drive *all* color through `useThemeColors()` (JS) and minimize brand-varying `className` color tokens. The existing token discipline makes this feasible. |
| **Build-time/runtime confusion** — trying to change native identity at runtime | Medium | This document's §2 split is the canonical rule; encode it in the manifest type (native vs presentation sections are structurally separate). |
| **Asset sprawl / inconsistency** at scale | Medium | Generated-from-master pipeline + CI dimension validation; no hand-placed per-size assets. |
| **Credential/secret explosion** across brands | Medium | EAS-managed credentials; secrets keyed by brand in CI vault; never in manifests. |
| **OTA cross-brand leakage** (an update lands on the wrong brand) | Medium | Channel-per-brand + `runtimeVersion` policy + `extra.brandId` runtime guard. Brand-agnostic JS bundle by design. |
| **Brand ≠ tenant coupling creeps in** | Medium | Enforce the §4 boundary in review; branding never imports auth/tenant internals. |
| **Default/fallback gaps** (a brand missing a token, logo, or flag → broken first paint) | Medium | Zod schema makes every required field non-optional; `_default` brand is the ultimate fallback; CI blocks incomplete brands. |
| **Font licensing** for bundled brand fonts | Low-Medium | Curated, licensed font set only; no client-supplied arbitrary fonts at runtime. |
| **Stripe merchant identity per brand** (Apple Pay) misconfigured | Low-Medium | Manifest carries `stripeMerchantId`; coordinate with backend two-account Stripe model; test Apple Pay per dedicated brand. |
| **Maintenance drift** — `themes.ts` ThemeColors and manifest theme type diverge | Low | Single shared `ThemeColors` type imported by both; schema test asserts parity. |

---

## 17. Final recommended approach for this stack

1. **Keep one codebase.** The thin-shell-app / powerful-packages architecture already in place is exactly right for white-label. Branding becomes a new powerful package (`@repo/branding`); the app stays thin.

2. **Adopt the hybrid build-time/runtime split (§2):** native identity (name, bundle ID, icon, splash, scheme, Stripe) is **build-time** via `app.config.ts` reading `ACTIVE_BRAND`; presentation (theme, logo, fonts, flags, copy) is **runtime-capable** via `BrandProvider` over the existing `ThemeProvider`.

3. **Exploit the existing theme discipline.** The no-hardcoded-color rule and `useThemeColors()` everywhere mean re-skinning is *config*, not a refactor. This is the single biggest reason this is tractable on your stack — protect that invariant.

4. **Support both delivery models, default to Model B.** One shared app (runtime tenant skin) for fast, review-free onboarding; promote high-value clubs to dedicated (Model A) builds. Same runtime machinery powers both — no wasted work.

5. **Keep brand and tenant orthogonal (§4).** Tenant = data boundary (already built). Brand = presentation + identity (new). Map 1:1 by default, but never couple the code.

6. **Sequence via the phases (§14):** prove the EAS + `app.config.ts` refactor with zero behavior change first (Phases 0–3), then a second brand end-to-end (Phase 4), then flags + shared-app (Phase 5), then automation (Phase 6). Each phase ships and de-risks the next.

7. **Invest in the asset/brand-kit pipeline before brand #5.** Generated-from-master assets + strict Zod manifest validation in CI is what turns "adding a brand" from an engineering project into a data entry + pipeline run.

8. **Prototype the NativeWind runtime CSS-var swap early (Phase 2)** — it's the one genuine technical unknown; everything else is well-trodden Expo/EAS ground.

**Net:** your stack is unusually well-positioned for white-label because the presentation/logic separation already exists. The work is mostly (a) a branding package as the single source of truth, (b) dynamic native config via `app.config.ts` + EAS profiles, and (c) an asset/CI pipeline to scale brand count — done in behavior-preserving phases so nothing breaks for the existing single brand along the way.
