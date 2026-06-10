// Brand registry — the single iterable source of truth mapping brandId → manifest
// (plan §5.1, §15). CI validation and (later) build-matrix orchestration iterate this
// one map; there are never hand-maintained per-brand scripts.
//
// Adding a brand = author `brands/<id>/brand.config.ts` and add one line here.

import type { BrandManifest } from "./types";
import { defaultBrand } from "./brands/_default/brand.config";
import { aceStagingBrand } from "./brands/ace-staging/brand.config";
import { rallyStagingBrand } from "./brands/rally-staging/brand.config";

export const DEFAULT_BRAND_ID = "_default";

export const brandRegistry: Record<string, BrandManifest> = {
    [DEFAULT_BRAND_ID]: defaultBrand,
    "ace-staging": aceStagingBrand,
    "rally-staging": rallyStagingBrand,
};

export const allBrands: BrandManifest[] = Object.values(brandRegistry);

export function getBrand(brandId: string): BrandManifest | undefined {
    return brandRegistry[brandId];
}

// The `_default` brand is always present in the registry — exported as a non-optional
// reference so callers (resolve.ts) get the ultimate fallback without an undefined check.
export const defaultBrandManifest: BrandManifest = defaultBrand;
