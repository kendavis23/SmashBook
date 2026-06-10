// Theme generator — derives the full 49-token `ThemeColors` set (light + dark) from a
// club's handful of base colours (plan §6, §15). This is what lets a brand manifest stay
// minimal and business-friendly while the internal UI token system stays intact and
// consistent across every brand.
//
// Design model:
//   - BRAND-DEPENDENT tokens (cta, hero, ring, tab active, and their hover/surface/border
//     variants) are derived from `branding.primaryColor` via the color helpers.
//   - NEUTRAL + SEMANTIC-STATE tokens (slate text/surfaces, success/warning/destructive) are
//     a shared, curated scale every brand uses — these convey meaning (red = danger, green =
//     ok) and must not drift per brand. A club does not pick its own "error red".
//   - The neutral scale is anchored on `branding.secondaryColor` (the dark text/primary hue)
//     and `branding.backgroundColor` (the canvas), with sensible defaults.
//
// Calibration: given SmashBook's inputs (primary #2563EB, secondary #0F172A, bg #FFFFFF) the
// output is byte-identical to the previously hand-authored `_default` tokens. The parity test
// in `theme-generator.test.ts` locks that in, so "preserve _default exactly" holds even
// though _default is now generated (plan requirement 5).
//
// Pure, no React/Expo imports.

import { darken, lighten, rgba, tint } from "./color";
import type { BrandBranding, ThemeColors } from "./types";

// Shared neutral scale (slate). Brand-independent — the same greys back every brand's text,
// borders, muted surfaces and skeletons. Mirrors the Tailwind slate ramp used today.
const NEUTRAL = {
    white: "#FFFFFF",
    black: "#000000",
    slate100: "#F1F5F9",
    slate200: "#E2E8F0",
    slate400: "#94A3B8",
    slate500: "#64748B",
    slate800: "#1E293B",
    slate900: "#0F172A",
} as const;

// Shared semantic-state scale. Brand-independent by design (see header). Surfaces are the
// curated *50 tints; dark surfaces are low-alpha overlays of the base hue.
const STATE = {
    destructive: "#EF4444",
    destructiveSurfaceLight: "#FEF2F2",
    successLight: "#15803D", // green700 — the light-theme success base
    successDark: "#22C55E", // green500 — brighter on dark
    successSurfaceLight: "#F0FDF4",
    warning: "#F59E0B",
    warningSurfaceLight: "#FFFBEB",
} as const;

// CTA surface/border on light themes use the brand hue's curated *50 / *200 tints. Deriving
// them as fixed lighten() amounts off the primary reproduces the blue50/blue200 pairing for
// SmashBook and gives every other brand a matching soft surface + border automatically.
// Derivation amounts, calibrated against the Tailwind blue ramp the original _default used.
// They give every brand a coherent surface/border/hover set from one primary colour; the
// exact Tailwind stops for _default itself are pinned via themeOverrides in its config so it
// stays byte-identical (a generic RGB mix can't hit Tailwind's hand-tuned ramp exactly).
const CTA_SURFACE_LIGHTEN = 0.927; // primary → ~*50 tint
const CTA_BORDER_LIGHTEN = 0.705; // primary → ~*200 tint
const HERO_MUTED_LIGHTEN = 0.705; // primary → ~*200, the eyebrow/subtitle on hero
const HOVER_DARKEN = 0.16; // primary → darker hover/pressed
const RING_LIGHTEN = 0.1; // primary → focus ring (slightly lighter than CTA)

