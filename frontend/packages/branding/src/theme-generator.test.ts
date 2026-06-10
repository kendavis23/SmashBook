// Locks two guarantees of the minimal-input refactor:
//   1. _default, now generated via defineBrand() from a minimal BrandInput, resolves to the
//      EXACT tokens it had when hand-authored — "preserve _default exactly" (plan req. 5).
//   2. defineBrand() applies its native + presentation conventions/defaults correctly.

import { describe, expect, it } from "vitest";
import { defineBrand } from "./define-brand";
import { defaultBrand } from "./brands/_default/brand.config";
import { generateLightTheme } from "./theme-generator";
import type { ThemeColors } from "./types";

// The previously hand-authored _default tokens, frozen here as the regression baseline.
const ORIGINAL_LIGHT: ThemeColors = {
    background: "#FFFFFF",
    foreground: "#0F172A",
    card: "#FFFFFF",
    cardForeground: "#0F172A",
    primary: "#0F172A",
    primaryForeground: "#FFFFFF",
    secondary: "#F1F5F9",
    secondaryForeground: "#0F172A",
    muted: "#F1F5F9",
    mutedForeground: "#64748B",
    accent: "#E2E8F0",
    accentForeground: "#0F172A",
    border: "#E2E8F0",
    input: "#E2E8F0",
    ring: "#3B82F6",
    cta: "#2563EB",
    ctaForeground: "#FFFFFF",
    ctaHover: "#1D4ED8",
    ctaSurface: "#EFF6FF",
    ctaBorder: "#BFDBFE",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    destructiveSurface: "#FEF2F2",
    success: "#15803D",
    successForeground: "#FFFFFF",
    successSurface: "#F0FDF4",
    warning: "#F59E0B",
    warningForeground: "#FFFFFF",
    warningSurface: "#FFFBEB",
    hero: "#2563EB",
    heroForeground: "#FFFFFF",
    heroMuted: "#BFDBFE",
    heroGlass: "rgba(255,255,255,0.18)",
    heroGlassBorder: "rgba(255,255,255,0.25)",
    contentSurface: "#F1F5F9",
    tabBar: "#FFFFFF",
    tabBarBorder: "rgba(15,23,42,0.08)",
    tabActive: "#2563EB",
    tabActiveLabel: "#0F172A",
    tabInactive: "#94A3B8",
    overlay: "rgba(17,24,39,0.42)",
    placeholder: "#94A3B8",
    shadow: "#0F172A",
    skeleton: "#F1F5F9",
    ripple: "rgba(37,99,235,0.10)",
};

const ORIGINAL_DARK: ThemeColors = {
    background: "#0F172A",
    foreground: "#E1E7EF",
    card: "#0B1220",
    cardForeground: "#E1E7EF",
    primary: "#E1E7EF",
    primaryForeground: "#0F172A",
    secondary: "#1E293B",
    secondaryForeground: "#E1E7EF",
    muted: "#10192B",
    mutedForeground: "#94A3B8",
    accent: "#1E293B",
    accentForeground: "#E1E7EF",
    border: "#1F2A3D",
    input: "#1F2A3D",
    ring: "#3B82F6",
    cta: "#3B82F6",
    ctaForeground: "#FFFFFF",
    ctaHover: "#2563EB",
    ctaSurface: "rgba(59,130,246,0.16)",
    ctaBorder: "rgba(59,130,246,0.32)",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    destructiveSurface: "rgba(239,68,68,0.12)",
    success: "#22C55E",
    successForeground: "#FFFFFF",
    successSurface: "rgba(34,197,94,0.12)",
    warning: "#F59E0B",
    warningForeground: "#FFFFFF",
    warningSurface: "rgba(245,158,11,0.12)",
    hero: "#1E40AF",
    heroForeground: "#FFFFFF",
    heroMuted: "#BFDBFE",
    heroGlass: "rgba(255,255,255,0.12)",
    heroGlassBorder: "rgba(255,255,255,0.18)",
    contentSurface: "#0F172A",
    tabBar: "#0B1220",
    tabBarBorder: "rgba(255,255,255,0.08)",
    tabActive: "#60A5FA",
    tabActiveLabel: "#E1E7EF",
    tabInactive: "#64748B",
    overlay: "rgba(0,0,0,0.6)",
    placeholder: "#64748B",
    shadow: "#000000",
    skeleton: "#1E293B",
    ripple: "rgba(96,165,250,0.16)",
};

describe("_default theme parity (preserve exactly)", () => {
    it("light tokens are byte-identical to the original hand-authored set", () => {
        expect(defaultBrand.theme.light).toEqual(ORIGINAL_LIGHT);
    });

    it("dark tokens are byte-identical to the original hand-authored set", () => {
        expect(defaultBrand.theme.dark).toEqual(ORIGINAL_DARK);
    });
});

describe("defineBrand conventions", () => {
    const brand = defineBrand({
        id: "pilot",
        displayName: "Pilot Club",
        native: {
            iosBundleId: "app.pilot.player",
            androidPackage: "app.pilot.player",
            icon: "./assets/icon.png",
            splash: "./assets/splash-icon.png",
        },
        branding: { primaryColor: "#10B981" },
        assets: { logo: "./assets/icon.png" },
        flags: { lessons: true },
    });

    it("defaults deliveryModel to shared", () => {
        expect(brand.deliveryModel).toBe("shared");
    });

    it("derives scheme from id and stripe merchant from bundle id", () => {
        expect(brand.native.scheme).toBe("pilot");
        expect(brand.native.stripeMerchantId).toBe("merchant.app.pilot.player");
    });

    it("defaults adaptive + notification icons to the main icon", () => {
        expect(brand.native.adaptiveIcon).toBe("./assets/icon.png");
        expect(brand.native.notificationIcon).toBe("./assets/icon.png");
    });

    it("derives a full theme from the single primary colour", () => {
        // CTA is the primary; surface/border/hover are derived (non-empty, distinct).
        expect(brand.theme.light.cta).toBe("#10B981");
        expect(brand.theme.light.ctaHover).not.toBe(brand.theme.light.cta);
        expect(brand.theme.light.ctaSurface).toBeTruthy();
        expect(brand.theme.dark?.cta).toBeTruthy();
    });

    it("carries the supplied flags and a font default", () => {
        expect(brand.flags.lessons).toBe(true);
        expect(brand.fonts.sans).toBe("Inter");
    });
});

describe("generateLightTheme defaults", () => {
    it("falls back to white background and slate900 text without secondary/bg", () => {
        const t = generateLightTheme({ primaryColor: "#2563EB" });
        expect(t.background).toBe("#FFFFFF");
        expect(t.foreground).toBe("#0F172A");
    });
});
