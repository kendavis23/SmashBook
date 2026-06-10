// Layered feature-flag resolution (plan §8).
//
// A player-facing feature flag is resolved in three layers, most-specific wins:
//
//     effective = remoteOverride (per-tenant, from backend)
//              ?? brandManifest.flags     (per-brand, bundled, offline-safe)
//              ?? globalDefault           (code default below)
//
// `BrandFlags` (types.ts) is an open `Record<string, boolean>` so a brand can carry an
// arbitrary feature gate without a schema change. This module pins the KNOWN player-facing
// flags so features can gate on a typed name with a guaranteed safe default — a missing or
// failed remote fetch can never produce a blank app (plan §8 guard rails). Unknown flag keys
// still resolve (brand ?? remote) but without a compile-time name.

import type { BrandFlags } from "./types";

// Known player-facing feature flags. Add a flag here the moment a feature gates on it, so it
// gets a typed name and a safe default. The string value is the wire/manifest key.
export const PLAYER_FEATURE_FLAGS = {
    bookings: "bookings",
    myGames: "myGames",
    membership: "membership",
    payments: "payments",
    profile: "profile",
} as const;

export type PlayerFeatureFlag = (typeof PLAYER_FEATURE_FLAGS)[keyof typeof PLAYER_FEATURE_FLAGS];

// Global code defaults — the floor of the layered resolution. Every known flag has a safe
// default so an app with no brand flags and no remote fetch still renders its core surfaces.
// Default to ON for shipped core features; gate genuinely optional capabilities OFF.
export const FLAG_DEFAULTS: Record<PlayerFeatureFlag, boolean> = {
    bookings: true,
    myGames: true,
    membership: true,
    payments: true,
    profile: true,
};

// Merge the three flag layers into one effective map. Pure — no React, no env. The remote
// layer is whatever a player-facing flag endpoint returned for the active tenant (plan §13.2);
// it is optional so an offline/failed fetch falls straight through to the bundled brand flags,
// then the code defaults. Later layers override earlier on a per-key basis.
export function resolveFlags(
    brandFlags: BrandFlags = {},
    remoteFlags?: BrandFlags | null
): Record<string, boolean> {
    return { ...FLAG_DEFAULTS, ...brandFlags, ...(remoteFlags ?? {}) };
}

// Read a single resolved flag by name, applying the same layering. Unknown keys (not in
// FLAG_DEFAULTS) resolve to `false` when absent from both brand and remote — features should
// prefer a `PlayerFeatureFlag` name so the default comes from FLAG_DEFAULTS instead.
export function isFlagEnabled(
    flag: string,
    brandFlags: BrandFlags = {},
    remoteFlags?: BrandFlags | null
): boolean {
    return resolveFlags(brandFlags, remoteFlags)[flag] ?? false;
}
