// Asset descriptors — the registry projected down to exactly what the asset-generation
// pipeline needs per brand (plan §6, Phase 6). Pure derivation over `allBrands`: no
// per-brand code, no hand-maintained list. The generator (`scripts/generate-assets.mjs`)
// consumes the JSON projection of this; `asset-descriptors.test.ts` asserts the checked-in
// JSON stays in sync with the registry so the two can never drift.
//
// Each descriptor carries:
//   - `id`            the brand id (the asset folder is implied by the manifest paths)
//   - `accent`        the brand's primary accent, pulled straight from the resolved theme
//                     (`theme.light.cta`) — the generator never hard-codes a brand colour
//   - `outputs`       absolute-from-mobile-app-root output paths per asset key, taken from
//                     `native.*` so generated art lands exactly where app.config.ts expects

import { allBrands } from "./registry";
import type { BrandManifest } from "./types";

export type AssetKey = "icon" | "adaptiveIcon" | "splash" | "notificationIcon";

export type BrandAssetDescriptor = {
    id: string;
    deliveryModel: BrandManifest["deliveryModel"];
    accent: string; // #RRGGBB — the generator's mark/field colour
    splashBackgroundColor: string;
    adaptiveIconBackgroundColor: string;
    outputs: Record<AssetKey, string>; // manifest native paths (relative to mobile app root)
};

export function toAssetDescriptor(brand: BrandManifest): BrandAssetDescriptor {
    return {
        id: brand.id,
        deliveryModel: brand.deliveryModel,
        accent: brand.theme.light.cta,
        splashBackgroundColor: brand.native.splashBackgroundColor,
        adaptiveIconBackgroundColor: brand.native.adaptiveIconBackgroundColor,
        outputs: {
            icon: brand.native.icon,
            adaptiveIcon: brand.native.adaptiveIcon,
            splash: brand.native.splash,
            notificationIcon: brand.native.notificationIcon,
        },
    };
}

export const brandAssetDescriptors: BrandAssetDescriptor[] =
    allBrands.map(toAssetDescriptor);
