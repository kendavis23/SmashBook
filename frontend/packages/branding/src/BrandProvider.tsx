// BrandProvider + brand hooks — the runtime presentation entry point (plan §5.3, §14 Phase 5).
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
// Two delivery models share this one provider (plan §3):
//   - Model A (dedicated): `initialBrand` is the build-embedded brand (from extra.brandId /
//     ACTIVE_BRAND). It never changes at runtime — `selectBrand` is a no-op-equivalent path
//     the app simply doesn't call.
//   - Model B (shared): mounts `_default`, then re-skins at runtime when the player picks a
//     club — the app calls `selectBrand(brandId)` (via `useBrandSelection`), flipping the
//     active brand and, transitively, every theme token. This is the Phase 5 keystone.
//
// Feature flags resolve in layers (plan §8): the bundled brand flags are the static floor,
// and an optional `remoteFlags` prop carries the per-tenant backend override on top. Features
// gate via `useBrandFlags()` / `useFlag()` so the remote layer is transparent to them.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { resolveActiveBrand, resolveBrand } from "./resolve";
import { isFlagEnabled, resolveFlags } from "./flags";
import type { BrandFlags, BrandManifest } from "./types";

type BrandContextValue = {
    brand: BrandManifest;
    // Effective, layered flags (defaults ← brand ← remote). Features read these, never the
    // raw `brand.flags`, so the remote override layer stays transparent.
    flags: Record<string, boolean>;
    // Model B runtime re-skin: switch the active brand by id (resolved against the registry,
    // falling back to `_default` for an unknown id). A no-op for Model A binaries.
    selectBrand: (brandId: string | null | undefined) => void;
};

const BrandContext = createContext<BrandContextValue | null>(null);

export function BrandProvider({
    brand,
    remoteFlags,
    children,
}: {
    // The initial/build-time brand. Defaults to the resolved active brand so a Model A app can
    // mount `<BrandProvider>` with no props and get its build-embedded look (or `_default`).
    brand?: BrandManifest;
    // Per-tenant flag override from the backend (plan §8, §13.2). Optional — absent/failed
    // fetch falls through to the bundled brand flags, never a blank app.
    remoteFlags?: BrandFlags | null;
    children: ReactNode;
}) {
    // resolveActiveBrand() always returns a concrete manifest (falls back to `_default`), so
    // the active brand is never null. Held in state so Model B can re-skin at runtime.
    const [activeBrand, setActiveBrand] = useState<BrandManifest>(
        () => brand ?? resolveActiveBrand()
    );

    const selectBrand = useCallback((brandId: string | null | undefined) => {
        // resolveBrand falls back to `_default` for an unknown/missing id, so a bad selection
        // re-skins to the safe default rather than throwing or leaving a stale brand.
        setActiveBrand(resolveBrand(brandId));
    }, []);

    const flags = useMemo(
        () => resolveFlags(activeBrand.flags, remoteFlags),
        [activeBrand.flags, remoteFlags]
    );

    const value = useMemo<BrandContextValue>(
        () => ({ brand: activeBrand, flags, selectBrand }),
        [activeBrand, flags, selectBrand]
    );

    return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

function useBrandContext(): BrandContextValue {
    const ctx = useContext(BrandContext);
    if (!ctx) {
        throw new Error("useBrand must be used within a <BrandProvider>");
    }
    return ctx;
}

export function useBrand(): BrandManifest {
    return useBrandContext().brand;
}

// Effective layered flags (plan §8): defaults ← bundled brand flags ← per-tenant remote.
// Consumers gate on this, never on the raw manifest, so the remote layer is transparent.
export function useBrandFlags(): Record<string, boolean> {
    return useBrandContext().flags;
}

// Read a single resolved flag by name. Prefer a `PlayerFeatureFlag` name (flags.ts) so an
// unset flag falls back to its FLAG_DEFAULTS value rather than `false`.
export function useFlag(flag: string): boolean {
    const { brand, flags } = useBrandContext();
    // `flags` is already resolved; isFlagEnabled re-applies the default floor for unknown keys.
    return flags[flag] ?? isFlagEnabled(flag, brand.flags);
}

// Model B runtime brand selection (plan §3, §14 Phase 5). A shared-app flow calls
// `selectBrand(brandId)` after the player picks a club to re-skin the whole app at runtime.
export function useBrandSelection(): {
    activeBrandId: string;
    selectBrand: (brandId: string | null | undefined) => void;
} {
    const { brand, selectBrand } = useBrandContext();
    return { activeBrandId: brand.id, selectBrand };
}
