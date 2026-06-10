// `_default` brand — the SmashBook reference brand (plan §5.1) and the ultimate fallback.
//
// This is authored through the same minimal `BrandInput` → `defineBrand()` pipeline every
// new club uses: a primary colour, a secondary, a background, a font, native ids, and
// assets. `defineBrand()` derives the full 49-token light/dark theme from those.
//
// "Preserve _default exactly" (plan requirement 5): a generic RGB derivation can't reproduce
// Tailwind's hand-tuned blue ramp, so the handful of ramp-specific tokens (cta hover/surface/
// border, ring, hero, tab active, ripple) are pinned via `themeOverrides`. The parity test in
// `theme-generator.test.ts` asserts the resolved theme is byte-identical to the previously
// hand-authored tokens, so today's look is unchanged.
//
// `deliveryModel: "shared"` — the default brand is the Model B fallback (plan §3).

import { defineBrand } from "../../define-brand";
import type { BrandManifest } from "../../types";

export const defaultBrand: BrandManifest = defineBrand({
    id: "_default",
    displayName: "SmashBook",
    deliveryModel: "shared",

    // Minimal native identity — scheme + Stripe merchant id are pinned via nativeOverrides
    // below to keep the existing values (the default scheme would otherwise be the id).
    native: {
        iosBundleId: "app.smashbook.mobile",
        androidPackage: "app.smashbook.mobile",
        icon: "./assets/icon.png",
        adaptiveIcon: "./assets/adaptive-icon.png",
        splash: "./assets/splash-icon.png",
        notificationIcon: "./assets/notification-icon.png",
    },

    // The whole brand palette, from one primary colour.
    branding: {
        primaryColor: "#2563EB", // blue600 — CTA / hero / active tab
        secondaryColor: "#0F172A", // slate900 — text / primary surfaces
        backgroundColor: "#FFFFFF",
        fontFamily: "Inter",
    },

    assets: {
        logo: "./assets/icon.png",
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

    nativeOverrides: {
        scheme: "smashbook",
        easProjectId: "00000000-0000-0000-0000-000000000000",
        stripeMerchantId: "merchant.app.smashbook.mobile",
    },

    // Pin the Tailwind blue-ramp stops the generic derivation can't hit (see header).
    themeOverrides: {
        light: {
            ctaHover: "#1D4ED8", // blue700
            ctaSurface: "#EFF6FF", // blue50
            ctaBorder: "#BFDBFE", // blue200
            ring: "#3B82F6", // blue500
            heroMuted: "#BFDBFE", // blue200
        },
        dark: {
            cta: "#3B82F6", // blue500
            ctaSurface: "rgba(59,130,246,0.16)",
            ctaBorder: "rgba(59,130,246,0.32)",
            ring: "#3B82F6", // blue500
            hero: "#1E40AF", // blue800
            heroMuted: "#BFDBFE", // blue200
            tabActive: "#60A5FA", // blue400
            ripple: "rgba(96,165,250,0.16)",
        },
    },
});
