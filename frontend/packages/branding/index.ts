// @repo/branding — single source of truth for white-label brand manifests.
// See docs/FE_WHITE_LABEL_MOBILE_ARCHITECTURE_PLAN.md.
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
} from "./src/types";

export {
    brandManifestSchema,
    brandThemeSchema,
    brandNativeSchema,
    themeColorsSchema,
    themeColorTokenNames,
} from "./src/schema";

export { brandRegistry, allBrands, getBrand, DEFAULT_BRAND_ID } from "./src/registry";

export { resolveBrand, resolveActiveBrand } from "./src/resolve";

export { defaultBrand } from "./src/brands/_default/brand.config";

// Phase 2 — runtime presentation
export { BrandProvider, useBrand, useBrandFlags } from "./src/BrandProvider";

export { buildBrandCssVars } from "./src/cssVars";

export { hexToHslTriplet } from "./src/color";
