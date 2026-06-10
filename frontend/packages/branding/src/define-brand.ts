// defineBrand() — expands a minimal, club-friendly `BrandInput` into the full internal
// `BrandManifest` every consumer reads (plan §6, §15).
//
// A club supplies a logo, app name, primary colour, splash/icon and feature flags; this
// function derives the complete theme token set (theme-generator.ts) and fills the remaining
// build-time native fields with sensible conventions, so onboarding a brand is data entry,
// not code. The fully-resolved manifest keeps the exact shape `BrandProvider`, the mobile
// `ThemeProvider`, `cssVars`, and `app.config.ts` already consume — nothing downstream
// changes.
//
// Escape hatches (`nativeOverrides`, `themeOverrides`) apply last for the rare brand that
// must pin a value the derivation can't produce (e.g. _default matching the Tailwind ramp).
//
// Pure, no React/Expo imports.

import { generateDarkTheme, generateLightTheme } from "./theme-generator";
import type { BrandInput, BrandManifest, ThemeColors } from "./types";

const DEFAULT_FONT = "Inter";
const DEFAULT_BG = "#FFFFFF";

// Apply a partial token override onto a generated scheme. Kept tiny and explicit rather than
// a generic deep-merge — ThemeColors is one level deep.
function applyOverrides(base: ThemeColors, overrides?: Partial<ThemeColors>): ThemeColors {
    return overrides ? { ...base, ...overrides } : base;
}

export function defineBrand(input: BrandInput): BrandManifest {
    const { branding, native, assets } = input;

    const light = applyOverrides(generateLightTheme(branding), input.themeOverrides?.light);
    const dark = applyOverrides(generateDarkTheme(branding), input.themeOverrides?.dark);

    // Native conventions: scheme/Stripe merchant default from the bundle id; adaptive +
    // notification icons default to the main icon; asset background colours come from the
    // brand canvas. Each is overridable via `nativeOverrides`.
    const resolvedNative: BrandManifest["native"] = {
        iosBundleId: native.iosBundleId,
        androidPackage: native.androidPackage,
        scheme: input.nativeOverrides?.scheme ?? input.id,
        easProjectId: input.nativeOverrides?.easProjectId ?? "00000000-0000-0000-0000-000000000000",
        stripeMerchantId:
            input.nativeOverrides?.stripeMerchantId ?? `merchant.${native.iosBundleId}`,
        icon: native.icon,
        adaptiveIcon: native.adaptiveIcon ?? native.icon,
        splash: native.splash,
        notificationIcon: native.notificationIcon ?? native.icon,
        adaptiveIconBackgroundColor:
            input.nativeOverrides?.adaptiveIconBackgroundColor ??
            branding.backgroundColor ??
            DEFAULT_BG,
        splashBackgroundColor:
            input.nativeOverrides?.splashBackgroundColor ?? branding.backgroundColor ?? DEFAULT_BG,
        ...(input.nativeOverrides?.associatedDomains
            ? { associatedDomains: input.nativeOverrides.associatedDomains }
            : {}),
    };

    return {
        id: input.id,
        displayName: input.displayName,
        deliveryModel: input.deliveryModel ?? "shared",

        native: resolvedNative,

        theme: { light, dark },
        fonts: { sans: branding.fontFamily ?? DEFAULT_FONT },
        logo: {
            wordmark: assets.wordmark ?? assets.logo,
            mark: assets.mark ?? assets.logo,
        },
        flags: input.flags ?? {},
        copy: input.copy ?? {},
        links: {
            support: input.links?.support ?? "https://smashbook.app/support",
            terms: input.links?.terms ?? "https://smashbook.app/terms",
            privacy: input.links?.privacy ?? "https://smashbook.app/privacy",
        },
        ...(input.tenants ? { tenants: input.tenants } : {}),
    };
}
