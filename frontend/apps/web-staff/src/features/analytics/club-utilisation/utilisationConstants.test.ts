import { describe, expect, it } from "vitest";
import { formatShortDate, formatWeekday, utilisationTone } from "./utilisationConstants";

describe("formatShortDate", () => {
    it("formats an ISO date as 'day Month'", () => {
        expect(formatShortDate("2026-05-25")).toBe("25 May");
        expect(formatShortDate("2026-01-01")).toBe("1 Jan");
    });
});

describe("formatWeekday", () => {
    it("returns the correct weekday without timezone shift", () => {
        expect(formatWeekday("2026-05-25")).toBe("Mon");
        expect(formatWeekday("2026-05-31")).toBe("Sun");
    });
});

describe("utilisationTone", () => {
    it("buckets percentages into tones", () => {
        expect(utilisationTone(75)).toBe("success");
        expect(utilisationTone(60)).toBe("success");
        expect(utilisationTone(55)).toBe("warning");
        expect(utilisationTone(40)).toBe("warning");
        expect(utilisationTone(20)).toBe("muted");
    });
});
