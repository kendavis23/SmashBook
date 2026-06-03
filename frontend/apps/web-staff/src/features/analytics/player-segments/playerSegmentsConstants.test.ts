import { describe, expect, it } from "vitest";
import {
    DEFAULT_DIMENSION,
    DEFAULT_INACTIVE_DAYS,
    segmentColor,
    SEGMENT_COLORS,
    SEGMENT_FALLBACK_COLOR,
    paidMemberPct,
    formatPct,
} from "./playerSegmentsConstants";

describe("playerSegmentsConstants — defaults", () => {
    it("defaults the dimension to membership_tier", () => {
        expect(DEFAULT_DIMENSION).toBe("membership_tier");
    });

    it("defaults inactive_days to 30", () => {
        expect(DEFAULT_INACTIVE_DAYS).toBe(30);
    });
});

describe("segmentColor", () => {
    it("returns a ramp colour within range", () => {
        expect(segmentColor(0)).toBe(SEGMENT_COLORS[0]);
        expect(segmentColor(2)).toBe(SEGMENT_COLORS[2]);
    });

    it("falls back to the muted token beyond the ramp", () => {
        expect(segmentColor(SEGMENT_COLORS.length)).toBe(SEGMENT_FALLBACK_COLOR);
    });
});

describe("paidMemberPct", () => {
    it("computes the share", () => {
        expect(paidMemberPct(75, 100)).toBe(75);
    });

    it("returns 0 (never NaN) when there are no players", () => {
        expect(paidMemberPct(0, 0)).toBe(0);
    });
});

describe("formatPct", () => {
    it("renders one decimal with a percent sign", () => {
        expect(formatPct(72.359)).toBe("72.4%");
        expect(formatPct(0)).toBe("0.0%");
    });
});
