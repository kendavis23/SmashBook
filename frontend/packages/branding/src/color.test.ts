// Verifies hex → HSL-triplet conversion matches the format authored in tokens.css, so the
// className CSS vars injected at runtime resolve identically to the static design tokens.

import { describe, expect, it } from "vitest";
import { hexToHslTriplet } from "./color";

describe("hexToHslTriplet", () => {
    it("converts the _default CTA blue to a valid HSL triplet near the tokens.css value", () => {
        // #2563EB rounds to `221 83% 53%` in tokens.css; the exact conversion keeps one
        // decimal (still a valid `hsl()` value, renders identically).
        expect(hexToHslTriplet("#2563EB")).toBe("221.2 83.2% 53.3%");
    });

    it("converts pure white and black", () => {
        expect(hexToHslTriplet("#FFFFFF")).toBe("0 0% 100%");
        expect(hexToHslTriplet("#000000")).toBe("0 0% 0%");
    });

    it("handles 3-digit shorthand hex", () => {
        expect(hexToHslTriplet("#fff")).toBe("0 0% 100%");
    });

    it("ignores the alpha channel of 8-digit hex", () => {
        expect(hexToHslTriplet("#2563EB80")).toBe("221.2 83.2% 53.3%");
    });

    it("returns null for non-hex values (rgba, named)", () => {
        expect(hexToHslTriplet("rgba(255,255,255,0.18)")).toBeNull();
        expect(hexToHslTriplet("transparent")).toBeNull();
    });
});
