// Layered feature-flag resolution (plan §8): remote ?? brand ?? default, per-key.

import { describe, expect, it } from "vitest";
import { FLAG_DEFAULTS, isFlagEnabled, resolveFlags } from "./flags";

describe("resolveFlags", () => {
    it("returns the code defaults when no brand or remote flags are given", () => {
        expect(resolveFlags()).toEqual(FLAG_DEFAULTS);
    });

    it("lets brand flags override the code defaults", () => {
        const merged = resolveFlags({ bookings: false });
        expect(merged.bookings).toBe(false);
        // Untouched defaults remain.
        expect(merged.profile).toBe(true);
    });

    it("lets remote flags override brand flags (most-specific wins)", () => {
        const merged = resolveFlags({ bookings: false }, { bookings: true });
        expect(merged.bookings).toBe(true);
    });

    it("falls through to brand flags when remote is null (failed/offline fetch)", () => {
        const merged = resolveFlags({ membership: false }, null);
        expect(merged.membership).toBe(false);
    });

    it("carries brand-specific (non-known) flags through unchanged", () => {
        const merged = resolveFlags({ experimentalTab: true });
        expect(merged.experimentalTab).toBe(true);
    });

    it("never drops a known default even when only an unrelated flag is overridden", () => {
        const merged = resolveFlags({}, { payments: false });
        expect(merged.payments).toBe(false);
        expect(merged.bookings).toBe(true);
    });
});

describe("isFlagEnabled", () => {
    it("reads a single resolved flag with layering applied", () => {
        expect(isFlagEnabled("bookings")).toBe(true);
        expect(isFlagEnabled("bookings", { bookings: false })).toBe(false);
        expect(isFlagEnabled("bookings", { bookings: false }, { bookings: true })).toBe(true);
    });

    it("returns false for an unknown flag absent from every layer", () => {
        expect(isFlagEnabled("noSuchFlag")).toBe(false);
    });
});
