// Dynamic Expo app config — Phase 3 of the white-label plan.
// (docs/white-label/FE_WHITE_LABEL_MOBILE_ARCHITECTURE_PLAN.md §14, Phase 3)
//
// Native identity (name, bundle ID, icon, splash, scheme, Stripe) is now sourced from
// the active brand manifest in `@repo/branding`. Set `ACTIVE_BRAND=<brandId>` before
// building to produce a different branded binary. Omitting it falls back to `_default`
// (the SmashBook reference brand), so the default build is behavior-identical to Phase 0.
//
//   ACTIVE_BRAND=_default eas build --profile production   # SmashBook app (unchanged)
//   ACTIVE_BRAND=ace-london eas build --profile production # Ace London dedicated app
//
// Build-time vs runtime (plan §2): everything in this file is BUILD-TIME native identity.
// Runtime presentation (theme, logo, flags, copy) flows through BrandProvider in the app.
//
// WHY the brand config is required directly (not via `@repo/branding`):
// Expo's config loader transpiles app.config.ts with sucrase in CJS mode. Workspace
// packages with "main": "./index.ts" are raw TypeScript with ESM exports — sucrase can't
// resolve them at config-load time. Requiring the brand config file directly via a
// relative path works because sucrase handles individual .ts files fine.
// The resolution logic is minimal (3 lines) so inlining it here is the right tradeoff.

import type { ExpoConfig, ConfigContext } from "expo/config";

// WHY brand native config is inlined here (not imported from @repo/branding):
// Expo's config loader transpiles app.config.ts with sucrase in CJS mode. Sucrase only
// transpiles this one file — any require() of a .ts workspace package falls to Node's
// native CJS resolver, which doesn't handle .ts extensions. Inlining the native identity
// fields (the only build-time concern) is the right tradeoff: this file is small,
// the values are stable, and we avoid a brittle runtime require chain.
//
// Runtime presentation (theme, logo, flags, copy) lives in @repo/branding/BrandProvider
// and is NOT needed here — that's a React concern, not a build-time config concern.
//
// Adding a new brand: add an entry to BRAND_REGISTRY below with its native identity.

type BrandNative = {
    id: string;
    displayName: string;
    slug: string;
    scheme: string;
    iosBundleId: string;
    androidPackage: string;
    stripeMerchantId: string;
    easProjectId: string;
    icon: string;
    adaptiveIcon: string;
    adaptiveIconBackgroundColor: string;
    splash: string;
    splashBackgroundColor: string;
    notificationIcon: string;
    associatedDomains?: string[];
};

// Single source of build-time native identity per brand.
// Values must stay in sync with packages/branding/src/brands/<id>/brand.config.ts native.*
const BRAND_REGISTRY: Record<string, BrandNative> = {
    _default: {
        id: "_default",
        displayName: "SmashBook",
        slug: "smashbook-mobile",
        scheme: "smashbook",
        iosBundleId: "app.smashbook.mobile",
        androidPackage: "app.smashbook.mobile",
        stripeMerchantId: "merchant.app.smashbook.mobile",
        easProjectId: "00000000-0000-0000-0000-000000000000",
        icon: "./assets/icon.png",
        adaptiveIcon: "./assets/adaptive-icon.png",
        adaptiveIconBackgroundColor: "#FFFFFF",
        splash: "./assets/splash-icon.png",
        splashBackgroundColor: "#FFFFFF",
        notificationIcon: "./assets/notification-icon.png",
    },
    // Phase 4: ace-staging — green-themed dedicated (Model A) brand.
    "ace-staging": {
        id: "ace-staging",
        displayName: "Ace",
        slug: "ace-staging",
        scheme: "ace-staging",
        iosBundleId: "app.ace.staging.mobile",
        androidPackage: "app.ace.staging.mobile",
        stripeMerchantId: "merchant.app.ace.staging.mobile",
        easProjectId: "00000000-0000-0000-0000-000000000001",
        icon: "./assets/ace-staging/icon.png",
        adaptiveIcon: "./assets/ace-staging/adaptive-icon.png",
        adaptiveIconBackgroundColor: "#DCFCE7",
        splash: "./assets/ace-staging/splash-icon.png",
        splashBackgroundColor: "#FFFFFF",
        notificationIcon: "./assets/ace-staging/notification-icon.png",
        associatedDomains: ["applinks:ace.smashbook.app"],
    },
    // Phase 4: rally-staging — dark violet-themed dedicated (Model A) brand.
    "rally-staging": {
        id: "rally-staging",
        displayName: "Rally",
        slug: "rally-staging",
        scheme: "rally-staging",
        iosBundleId: "app.rally.staging.mobile",
        androidPackage: "app.rally.staging.mobile",
        stripeMerchantId: "merchant.app.rally.staging.mobile",
        easProjectId: "00000000-0000-0000-0000-000000000002",
        icon: "./assets/rally-staging/icon.png",
        adaptiveIcon: "./assets/rally-staging/adaptive-icon.png",
        adaptiveIconBackgroundColor: "#1A1430",
        splash: "./assets/rally-staging/splash-icon.png",
        splashBackgroundColor: "#0F1117",
        notificationIcon: "./assets/rally-staging/notification-icon.png",
        associatedDomains: ["applinks:rally.smashbook.app"],
    },
};

function resolveActiveBrand(env: Record<string, string | undefined>): BrandNative {
    const id = env.ACTIVE_BRAND;
    return (id && BRAND_REGISTRY[id]) || BRAND_REGISTRY["_default"];
}

export default ({ config }: ConfigContext): ExpoConfig => {
    const brand = resolveActiveBrand(process.env);

    return {
        ...config,
        name: brand.displayName,
        slug: brand.slug,
        version: "1.0.0",
        orientation: "portrait",
        scheme: brand.scheme,
        userInterfaceStyle: "automatic",
        platforms: ["ios", "android"],
        icon: brand.icon,
        splash: {
            image: brand.splash,
            resizeMode: "contain",
            backgroundColor: brand.splashBackgroundColor,
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: brand.iosBundleId,
            ...(brand.associatedDomains
                ? { associatedDomains: brand.associatedDomains }
                : {}),
        },
        android: {
            package: brand.androidPackage,
            adaptiveIcon: {
                foregroundImage: brand.adaptiveIcon,
                backgroundColor: brand.adaptiveIconBackgroundColor,
            },
        },
        notification: {
            icon: brand.notificationIcon,
        },
        plugins: [
            "expo-router",
            "expo-dev-client",
            [
                "@stripe/stripe-react-native",
                {
                    merchantIdentifier: brand.stripeMerchantId,
                    enableGooglePay: false,
                },
            ],
        ],
        experiments: {
            typedRoutes: true,
        },
        // Runtime self-identification (plan §5.4): the binary knows its brand id so
        // resolveActiveBrand() in the app can self-identify without a network call.
        // `eas.projectId` comes from the brand manifest — each dedicated brand has its own
        // EAS project; `_default` uses a placeholder until `eas init` links the project.
        extra: {
            brandId: brand.id,
            eas: {
                projectId: brand.easProjectId,
            },
        },
    };
};
