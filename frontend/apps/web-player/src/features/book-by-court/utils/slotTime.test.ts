import { describe, expect, it } from "vitest";
import { formatSlotTime } from "./slotTime";

describe("dashboard formatSlotTime", () => {
    it.each([
        ["00:00", "12:00 AM"],
        ["09:05", "9:05 AM"],
        ["12:30", "12:30 PM"],
        ["15:45", "3:45 PM"],
        ["23:59", "11:59 PM"],
    ])("formats %s as %s", (input, expected) => {
        expect(formatSlotTime(input)).toBe(expected);
    });

    it("defaults missing minutes to 00", () => {
        expect(formatSlotTime("7")).toBe("7:00 AM");
    });
});
