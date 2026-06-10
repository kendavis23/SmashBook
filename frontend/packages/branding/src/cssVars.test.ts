// Verifies the brand → CSS-var mapping produces the variables NativeWind's className tokens
// resolve through, only for className-mapped tokens, with tailwindOverrides winning last.

import { describe, expect, it } from "vitest";
import { buildBrandCssVars } from "./cssVars";
import { defaultBrand } from "./brands/_default/brand.config";

describe("buildBrandCssVars", () => {
    const vars = buildBrandCssVars(defaultBrand.theme.light);

    it("maps the _default CTA token to --cta as an HSL triplet", () => {
        expect(vars["--cta"]).toBe("221.2 83.2% 53.3%");
    });

    it("maps core surface tokens to their CSS variables", () => {
        expect(vars["--background"]).toBe("0 0% 100%");
        expect(vars["--foreground"]).toBeDefined();
        expect(vars["--card"]).toBe("0 0% 100%");
    });

    it("does not emit CSS vars for JS-only tokens (hero, tabBar, overlay)", () => {
        // These have no `className` counterpart in tailwind-config and are consumed via
        // useThemeColors() only — they must not leak into the vars() injection.
        expect(vars["--hero"]).toBeUndefined();
        expect(vars["--tab-bar"]).toBeUndefined();
        expect(vars["--overlay"]).toBeUndefined();
    });

    it("lets tailwindOverrides override a derived value verbatim", () => {
        const overridden = buildBrandCssVars(defaultBrand.theme.light, {
            "--cta": "10 90% 50%",
            "--radius": "0.75rem",
        });
        expect(overridden["--cta"]).toBe("10 90% 50%");
        expect(overridden["--radius"]).toBe("0.75rem");
    });
});
