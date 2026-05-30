// Semantic theme tokens for React Native inline styles and `color` props.
//
// Why this exists: the web reads design tokens via `hsl(var(--token))` CSS variables,
// but React Native inline `style={{}}` and props like `<Ionicons color={...} />` cannot
// resolve CSS custom properties. This file is the RN-side source of truth — the same
// token names the web exposes, resolved to concrete hex per theme. NativeWind `className`
// usage continues to resolve tokens through tailwind-config; this covers everything that
// must live in JS (inline styles, icon colors, shadows, ripple, placeholder colors).
//
// Keep the token *names* aligned with `packages/design-system/tokens/tokens.css`. When a
// token value changes there, mirror it here so web and mobile stay visually identical.

import { palette } from "./palette";

export type ThemeColors = {
    // Core surfaces / text (mirrors tokens.css)
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
    ctaSurface: string; // soft blue tint for selected/active surfaces
    ctaBorder: string; // soft blue border to pair with ctaSurface

    // Semantic states (each with a soft surface + strong fg, mirroring web usage)
    destructive: string;
    destructiveForeground: string;
    destructiveSurface: string;
    success: string;
    successForeground: string;
    successSurface: string;
    warning: string;
    warningForeground: string;
    warningSurface: string;

    // Brand "hero" header (the blue bleed-into-status-bar pattern)
    hero: string;
    heroForeground: string; // title text on hero
    heroMuted: string; // eyebrow / subtitle text on hero
    heroGlass: string; // frosted-glass button fill
    heroGlassBorder: string; // frosted-glass button border

    // Content area that lifts over the hero
    contentSurface: string;

    // Bottom tab bar
    tabBar: string;
    tabBarBorder: string;
    tabActive: string;
    tabActiveLabel: string;
    tabInactive: string;

    // Misc
    overlay: string; // modal scrim
    placeholder: string; // text input placeholder
    shadow: string; // shadowColor base
    skeleton: string;
    ripple: string; // android_ripple tint (translucent)
};

export type Theme = {
    mode: "light" | "dark";
    colors: ThemeColors;
};

export const lightColors: ThemeColors = {
    background: palette.white,
    foreground: palette.slate900,
    card: palette.white,
    cardForeground: palette.slate900,
    primary: palette.slate900,
    primaryForeground: palette.white,
    secondary: palette.slate100,
    secondaryForeground: palette.slate900,
    muted: palette.slate100,
    mutedForeground: palette.slate500,
    accent: palette.slate200,
    accentForeground: palette.slate900,
    border: palette.slate200,
    input: palette.slate200,
    ring: palette.blue500,

    cta: palette.blue600,
    ctaForeground: palette.white,
    ctaHover: palette.blue700,
    ctaSurface: palette.blue50,
    ctaBorder: palette.blue200,

    destructive: palette.red500,
    destructiveForeground: palette.white,
    destructiveSurface: palette.red50,
    success: palette.green700,
    successForeground: palette.white,
    successSurface: palette.green50,
    warning: palette.amber500,
    warningForeground: palette.white,
    warningSurface: palette.amber50,

    hero: palette.blue600,
    heroForeground: palette.white,
    heroMuted: palette.blue200,
    heroGlass: "rgba(255,255,255,0.18)",
    heroGlassBorder: "rgba(255,255,255,0.25)",

    contentSurface: palette.slate100,

    tabBar: palette.white,
    tabBarBorder: "rgba(15,23,42,0.08)",
    tabActive: palette.blue600,
    tabActiveLabel: palette.slate900,
    tabInactive: palette.slate400,

    overlay: "rgba(17,24,39,0.42)",
    placeholder: palette.slate400,
    shadow: palette.slate900,
    skeleton: palette.slate100,
    ripple: "rgba(37,99,235,0.10)",
};

export const darkColors: ThemeColors = {
    background: palette.slate900,
    foreground: "#E1E7EF",
    card: "#0B1220",
    cardForeground: "#E1E7EF",
    primary: "#E1E7EF",
    primaryForeground: palette.slate900,
    secondary: palette.slate800,
    secondaryForeground: "#E1E7EF",
    muted: "#10192B",
    mutedForeground: palette.slate400,
    accent: palette.slate800,
    accentForeground: "#E1E7EF",
    border: "#1F2A3D",
    input: "#1F2A3D",
    ring: palette.blue500,

    cta: palette.blue500,
    ctaForeground: palette.white,
    ctaHover: palette.blue600,
    ctaSurface: "rgba(59,130,246,0.16)",
    ctaBorder: "rgba(59,130,246,0.32)",

    destructive: palette.red500,
    destructiveForeground: palette.white,
    destructiveSurface: "rgba(239,68,68,0.12)",
    success: palette.green500,
    successForeground: palette.white,
    successSurface: "rgba(34,197,94,0.12)",
    warning: palette.amber500,
    warningForeground: palette.white,
    warningSurface: "rgba(245,158,11,0.12)",

    hero: palette.blue800,
    heroForeground: palette.white,
    heroMuted: palette.blue200,
    heroGlass: "rgba(255,255,255,0.12)",
    heroGlassBorder: "rgba(255,255,255,0.18)",

    contentSurface: palette.slate900,

    tabBar: "#0B1220",
    tabBarBorder: "rgba(255,255,255,0.08)",
    tabActive: palette.blue400,
    tabActiveLabel: "#E1E7EF",
    tabInactive: palette.slate500,

    overlay: "rgba(0,0,0,0.6)",
    placeholder: palette.slate500,
    shadow: palette.black,
    skeleton: palette.slate800,
    ripple: "rgba(96,165,250,0.16)",
};

export const lightTheme: Theme = { mode: "light", colors: lightColors };
export const darkTheme: Theme = { mode: "dark", colors: darkColors };
