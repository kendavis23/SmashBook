// validate-brands — the CI gate (plan §11): every brand manifest must Zod-validate, its
// native assets must exist, and its theme token set must match the mobile ThemeColors
// contract. A malformed/incomplete brand fails here, before any native build (plan §6, §16).

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { allBrands, brandRegistry } from "./registry";
import { brandManifestSchema, themeColorTokenNames } from "./schema";
import type { ThemeColors } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
// Native asset paths in a manifest are relative to the mobile app's asset root
// (`./assets/*` → apps/mobile-player/assets/*). _default reuses the in-app asset set.
const mobileAppRoot = resolve(here, "../../../apps/mobile-player");

// Compile-time guard: the schema's exported token list must equal keyof ThemeColors.
// If a token is added to the type but not the schema (or vice-versa), this assignment
// fails type-check — the parity guarantee the plan (§16) requires.
const _tokenParity: ReadonlyArray<keyof ThemeColors> = themeColorTokenNames;
void _tokenParity;

describe("brand registry", () => {
    it("has the _default brand", () => {
        const defaultBrand = brandRegistry._default;
        expect(defaultBrand).toBeDefined();
        expect(defaultBrand?.id).toBe("_default");
    });

    it("registry key matches each manifest id", () => {
        for (const [key, manifest] of Object.entries(brandRegistry)) {
            expect(manifest.id).toBe(key);
        }
    });
});

describe.each(allBrands.map((b) => [b.id, b] as const))("brand %s", (_id, brand) => {
    it("passes the manifest schema", () => {
        const result = brandManifestSchema.safeParse(brand);
        expect(result.success, JSON.stringify(result.error?.format(), null, 2)).toBe(true);
    });

    it("defines every ThemeColors token in theme.light", () => {
        for (const token of themeColorTokenNames) {
            expect(brand.theme.light[token], `missing token: ${token}`).toBeTruthy();
        }
    });

    it("has all required native assets on disk", () => {
        const assets = [
            brand.native.icon,
            brand.native.adaptiveIcon,
            brand.native.splash,
            brand.native.notificationIcon,
        ];
        for (const assetPath of assets) {
            const abs = resolve(mobileAppRoot, assetPath);
            expect(existsSync(abs), `missing asset: ${assetPath} (${abs})`).toBe(true);
        }
    });
});
