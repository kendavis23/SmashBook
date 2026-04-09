import { describe, expect, it } from "vitest";
import { formatPrice, DAY_NAMES, PAGE_SIZE, EMPTY_RULE } from "./pricingRulesConstants";

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

    it("has empty label", () => {
        expect(EMPTY_RULE.label).toBe("");
    });

    it("defaults to day 0 (Monday)", () => {
        expect(EMPTY_RULE.day_of_week).toBe(0);
    });
});

describe("PAGE_SIZE", () => {
    it("is a positive number", () => {
        expect(PAGE_SIZE).toBeGreaterThan(0);
    });
});
