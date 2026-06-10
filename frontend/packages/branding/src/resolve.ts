// Active-brand resolution (plan §5.1, §5.4).
//
// Build-time (Model A / dedicated): `ACTIVE_BRAND` env selects the brand app.config.ts
// builds. Runtime self-identification reads the same id from `extra.brandId`.
// Runtime (Model B / shared): the user/tenant selects a brand after login — that path
// lands in Phase 5 and will pass the resolved id in explicitly.
//
// This module is intentionally pure (no React, no Expo imports) so it is usable from both
// app.config.ts at build time and the runtime BrandProvider. It always resolves to a
// concrete manifest — falling back to `_default` so the app can never boot brandless.

import { defaultBrandManifest, getBrand } from "./registry";
import type { BrandManifest } from "./types";

// Resolve a brand by explicit id, falling back to `_default` when the id is missing or
// unknown. `_default` is the ultimate fallback (plan §16 — default/fallback gaps).
export function resolveBrand(brandId?: string | null): BrandManifest {
    if (brandId) {
        const brand = getBrand(brandId);
        if (brand) return brand;
    }
    return defaultBrandManifest;
}

// Build-time resolver: reads ACTIVE_BRAND from the environment. Used by app.config.ts in
// Phase 3. Kept separate from the explicit-id resolver so the env read happens in exactly
// one place.
export function resolveActiveBrand(env: NodeJS.ProcessEnv = process.env): BrandManifest {
    return resolveBrand(env.ACTIVE_BRAND);
}
