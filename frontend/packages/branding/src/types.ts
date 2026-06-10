// Brand manifest types — the typed shape every brand under `src/brands/<id>/` must
// satisfy. See the white-label plan §5.2 (docs/FE_WHITE_LABEL_MOBILE_ARCHITECTURE_PLAN.md).
//
// Two structurally-separate sections encode the build-time vs runtime split (plan §2):
//   - `native`  → BUILD-TIME OS identity, consumed by app.config.ts (name/bundle/icon/...)
//   - everything else (theme, fonts, logo, flags, copy, links) → RUNTIME presentation,
//     consumed by BrandProvider (Phase 2).
//
// `ThemeColors` below MUST stay structurally identical to the mobile theme contract in
// `apps/mobile-player/src/theme/themes.ts`. The parity test in `src/schema.test.ts`
// asserts the key set matches so the two never drift (plan §16 — "maintenance drift").

export type DeliveryModel = "dedicated" | "shared";

// Mirror of apps/mobile-player/src/theme/themes.ts `ThemeColors`. Kept as a flat
// record of token → hex/rgba string so BrandProvider can feed it straight into the
// existing ThemeProvider with zero per-screen changes.
export type ThemeColors = {
    // Core surfaces / text
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    input: string;
    ring: string;

    // CTA (brand blue used for buttons/links)
    cta: string;
    ctaForeground: string;
    ctaHover: string;
    ctaSurface: string;
    ctaBorder: string;

    // Semantic states
    destructive: string;
    destructiveForeground: string;
    destructiveSurface: string;
    success: string;
    successForeground: string;
    successSurface: string;
    warning: string;
    warningForeground: string;
    warningSurface: string;

    // Brand "hero" header
    hero: string;
    heroForeground: string;
    heroMuted: string;
    heroGlass: string;
    heroGlassBorder: string;

    // Content area that lifts over the hero
    contentSurface: string;

    // Bottom tab bar
    tabBar: string;
    tabBarBorder: string;
    tabActive: string;
    tabActiveLabel: string;
    tabInactive: string;

    // Misc
    overlay: string;
    placeholder: string;
    shadow: string;
    skeleton: string;
    ripple: string;
};

export type BrandTheme = {
    light: ThemeColors;
    dark?: ThemeColors;
    // Optional CSS-var overrides for NativeWind `className` tokens (plan §5.3).
    // Map of CSS custom property name → value, applied at the root via `vars()` in Phase 2.
    tailwindOverrides?: Record<string, string>;
};

export type BrandFonts = {
    sans: string;
    mono?: string;
};

export type BrandLogo = {
    wordmark: string;
    mark: string;
    monochrome?: string;
};

// Feature gates (plan §8). Static layer of the layered flag resolution; the dynamic
// per-tenant layer is merged on top at runtime in Phase 5. Open record so brands can
// carry feature-specific booleans without a schema change per flag.
export type BrandFlags = Record<string, boolean>;

// BUILD-TIME native identity — consumed by app.config.ts (plan §5.4). Nothing here can
// change without a new native build.
export type BrandNative = {
    iosBundleId: string;
    androidPackage: string;
    scheme: string;
    easProjectId: string;
    stripeMerchantId: string;
    associatedDomains?: string[];
    icon: string;
    adaptiveIcon: string;
    splash: string;
    notificationIcon: string;
    adaptiveIconBackgroundColor: string;
    splashBackgroundColor: string;
};

export type BrandLinks = {
    support: string;
    terms: string;
    privacy: string;
};

export type BrandManifest = {
    id: string;
    displayName: string;
    deliveryModel: DeliveryModel;

    native: BrandNative;

    theme: BrandTheme;
    fonts: BrandFonts;
    logo: BrandLogo;
    flags: BrandFlags;
    copy: Record<string, string>;
    links: BrandLinks;

    // Tenant linkage — config/data only, NOT identity (plan §4). Subdomains this brand
    // is allowed to serve (Model A). Branding must never import auth/tenant internals.
    tenants?: string[];
};
