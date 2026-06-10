// Brand asset generation pipeline (plan §6, Phase 6).
//
// Registry-driven: iterates `brands.generated.json` (the JSON projection of the brand
// registry, kept in sync by `src/asset-descriptors.test.ts`) and emits the full native
// asset set for each brand from its accent colour — one master geometry, every size, no
// per-brand code. This is the "adding a brand is data, not code" guarantee (plan §15):
// a new brand gets its icons by appearing in the registry, not by writing a script.
//
// Assets land at each brand's `native.*` paths under the mobile app's `assets/` root, so
// app.config.ts resolves them unchanged. These are correctly-dimensioned PLACEHOLDERS
// (accent field + geometric mark); real brand art replaces the PNGs at the same sizes —
// the brand-kit intake (docs/white-label/FE_WHITE_LABEL_BRAND_KIT.md) is the master-art workflow.
//
// Usage (from packages/branding):
//   node scripts/generate-assets.mjs                 # all brands
//   node scripts/generate-assets.mjs ace-staging     # one brand
//   node scripts/generate-assets.mjs --dedicated     # only Model A brands

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    createCanvas,
    drawS,
    encodePng,
    fillRect,
    hexToRgb,
    WHITE,
} from "./png.mjs";
import { ASSET_SPEC } from "./asset-spec.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const descriptors = JSON.parse(
    readFileSync(join(here, "brands.generated.json"), "utf8"),
);
// Output paths in the manifest are relative to the mobile app root (./assets/...).
const mobileAppRoot = resolve(here, "../../../apps/mobile-player");

const SLATE_900 = [0x0f, 0x17, 0x2a]; // neutral wordmark bar on the splash placeholder

// Render one asset's placeholder geometry into a fresh canvas per the spec entry.
function renderAsset(spec, accent) {
    const { width: w, height: h, draw } = spec;
    const accentRgb = hexToRgb(accent);

    switch (draw.type) {
        case "iconField": {
            // accent field, white mark centred
            const c = createCanvas(w, h, accentRgb, 255);
            const s = draw.markSize;
            drawS(c, (w - s) / 2, (h - s) / 2, s, WHITE);
            return c;
        }
        case "markOnTransparent": {
            const c = createCanvas(w, h, [0, 0, 0], 0);
            const s = draw.markSize;
            const color = draw.color === "white" ? WHITE : accentRgb;
            drawS(c, (w - s) / 2, (h - s) / 2, s, color);
            return c;
        }
        case "splash": {
            const c = createCanvas(w, h, [0, 0, 0], 0);
            const s = draw.markSize;
            drawS(c, (w - s) / 2, h * 0.29, s, accentRgb);
            fillRect(c, w * 0.3, h * 0.586, w * 0.7, h * 0.633, SLATE_900);
            return c;
        }
        default:
            throw new Error(`unknown draw type: ${draw.type}`);
    }
}

function generateBrand(descriptor) {
    const { id, accent, outputs } = descriptor;
    for (const spec of ASSET_SPEC) {
        const canvas = renderAsset(spec, accent);
        const rel = outputs[spec.key];
        if (!rel) throw new Error(`brand ${id}: no output path for "${spec.key}"`);
        const abs = resolve(mobileAppRoot, rel);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, encodePng(canvas, spec.opaque));
        console.log(
            `  ${spec.key.padEnd(16)} ${spec.width}x${spec.height}` +
                `${spec.opaque ? " [opaque]" : ""} → ${rel}`,
        );
    }
}

function selectBrands(argv) {
    const args = argv.slice(2);
    if (args.includes("--dedicated")) {
        return descriptors.filter((d) => d.deliveryModel === "dedicated");
    }
    const ids = args.filter((a) => !a.startsWith("--"));
    if (ids.length === 0) return descriptors;
    return ids.map((id) => {
        const d = descriptors.find((x) => x.id === id);
        if (!d) throw new Error(`unknown brand: ${id}`);
        return d;
    });
}

const brands = selectBrands(process.argv);
for (const descriptor of brands) {
    console.log(`brand ${descriptor.id} (accent ${descriptor.accent}):`);
    generateBrand(descriptor);
}
console.log(`done — generated assets for ${brands.length} brand(s).`);
