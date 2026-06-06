import { describe, expect, it } from "vitest";
import {
    formatPrice,
    DAY_NAMES,
    PAGE_SIZE,
    EMPTY_RULE,
    timeToMinutes,
    mergeIntervals,
    computeCoverage,
    sessionTypeOf,
} from "./pricingRulesConstants";

describe("formatPrice", () => {
    it("returns — for undefined", () => {
        expect(formatPrice(undefined, "GBP")).toBe("—");
    });

    it("returns — for empty string", () => {
        expect(formatPrice("", "GBP")).toBe("—");
    });

    it("formats number with currency prefix", () => {
        expect(formatPrice(20, "GBP")).toBe("GBP 20");
    });

    it("formats string price with currency prefix", () => {
        expect(formatPrice("15.50", "EUR")).toBe("EUR 15.50");
    });
});

describe("DAY_NAMES", () => {
    it("has 7 days", () => {
        expect(DAY_NAMES).toHaveLength(7);
    });

    it("starts with Monday", () => {
        expect(DAY_NAMES[0]).toBe("Monday");
    });

    it("ends with Sunday", () => {
        expect(DAY_NAMES[6]).toBe("Sunday");
    });
});

describe("EMPTY_RULE", () => {
    it("has is_active true", () => {
        expect(EMPTY_RULE.is_active).toBe(true);
    });

    it("defaults label to standard", () => {
        expect(EMPTY_RULE.label).toBe("standard");
    });

    it("defaults session_type to regular", () => {
        expect(EMPTY_RULE.session_type).toBe("regular");
    });

    it("defaults to day 0 (Monday)", () => {
        expect(EMPTY_RULE.day_of_week).toBe(0);
    });
});

describe("sessionTypeOf", () => {
    it("returns the rule's session_type when set", () => {
        expect(sessionTypeOf({ ...EMPTY_RULE, session_type: "lesson_group" })).toBe("lesson_group");
    });

    it("falls back to regular when session_type is missing", () => {
        expect(sessionTypeOf({ ...EMPTY_RULE, session_type: undefined })).toBe("regular");
    });
});

describe("timeToMinutes", () => {
    it("converts HH:MM to minutes since midnight", () => {
        expect(timeToMinutes("08:30")).toBe(510);
    });

    it("returns 0 for malformed input", () => {
        expect(timeToMinutes("")).toBe(0);
    });
});

describe("mergeIntervals", () => {
    it("merges overlapping intervals", () => {
        expect(
            mergeIntervals([
                { start: 0, end: 60 },
                { start: 30, end: 120 },
            ])
        ).toEqual([{ start: 0, end: 120 }]);
    });

    it("keeps disjoint intervals separate and sorted", () => {
        expect(
            mergeIntervals([
                { start: 200, end: 300 },
                { start: 0, end: 60 },
            ])
        ).toEqual([
            { start: 0, end: 60 },
            { start: 200, end: 300 },
        ]);
    });
});

describe("computeCoverage", () => {
    it("flags no open hours when window is null", () => {
        const c = computeCoverage([{ start: 480, end: 1320 }], null);
        expect(c.noOpenHours).toBe(true);
        expect(c.fullyCovered).toBe(false);
    });

    it("reports fully covered when rules span the open window", () => {
        const c = computeCoverage([{ start: 480, end: 1320 }], { start: 480, end: 1320 });
        expect(c.fullyCovered).toBe(true);
        expect(c.gaps).toHaveLength(0);
    });

    it("reports gaps for unpriced open periods", () => {
        const c = computeCoverage([{ start: 480, end: 720 }], { start: 480, end: 1320 });
        expect(c.fullyCovered).toBe(false);
        expect(c.gaps).toEqual([{ start: 720, end: 1320 }]);
    });
});

describe("PAGE_SIZE", () => {
    it("is a positive number", () => {
        expect(PAGE_SIZE).toBeGreaterThan(0);
    });
});
