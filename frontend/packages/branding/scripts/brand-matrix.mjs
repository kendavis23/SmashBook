// Brand-matrix generator for CI (plan §10 "Build matrix orchestration", §11).
//
// Emits the set of brands that need a native EAS build, as a GitHub Actions matrix.
// Iterates the same `brands.generated.json` projection of the registry every other tool
// uses — one list, never a hand-maintained per-brand build script (plan §15).
//
// Selection:
//   - default: only `deliveryModel: "dedicated"` brands (Model A — the ones with their
//     own store listing / EAS project). Model B ships as the single `_default` shared
//     build, handled separately, so it is excluded from the per-brand matrix.
//   - --all: every brand (used by a full release run).
//   - --changed <a,b,..>: intersect with a CI-provided list of brand ids whose folder
//     changed (don't rebuild 50 apps because one club changed a colour — that's an OTA).
//
// Output (stdout): `matrix={"brand":[...]}` line for `$GITHUB_OUTPUT`, plus a human echo
// on stderr. Each brand also carries its OTA channel per profile so the build step can set
// `--channel` without re-deriving it.
//
// Usage:
//   node scripts/brand-matrix.mjs                          # dedicated brands
//   node scripts/brand-matrix.mjs --all
//   node scripts/brand-matrix.mjs --changed ace-staging
//   node scripts/brand-matrix.mjs --profile production --changed ace-staging,club-madrid

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const descriptors = JSON.parse(
    readFileSync(join(here, "brands.generated.json"), "utf8"),
);

function arg(flag) {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : undefined;
}

const profile = arg("--profile") ?? "production";
const all = process.argv.includes("--all");
const changedRaw = arg("--changed");
const changed = changedRaw
    ? new Set(changedRaw.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

let brands = descriptors;
if (!all) {
    // The per-brand native matrix is the Model A set; Model B is one shared build.
    brands = brands.filter((d) => d.deliveryModel === "dedicated");
}
if (changed) {
    brands = brands.filter((d) => changed.has(d.id));
}

// OTA channel convention (plan §12): `<brandId>-<environment>`, one channel per
// brand × environment so a brand's update never lands on the wrong binary.
const matrix = {
    brand: brands.map((d) => ({
        id: d.id,
        profile,
        channel: `${d.id}-${profile}`,
    })),
};

process.stderr.write(
    `brand-matrix: profile=${profile} ${all ? "all" : "dedicated"}` +
        `${changed ? ` changed={${[...changed].join(",")}}` : ""} → ` +
        `${matrix.brand.map((b) => b.id).join(", ") || "(none)"}\n`,
);

// `matrix=` line for `>> "$GITHUB_OUTPUT"`; empty matrix => the build job is skipped.
process.stdout.write(`matrix=${JSON.stringify(matrix)}\n`);