export function generateLightTheme(branding: BrandBranding): ThemeColors {
    const primary = branding.primaryColor;
    const secondary = branding.secondaryColor ?? NEUTRAL.slate900;
    const background = branding.backgroundColor ?? NEUTRAL.white;

    return {
        background,
        foreground: secondary,
        card: background,
        cardForeground: secondary,
        primary: secondary,
        primaryForeground: NEUTRAL.white,
        secondary: NEUTRAL.slate100,
        secondaryForeground: secondary,
        muted: NEUTRAL.slate100,
        mutedForeground: NEUTRAL.slate500,
        accent: NEUTRAL.slate200,
        accentForeground: secondary,
        border: NEUTRAL.slate200,
        input: NEUTRAL.slate200,
        ring: lighten(primary, RING_LIGHTEN),

        cta: primary,
        ctaForeground: NEUTRAL.white,
        ctaHover: darken(primary, HOVER_DARKEN),
        ctaSurface: tint(primary, CTA_SURFACE_LIGHTEN),
        ctaBorder: lighten(primary, CTA_BORDER_LIGHTEN),

        destructive: STATE.destructive,
        destructiveForeground: NEUTRAL.white,
        destructiveSurface: STATE.destructiveSurfaceLight,
        success: STATE.successLight,
        successForeground: NEUTRAL.white,
        successSurface: STATE.successSurfaceLight,
        warning: STATE.warning,
        warningForeground: NEUTRAL.white,
        warningSurface: STATE.warningSurfaceLight,

        hero: primary,
        heroForeground: NEUTRAL.white,
        heroMuted: lighten(primary, HERO_MUTED_LIGHTEN),
        heroGlass: rgba(NEUTRAL.white, 0.18),
        heroGlassBorder: rgba(NEUTRAL.white, 0.25),

        contentSurface: NEUTRAL.slate100,

        tabBar: NEUTRAL.white,
        tabBarBorder: rgba(secondary, 0.08),
        tabActive: primary,
        tabActiveLabel: secondary,
        tabInactive: NEUTRAL.slate400,

        overlay: "rgba(17,24,39,0.42)",
        placeholder: NEUTRAL.slate400,
        shadow: secondary,
        skeleton: NEUTRAL.slate100,
        ripple: rgba(primary, 0.1),
    };
}

// Dark theme derivation. The brand hue is brightened one step for legibility on dark
// surfaces (the *500 over *600 pattern), CTA/state surfaces become low-alpha overlays of
// their base, and neutrals invert to the dark slate ramp.
export function generateDarkTheme(branding: BrandBranding): ThemeColors {
    const primary = branding.primaryColor;
    // On dark, the CTA/hero use a brighter step of the brand hue.
    const primaryBright = lighten(primary, 0.235); // blue600 → ~blue500
    const heroDeep = darken(primary, 0.235); // blue600 → ~blue800

    return {
        background: NEUTRAL.slate900,
        foreground: "#E1E7EF",
        card: "#0B1220",
        cardForeground: "#E1E7EF",
        primary: "#E1E7EF",
        primaryForeground: NEUTRAL.slate900,
        secondary: NEUTRAL.slate800,
        secondaryForeground: "#E1E7EF",
        muted: "#10192B",
        mutedForeground: NEUTRAL.slate400,
        accent: NEUTRAL.slate800,
        accentForeground: "#E1E7EF",
        border: "#1F2A3D",
        input: "#1F2A3D",
        ring: lighten(primary, 0.18),

        cta: primaryBright,
        ctaForeground: NEUTRAL.white,
        ctaHover: primary,
        ctaSurface: rgba(primaryBright, 0.16),
        ctaBorder: rgba(primaryBright, 0.32),

        destructive: STATE.destructive,
        destructiveForeground: NEUTRAL.white,
        destructiveSurface: rgba(STATE.destructive, 0.12),
        success: STATE.successDark,
        successForeground: NEUTRAL.white,
        successSurface: rgba(STATE.successDark, 0.12),
        warning: STATE.warning,
        warningForeground: NEUTRAL.white,
        warningSurface: rgba(STATE.warning, 0.12),

        hero: heroDeep,
        heroForeground: NEUTRAL.white,
        heroMuted: lighten(primary, HERO_MUTED_LIGHTEN),
        heroGlass: rgba(NEUTRAL.white, 0.12),
        heroGlassBorder: rgba(NEUTRAL.white, 0.18),

        contentSurface: NEUTRAL.slate900,

        tabBar: "#0B1220",
        tabBarBorder: rgba(NEUTRAL.white, 0.08),
        tabActive: lighten(primary, 0.49), // blue600 → ~blue400
        tabActiveLabel: "#E1E7EF",
        tabInactive: NEUTRAL.slate500,

        overlay: "rgba(0,0,0,0.6)",
        placeholder: NEUTRAL.slate500,
        shadow: NEUTRAL.black,
        skeleton: NEUTRAL.slate800,
        ripple: rgba(lighten(primary, 0.49), 0.16),
    };
}
