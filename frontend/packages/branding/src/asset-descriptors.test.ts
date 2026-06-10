// Keeps the checked-in `scripts/brands.generated.json` (consumed by the dependency-free
// `.mjs` asset generator and the CI brand-matrix script) in sync with the registry — the
// single source of truth (plan §15 "brand registry as the single iterable").
//
// The `.mjs` pipeline scripts can't import the TS registry without a transpiler, so the
// registry is projected to JSON here (where vitest transpiles TS for free). If a brand is
// added/changed without regenerating the JSON, this test fails with the exact command to
// run — the JSON can never silently drift from the registry.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { brandAssetDescriptors } from "./asset-descriptors";

const here = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(here, "../scripts/brands.generated.json");

// Set REGEN=1 to write the file (used once when adding/changing a brand):
//   REGEN=1 pnpm --filter @repo/branding test -- asset-descriptors
const serialized = JSON.stringify(brandAssetDescriptors, null, 2) + "\n";

describe("brands.generated.json", () => {
    if (process.env.REGEN) {
        it("regenerates the descriptor JSON", () => {
            writeFileSync(jsonPath, serialized);
            expect(readFileSync(jsonPath, "utf8")).toBe(serialized);
        });
        return;
    }

    it("is in sync with the brand registry", () => {
        let current: string;
        try {
            current = readFileSync(jsonPath, "utf8");
        } catch {
            current = "";
        }
        expect(
            current,
            "brands.generated.json is stale. Regenerate it with:\n" +
                "  REGEN=1 pnpm --filter @repo/branding test -- asset-descriptors"
        ).toBe(serialized);
    });
});
