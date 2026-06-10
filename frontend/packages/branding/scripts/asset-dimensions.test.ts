// CI dimension validation (plan §6 "Validation in CI", §11 "validate-brands"): every
// brand's generated native assets must exist at the exact dimensions and alpha rule the
// asset spec requires. A brand with a wrong-sized or alpha-bearing icon fails CI here,
// not a customer's first launch (plan §16 "default/fallback gaps").
//
// This complements `src/schema.test.ts` (which only checks assets *exist*) by asserting
// they are correctly *dimensioned* — the part that catches a bad master export.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { brandAssetDescriptors } from "../src/asset-descriptors";
import { ASSET_SPEC, readPngHeader } from "./asset-spec.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const mobileAppRoot = resolve(here, "../../../apps/mobile-player");

describe.each(brandAssetDescriptors.map((d) => [d.id, d] as const))(
    "brand %s assets",
    (_id, descriptor) => {
        for (const spec of ASSET_SPEC) {
            it(`${spec.key} is ${spec.width}x${spec.height}${spec.opaque ? " opaque" : ""}`, () => {
                const rel = descriptor.outputs[spec.key as keyof typeof descriptor.outputs];
                const abs = resolve(mobileAppRoot, rel);
                const header = readPngHeader(readFileSync(abs));
                expect(header.width, `${rel} width`).toBe(spec.width);
                expect(header.height, `${rel} height`).toBe(spec.height);
                // iOS app icon must be opaque (no alpha) — the App Store rejects alpha.
                expect(header.hasAlpha, `${rel} alpha`).toBe(!spec.opaque);
            });
        }
    },
);
