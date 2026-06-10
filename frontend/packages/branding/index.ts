// @repo/branding — single source of truth for white-label brand manifests.
// See docs/white-label/FE_WHITE_LABEL_MOBILE_ARCHITECTURE_PLAN.md.
//
// Phase 1 surface: types, schema, registry, and brand resolution.
// Phase 2 surface (runtime presentation): BrandProvider / useBrand / useBrandFlags +
// the pure CSS-var + color helpers that wire a brand theme into NativeWind's className
// tokens (plan §5.3).

export type {
    BrandManifest,
    BrandNative,
    BrandTheme,
    BrandFlags,
    BrandFonts,
    BrandLogo,
    BrandLinks,
    DeliveryModel,
    ThemeColors,
    // Authoring surface — the minimal, club-friendly manifest (plan §6, §15).
    BrandInput,
    BrandInputNative,
    BrandInputAssets,
    BrandBranding,
} from "./src/types";

export {
    brandManifestSchema,
    brandThemeSchema,
    brandNativeSchema,
    themeColorsSchema,
    themeColorTokenNames,
    brandInputSchema,
} from "./src/schema";

// Authoring pipeline — clubs write a BrandInput, defineBrand() derives the full manifest.
export { defineBrand } from "./src/define-brand";
export { generateLightTheme, generateDarkTheme } from "./src/theme-generator";
export { darken, lighten, rgba, tint } from "./src/color";

export { brandRegistry, allBrands, getBrand, DEFAULT_BRAND_ID } from "./src/registry";

// Phase 6 — asset & build automation. Registry → asset-pipeline projection (plan §6).
export { brandAssetDescriptors, toAssetDescriptor } from "./src/asset-descriptors";
export type { BrandAssetDescriptor, AssetKey } from "./src/asset-descriptors";

export { resolveBrand, resolveActiveBrand, brandForTenant } from "./src/resolve";

export { defaultBrand } from "./src/brands/_default/brand.config";

// Phase 2 — runtime presentation
// Phase 5 — runtime brand selection (Model B) + per-flag hook
export {
    BrandProvider,
    useBrand,
    useBrandFlags,
    useFlag,
    useBrandSelection,
} from "./src/BrandProvider";

export { buildBrandCssVars } from "./src/cssVars";

export { hexToHslTriplet } from "./src/color";

// Phase 5 — layered feature-flag resolution (plan §8)
export { PLAYER_FEATURE_FLAGS, FLAG_DEFAULTS, resolveFlags, isFlagEnabled } from "./src/flags";
export type { PlayerFeatureFlag } from "./src/flags";
