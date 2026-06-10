// Zod schema — validates every brand manifest at build + test time (plan §5.1, §11).
// A malformed or incomplete manifest must fail `validate-brands` in CI before any
// expensive native build, never a customer's first launch (plan §6, §16).
//
// The themeColors schema lists every ThemeColors token explicitly (not `.passthrough()`)
// so a brand missing a single token fails validation — that token would otherwise render
// as a broken/undefined color on first paint. The parity test in `schema.test.ts` asserts
// this key list matches the mobile `ThemeColors` type so the two cannot drift.

import { z } from "zod";
import type { ThemeColors } from "./types";

// A color is any non-empty string (hex, rgb(a), named). We deliberately do not regex-match
// hex here — `rgba(...)` values (heroGlass, overlay, ripple, …) are valid theme tokens.
const colorValue = z.string().min(1);

// Every key of ThemeColors, required. `satisfies Record<keyof ThemeColors, ...>` makes the
// compiler fail if a token is added to the type but not here (and vice-versa via the test).
const themeColorsShape = {
    background: colorValue,
    foreground: colorValue,
    card: colorValue,
    cardForeground: colorValue,
    primary: colorValue,
    primaryForeground: colorValue,
    secondary: colorValue,
    secondaryForeground: colorValue,
    muted: colorValue,
    mutedForeground: colorValue,
    accent: colorValue,
    accentForeground: colorValue,
    border: colorValue,
    input: colorValue,
    ring: colorValue,

    cta: colorValue,
    ctaForeground: colorValue,
    ctaHover: colorValue,
    ctaSurface: colorValue,
    ctaBorder: colorValue,

    destructive: colorValue,
    destructiveForeground: colorValue,
    destructiveSurface: colorValue,
    success: colorValue,
    successForeground: colorValue,
    successSurface: colorValue,
    warning: colorValue,
    warningForeground: colorValue,
    warningSurface: colorValue,

    hero: colorValue,
    heroForeground: colorValue,
    heroMuted: colorValue,
    heroGlass: colorValue,
    heroGlassBorder: colorValue,

    contentSurface: colorValue,

    tabBar: colorValue,
    tabBarBorder: colorValue,
    tabActive: colorValue,
    tabActiveLabel: colorValue,
    tabInactive: colorValue,

    overlay: colorValue,
    placeholder: colorValue,
    shadow: colorValue,
    skeleton: colorValue,
    ripple: colorValue,
} satisfies Record<keyof ThemeColors, z.ZodString>;

export const themeColorsSchema = z.object(themeColorsShape).strict();

export const brandThemeSchema = z.object({
    light: themeColorsSchema,
    dark: themeColorsSchema.optional(),
    tailwindOverrides: z.record(z.string()).optional(),
});

export const brandNativeSchema = z.object({
    iosBundleId: z.string().min(1),
    androidPackage: z.string().min(1),
    scheme: z.string().min(1),
    easProjectId: z.string().min(1),
    stripeMerchantId: z.string().min(1),
    associatedDomains: z.array(z.string()).optional(),
    icon: z.string().min(1),
    adaptiveIcon: z.string().min(1),
    splash: z.string().min(1),
    notificationIcon: z.string().min(1),
    adaptiveIconBackgroundColor: colorValue,
    splashBackgroundColor: colorValue,
});

export const brandManifestSchema = z.object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    deliveryModel: z.enum(["dedicated", "shared"]),

    native: brandNativeSchema,

    theme: brandThemeSchema,
    fonts: z.object({ sans: z.string().min(1), mono: z.string().optional() }),
    logo: z.object({
        wordmark: z.string().min(1),
        mark: z.string().min(1),
        monochrome: z.string().optional(),
    }),
    flags: z.record(z.boolean()),
    copy: z.record(z.string()),
    links: z.object({
        support: z.string().min(1),
        terms: z.string().min(1),
        privacy: z.string().min(1),
    }),

    tenants: z.array(z.string()).optional(),
});

// The full list of ThemeColors token names, derived from the schema — exported so the
// parity test can compare it against the mobile type's keys without re-listing them.
export const themeColorTokenNames = Object.keys(themeColorsShape) as Array<keyof ThemeColors>;
