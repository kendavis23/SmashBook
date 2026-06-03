import { describe, expect, it } from "vitest";
import { formatPeriodLabel, granularityNoun } from "./playerActivityConstants";

describe("formatPeriodLabel", () => {
    it("formats a bare YYYY-MM-DD as day/week without timezone drift", () => {
        expect(formatPeriodLabel("2026-06-02", "day")).toBe("2 Jun");
        expect(formatPeriodLabel("2026-06-02", "week")).toBe("2 Jun");
    });

    it("formats a month bucket as 'Mon YYYY'", () => {
        expect(formatPeriodLabel("2026-06-01", "month")).toBe("Jun 2026");
    });

    it("takes the date part of an ISO timestamp", () => {
        expect(formatPeriodLabel("2026-01-12T23:30:00Z", "day")).toBe("12 Jan");
    });

    it("returns em dash for unparseable input", () => {
        expect(formatPeriodLabel("", "day")).toBe("—");
        expect(formatPeriodLabel("not-a-date", "day")).toBe("—");
        expect(formatPeriodLabel("2026-13-40", "day")).toBe("—");
    });
});

describe("granularityNoun", () => {
    it("maps each granularity to its singular noun", () => {
        expect(granularityNoun("day")).toBe("day");
        expect(granularityNoun("week")).toBe("week");
        expect(granularityNoun("month")).toBe("month");
    });
});
