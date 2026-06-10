// `_default` brand — the SmashBook reference brand (plan §5.1, Phase 1).
//
// This IS today's look: the `theme` tokens below are a verbatim mirror of
// `apps/mobile-player/src/theme/themes.ts` (lightColors / darkColors), and the `native`
// identity mirrors `apps/mobile-player/app.config.ts`'s inlined BRAND object + assets.
//
// When the mobile theme tokens change, mirror them here (and vice-versa). The parity test
// guards the token *set*; values must be kept in sync by hand until Phase 2 inverts the
// source so the manifest becomes the single origin of the tokens.
//
// `deliveryModel: "shared"` — the default brand is the Model B fallback (plan §3).

import type { BrandManifest, ThemeColors } from "../../types";

// Resolved palette hexes (mobile palette.ts), inlined so this package has no dependency
// on the app. Keep aligned with apps/mobile-player/src/theme/palette.ts.
const c = {
    white: "#FFFFFF",
    black: "#000000",
    slate100: "#F1F5F9",
    slate200: "#E2E8F0",
    slate400: "#94A3B8",
    slate500: "#64748B",
    slate800: "#1E293B",
    slate900: "#0F172A",
    blue50: "#EFF6FF",
    blue200: "#BFDBFE",
    blue400: "#60A5FA",
    blue500: "#3B82F6",
    blue600: "#2563EB",
    blue700: "#1D4ED8",
    blue800: "#1E40AF",
    green50: "#F0FDF4",
    green500: "#22C55E",
    green700: "#15803D",
    amber50: "#FFFBEB",
    amber500: "#F59E0B",
    red50: "#FEF2F2",
    red500: "#EF4444",
} as const;

const light: ThemeColors = {
    background: c.white,
    foreground: c.slate900,
    card: c.white,
    cardForeground: c.slate900,
    primary: c.slate900,
    primaryForeground: c.white,
    secondary: c.slate100,
    secondaryForeground: c.slate900,
    muted: c.slate100,
    mutedForeground: c.slate500,
    accent: c.slate200,
    accentForeground: c.slate900,
    border: c.slate200,
    input: c.slate200,
    ring: c.blue500,

    cta: c.blue600,
    ctaForeground: c.white,
    ctaHover: c.blue700,
    ctaSurface: c.blue50,
    ctaBorder: c.blue200,

    destructive: c.red500,
    destructiveForeground: c.white,
    destructiveSurface: c.red50,
    success: c.green700,
    successForeground: c.white,
    successSurface: c.green50,
    warning: c.amber500,
    warningForeground: c.white,
    warningSurface: c.amber50,

    hero: c.blue600,
    heroForeground: c.white,
    heroMuted: c.blue200,
    heroGlass: "rgba(255,255,255,0.18)",
    heroGlassBorder: "rgba(255,255,255,0.25)",

    contentSurface: c.slate100,

    tabBar: c.white,
    tabBarBorder: "rgba(15,23,42,0.08)",
    tabActive: c.blue600,
    tabActiveLabel: c.slate900,
    tabInactive: c.slate400,

    overlay: "rgba(17,24,39,0.42)",
    placeholder: c.slate400,
    shadow: c.slate900,
    skeleton: c.slate100,
    ripple: "rgba(37,99,235,0.10)",
};

const dark: ThemeColors = {
    background: c.slate900,
    foreground: "#E1E7EF",
    card: "#0B1220",
    cardForeground: "#E1E7EF",
    primary: "#E1E7EF",
    primaryForeground: c.slate900,
    secondary: c.slate800,
    secondaryForeground: "#E1E7EF",
    muted: "#10192B",
    mutedForeground: c.slate400,
    accent: c.slate800,
    accentForeground: "#E1E7EF",
    border: "#1F2A3D",
    input: "#1F2A3D",
    ring: c.blue500,

    cta: c.blue500,
    ctaForeground: c.white,
    ctaHover: c.blue600,
    ctaSurface: "rgba(59,130,246,0.16)",
    ctaBorder: "rgba(59,130,246,0.32)",

    destructive: c.red500,
    destructiveForeground: c.white,
    destructiveSurface: "rgba(239,68,68,0.12)",
    success: c.green500,
    successForeground: c.white,
    successSurface: "rgba(34,197,94,0.12)",
    warning: c.amber500,
    warningForeground: c.white,
    warningSurface: "rgba(245,158,11,0.12)",

    hero: c.blue800,
    heroForeground: c.white,
    heroMuted: c.blue200,
    heroGlass: "rgba(255,255,255,0.12)",
    heroGlassBorder: "rgba(255,255,255,0.18)",

    contentSurface: c.slate900,

    tabBar: "#0B1220",
    tabBarBorder: "rgba(255,255,255,0.08)",
    tabActive: c.blue400,
    tabActiveLabel: "#E1E7EF",
    tabInactive: c.slate500,

    overlay: "rgba(0,0,0,0.6)",
    placeholder: c.slate500,
    shadow: c.black,
    skeleton: c.slate800,
    ripple: "rgba(96,165,250,0.16)",
};

export const defaultBrand: BrandManifest = {
    id: "_default",
    displayName: "SmashBook",
    deliveryModel: "shared",

    // BUILD-TIME native identity — mirrors apps/mobile-player/app.config.ts BRAND + assets.
    // Asset paths are relative to the app's asset root (consumed by app.config.ts in
    // Phase 3); the _default brand reuses the in-app `./assets/*` set rather than copies.
    native: {
        iosBundleId: "app.smashbook.mobile",
        androidPackage: "app.smashbook.mobile",
        scheme: "smashbook",
        easProjectId: "00000000-0000-0000-0000-000000000000",
        stripeMerchantId: "merchant.app.smashbook.mobile",
        icon: "./assets/icon.png",
        adaptiveIcon: "./assets/adaptive-icon.png",
        splash: "./assets/splash-icon.png",
        notificationIcon: "./assets/notification-icon.png",
        adaptiveIconBackgroundColor: "#FFFFFF",
        splashBackgroundColor: "#FFFFFF",
    },

    theme: { light, dark },
    fonts: { sans: "Inter" },
    logo: {
        wordmark: "./assets/icon.png",
        mark: "./assets/adaptive-icon.png",
    },
    flags: {},
    copy: {},
    links: {
        support: "https://smashbook.app/support",
        terms: "https://smashbook.app/terms",
        privacy: "https://smashbook.app/privacy",
    },
};
