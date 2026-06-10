// Dynamic Expo app config.
//
// Phase 0 of the white-label plan (docs/FE_WHITE_LABEL_MOBILE_ARCHITECTURE_PLAN.md):
// this replaces the static app.json with a config function, but is still hardcoded
// to the SmashBook brand — a behavior-preserving refactor. In Phase 3 the native
// identity fields below become a function of `process.env.ACTIVE_BRAND`, sourced
// from the `@repo/branding` manifest. The structure here (a single BRAND object the
// config reads from) is deliberately shaped to make that swap mechanical.
//
// Build-time vs runtime (plan §2): everything in this file is BUILD-TIME native
// identity. Runtime presentation (theme, logo, flags, copy) is NOT configured here —
// it flows through BrandProvider / @repo/config in later phases.

import type { ExpoConfig, ConfigContext } from "expo/config";

// The single SmashBook brand, inlined for Phase 0. This object is the seam that
// Phase 1's `@repo/branding` manifest will replace (one lookup keyed by ACTIVE_BRAND).
const BRAND = {
    id: "_default",
    name: "SmashBook",
    slug: "smashbook-mobile",
    scheme: "smashbook",
    iosBundleId: "app.smashbook.mobile",
    androidPackage: "app.smashbook.mobile",
    stripeMerchantId: "merchant.app.smashbook.mobile",
    adaptiveIconBackgroundColor: "#FFFFFF",
    splashBackgroundColor: "#FFFFFF",
} as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: BRAND.name,
    slug: BRAND.slug,
    version: "1.0.0",
    orientation: "portrait",
    scheme: BRAND.scheme,
    userInterfaceStyle: "automatic",
    platforms: ["ios", "android"],
    icon: "./assets/icon.png",
    splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: BRAND.splashBackgroundColor,
    },
    ios: {
        supportsTablet: true,
        bundleIdentifier: BRAND.iosBundleId,
    },
    android: {
        package: BRAND.androidPackage,
        adaptiveIcon: {
            foregroundImage: "./assets/adaptive-icon.png",
            backgroundColor: BRAND.adaptiveIconBackgroundColor,
        },
    },
    notification: {
        icon: "./assets/notification-icon.png",
    },
    plugins: [
        "expo-router",
        "expo-dev-client",
        [
            "@stripe/stripe-react-native",
            {
                merchantIdentifier: BRAND.stripeMerchantId,
                enableGooglePay: false,
            },
        ],
    ],
    experiments: {
        typedRoutes: true,
    },
    // Runtime self-identification hook (plan §5.4). A dedicated build embeds its
    // brand id here so resolveActiveBrand() can read it without a network call.
    // `eas.projectId` is a placeholder until `eas init` links the project.
    extra: {
        brandId: BRAND.id,
        eas: {
            projectId: "00000000-0000-0000-0000-000000000000",
        },
    },
});
