// `rally-staging` brand — second dedicated pilot brand (plan §14, Phase 4).
// Delivery model: "dedicated" (Model A — its own App Store listing, bundle ID, EAS project).
//
// Design intent: deliberately NOT a re-skin of `ace-staging`. Where Ace is green-on-white
// with Inter, Rally is a dark, moody violet identity with a geometric grotesque typeface.
// The canvas is dark even in "light" mode so the brand reads dark across both schemes, and
// the brand hue (violet) drives every CTA/hero/active-tab/ring variant via the generator.
// Neutral and semantic-state tokens are shared with every brand.
//
// Assets: placeholder PNGs in assets/rally-staging/ (to be replaced with final brand art
// before production submission — see plan §6 "Brand kit intake").

import { defineBrand } from "../../define-brand";
import type { BrandManifest } from "../../types";

export const rallyStagingBrand: BrandManifest = defineBrand({
    id: "rally-staging",
    displayName: "Rally",
    deliveryModel: "dedicated",

    native: {
        iosBundleId: "app.rally.staging.mobile",
        androidPackage: "app.rally.staging.mobile",
        icon: "./assets/rally-staging/icon.png",
        adaptiveIcon: "./assets/rally-staging/adaptive-icon.png",
        splash: "./assets/rally-staging/splash-icon.png",
        notificationIcon: "./assets/rally-staging/notification-icon.png",
    },

    branding: {
        primaryColor: "#8B5CF6", // violet500 — CTA / hero / active tab
        secondaryColor: "#E5E7EB", // light neutral text on the dark canvas
        backgroundColor: "#0F1117", // dark moody canvas (distinct from Ace's white)
        fontFamily: "Space Grotesk", // geometric grotesque — distinct from Ace's Inter
    },

    assets: {
        logo: "./assets/rally-staging/icon.png",
        wordmark: "./assets/rally-staging/icon.png",
        mark: "./assets/rally-staging/adaptive-icon.png",
    },

    flags: {},
    copy: {},
    links: {
        support: "https://rally.smashbook.app/support",
        terms: "https://rally.smashbook.app/terms",
        privacy: "https://rally.smashbook.app/privacy",
    },

    nativeOverrides: {
        scheme: "rally-staging",
        easProjectId: "00000000-0000-0000-0000-000000000002",
        stripeMerchantId: "merchant.app.rally.staging.mobile",
        adaptiveIconBackgroundColor: "#1A1430", // deep violet-tinted dark — icon background
        splashBackgroundColor: "#0F1117",
        associatedDomains: ["applinks:rally.smashbook.app"],
    },

    // The generator produces a white-canvas light theme from `backgroundColor`; pin a dark
    // "light" scheme here so the brand reads dark in both OS appearance modes, and tune the
    // violet ramp the generic derivation can't hit exactly.
    themeOverrides: {
        light: {
            background: "#0F1117", // dark canvas
            foreground: "#E5E7EB",
            card: "#161922",
            cardForeground: "#E5E7EB",
            primary: "#E5E7EB",
            primaryForeground: "#0F1117",
            secondary: "#1F2230",
            secondaryForeground: "#E5E7EB",
            muted: "#1A1D27",
            mutedForeground: "#8B90A0",
            accent: "#1F2230",
            accentForeground: "#E5E7EB",
            border: "#272B3A",
            input: "#272B3A",
            ring: "#A78BFA", // violet400
            cta: "#8B5CF6", // violet500
            ctaHover: "#7C3AED", // violet600
            ctaSurface: "rgba(139,92,246,0.16)",
            ctaBorder: "rgba(139,92,246,0.32)",
            hero: "#5B21B6", // violet800
            heroMuted: "#A78BFA", // violet400
            contentSurface: "#0F1117",
            tabBar: "#161922",
            tabBarBorder: "rgba(255,255,255,0.08)",
            tabActive: "#A78BFA", // violet400
            tabActiveLabel: "#E5E7EB",
            tabInactive: "#6B7280",
            placeholder: "#6B7280",
            skeleton: "#1F2230",
            ripple: "rgba(167,139,250,0.16)",
        },
        dark: {
            cta: "#A78BFA", // violet400 — brighter on dark
            ctaHover: "#8B5CF6", // violet500
            ctaSurface: "rgba(167,139,250,0.16)",
            ctaBorder: "rgba(167,139,250,0.32)",
            ring: "#A78BFA", // violet400
            hero: "#4C1D95", // violet900
            heroMuted: "#C4B5FD", // violet300
            tabActive: "#C4B5FD", // violet300
            ripple: "rgba(196,181,253,0.16)",
        },
    },

    tenants: ["rally-staging"],
});
