// BrandProvider + brand hooks — the runtime presentation entry point (plan §5.3).
//
// Holds the resolved active brand in context and exposes it to the app. The mobile
// ThemeProvider reads `useBrand().theme` to source its color tokens (inverting the old
// hardcoded `themes.ts` source), and the app wraps children in a NativeWind `vars()` View
// built from `buildBrandCssVars` so `className` tokens re-skin too.
//
// Framework-agnostic on purpose: no React Native / Expo imports live here, so the same
// provider can wrap the future web-player re-skin. The RN-specific `vars()` injection stays
// in the app's ThemeProvider, fed by the pure `buildBrandCssVars` helper exported here.
//
// `brand` is passed in explicitly (resolved by the app from `extra.brandId` / ACTIVE_BRAND
// for Model A, or a tenant selection for Model B in Phase 5) rather than read from env here,
// keeping this component pure and testable. It defaults to the resolved active brand so the
// app can mount `<BrandProvider>` with no props and get today's `_default` look.

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { resolveActiveBrand } from "./resolve";
import type { BrandFlags, BrandManifest } from "./types";

const BrandContext = createContext<BrandManifest | null>(null);

export function BrandProvider({
    brand,
    children,
}: {
    brand?: BrandManifest;
    children: ReactNode;
}) {
    // resolveActiveBrand() always returns a concrete manifest (falls back to `_default`),
    // so the context value is never null in practice — the null default above only guards
    // against a consumer rendered outside the provider (see useBrand).
    const value = useMemo(() => brand ?? resolveActiveBrand(), [brand]);
    return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandManifest {
    const brand = useContext(BrandContext);
    if (!brand) {
        throw new Error("useBrand must be used within a <BrandProvider>");
    }
    return brand;
}

// Static brand flags (the bundled layer of plan §8's layered resolution). The dynamic
// per-tenant remote layer is merged on top in Phase 5; consumers should already gate on
// this hook so that change is transparent to features.
export function useBrandFlags(): BrandFlags {
    return useBrand().flags;
}
