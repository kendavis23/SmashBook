// `ace-staging` brand — Phase 4 pilot brand (plan §14, Phase 4).
// Delivery model: "dedicated" (Model A — its own App Store listing, bundle ID, EAS project).
// Theme: green — primaryColor drives all CTA, hero, active tab, and their hover/surface/border
// variants via the generator. Neutral and semantic-state tokens are shared with every brand.
//
// Assets: placeholder PNGs in assets/ace-staging/ (to be replaced with final brand art before
// production submission — see plan §6 "Brand kit intake").

import { defineBrand } from "../../define-brand";
import type { BrandManifest } from "../../types";

export const aceStagingBrand: BrandManifest = defineBrand({
    id: "ace-staging",
    displayName: "Ace",
    deliveryModel: "dedicated",
    brandSubdomain: "ace-player-staging",

    native: {
        iosBundleId: "app.ace.staging.mobile",
        androidPackage: "app.ace.staging.mobile",
        icon: "./assets/ace-staging/icon.png",
        adaptiveIcon: "./assets/ace-staging/adaptive-icon.png",
        splash: "./assets/ace-staging/splash-icon.png",
        notificationIcon: "./assets/ace-staging/notification-icon.png",
    },

    branding: {
        primaryColor: "#16A34A", // green600 — CTA / hero / active tab
        secondaryColor: "#052E16", // green950 — text / primary surfaces
        backgroundColor: "#FFFFFF",
        fontFamily: "Inter",
    },

    assets: {
        logo: "./assets/ace-staging/icon.png",
        wordmark: "./assets/ace-staging/icon.png",
        mark: "./assets/ace-staging/adaptive-icon.png",
    },

    flags: {},
    copy: {},
    links: {
        support: "https://ace.smashbook.app/support",
        terms: "https://ace.smashbook.app/terms",
        privacy: "https://ace.smashbook.app/privacy",
    },

    nativeOverrides: {
        scheme: "ace-staging",
        easProjectId: "00000000-0000-0000-0000-000000000001",
        stripeMerchantId: "merchant.app.ace.staging.mobile",
        adaptiveIconBackgroundColor: "#DCFCE7", // green100 — adaptive icon background
        splashBackgroundColor: "#FFFFFF",
        associatedDomains: ["applinks:ace.smashbook.app"],
    },

    // Pin the Tailwind green-ramp stops the generic derivation can't hit exactly.
    themeOverrides: {
        light: {
            ctaHover: "#15803D", // green700
            ctaSurface: "#F0FDF4", // green50
            ctaBorder: "#BBF7D0", // green200
            ring: "#22C55E", // green500
            heroMuted: "#BBF7D0", // green200
        },
        dark: {
            cta: "#22C55E", // green500
            ctaSurface: "rgba(34,197,94,0.16)",
            ctaBorder: "rgba(34,197,94,0.32)",
            ring: "#22C55E", // green500
            hero: "#14532D", // green900
            heroMuted: "#BBF7D0", // green200
            tabActive: "#4ADE80", // green400
            ripple: "rgba(74,222,128,0.16)",
        },
    },

    tenants: ["ace-staging"],
});
