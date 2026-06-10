// Brand resolution: explicit-id fallback and Model B tenant → brand mapping (plan §3, §4).

import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_ID } from "./registry";
import { brandForTenant, resolveActiveBrand, resolveBrand } from "./resolve";

describe("resolveBrand", () => {
    it("resolves a known brand id", () => {
        expect(resolveBrand("ace-staging").id).toBe("ace-staging");
    });

    it("falls back to _default for an unknown id", () => {
        expect(resolveBrand("does-not-exist").id).toBe(DEFAULT_BRAND_ID);
    });

    it("falls back to _default for a missing id", () => {
        expect(resolveBrand(null).id).toBe(DEFAULT_BRAND_ID);
        expect(resolveBrand(undefined).id).toBe(DEFAULT_BRAND_ID);
    });
});

describe("resolveActiveBrand", () => {
    it("reads ACTIVE_BRAND from the passed env", () => {
        expect(resolveActiveBrand({ ACTIVE_BRAND: "ace-staging" } as NodeJS.ProcessEnv).id).toBe(
            "ace-staging"
        );
    });

    it("falls back to _default when ACTIVE_BRAND is unset", () => {
        expect(resolveActiveBrand({} as NodeJS.ProcessEnv).id).toBe(DEFAULT_BRAND_ID);
    });
});

describe("brandForTenant", () => {
    it("maps a tenant subdomain to the brand that claims it", () => {
        // ace-staging's manifest lists `tenants: ["ace-staging"]`.
        expect(brandForTenant("ace-staging").id).toBe("ace-staging");
    });

    it("falls back to _default for an unclaimed tenant (Model B default path)", () => {
        expect(brandForTenant("some-new-club").id).toBe(DEFAULT_BRAND_ID);
    });

    it("falls back to _default for a missing subdomain", () => {
        expect(brandForTenant(null).id).toBe(DEFAULT_BRAND_ID);
        expect(brandForTenant(undefined).id).toBe(DEFAULT_BRAND_ID);
    });
});
