import { describe, expect, it } from "vitest";
import { buildDefaultRows } from "./ClubDetailHoursSection";
import type { OperatingHours } from "../../types";

describe("buildDefaultRows", () => {
    it("returns 7 rows", () => {
        expect(buildDefaultRows([])).toHaveLength(7);
    });

    it("marks all days as closed when no existing hours", () => {
        const rows = buildDefaultRows([]);
        expect(rows.every((r) => !r.isOpen)).toBe(true);
    });

    it("marks matching day as open", () => {
        const hours: OperatingHours[] = [
            { day_of_week: 1, open_time: "09:00", close_time: "21:00" },
        ];
        const rows = buildDefaultRows(hours);
        expect(rows[1]!.isOpen).toBe(true);
        expect(rows[1]!.open_time).toBe("09:00");
        expect(rows[1]!.close_time).toBe("21:00");
    });

    it("uses default times for non-matching days", () => {
        const rows = buildDefaultRows([]);
        expect(rows[0]!.open_time).toBe("08:00");
        expect(rows[0]!.close_time).toBe("22:00");
    });

    it("preserves day_of_week index for each row", () => {
        const rows = buildDefaultRows([]);
        rows.forEach((row, i) => {
            expect(row.day_of_week).toBe(i);
        });
    });
});
