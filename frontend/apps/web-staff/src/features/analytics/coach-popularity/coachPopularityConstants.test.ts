import { describe, expect, it } from "vitest";
import {
    coachDisplayName,
    coachInitials,
    daysSince,
    formatReturnRate,
    formatSessionDate,
    relativeSessionLabel,
} from "./coachPopularityConstants";

describe("formatSessionDate", () => {
    it("formats a bare snapshot date without timezone drift", () => {
        expect(formatSessionDate("2026-06-02")).toBe("02 Jun 2026");
    });

    it("formats from the date part of an ISO timestamp", () => {
        expect(formatSessionDate("2026-12-31T23:30:00Z")).toBe("31 Dec 2026");
    });

    it("returns — for null / empty / unparseable", () => {
        expect(formatSessionDate(null)).toBe("—");
        expect(formatSessionDate("")).toBe("—");
        expect(formatSessionDate("not-a-date")).toBe("—");
        expect(formatSessionDate("2026-13-01")).toBe("—");
    });
});

describe("daysSince / relativeSessionLabel", () => {
    it("returns null for unparseable input", () => {
        expect(daysSince(null)).toBeNull();
        expect(relativeSessionLabel(null)).toBe("—");
    });

    it("clamps future dates to 0 (Today)", () => {
        const future = "2999-01-01";
        expect(daysSince(future)).toBe(0);
        expect(relativeSessionLabel(future)).toBe("Today");
    });
});

describe("formatReturnRate", () => {
    it("renders a 0–1 rate as a rounded percentage", () => {
        expect(formatReturnRate(0.5)).toBe("50%");
        expect(formatReturnRate(0.644)).toBe("64%");
        expect(formatReturnRate(1)).toBe("100%");
    });

    it("guards zero / null / NaN to 0%", () => {
        expect(formatReturnRate(0)).toBe("0%");
        expect(formatReturnRate(null)).toBe("0%");
        expect(formatReturnRate(undefined)).toBe("0%");
        expect(formatReturnRate(Number.NaN)).toBe("0%");
    });
});

describe("coachDisplayName / coachInitials", () => {
    it("falls back to a placeholder for empty names", () => {
        expect(coachDisplayName(null)).toBe("Unknown coach");
        expect(coachDisplayName("  ")).toBe("Unknown coach");
        expect(coachInitials(null)).toBe("?");
    });

    it("uses the trimmed name and first/last initials", () => {
        expect(coachDisplayName("  Jane Doe ")).toBe("Jane Doe");
        expect(coachInitials("Jane Doe")).toBe("JD");
        expect(coachInitials("Cher")).toBe("CH");
    });
});
