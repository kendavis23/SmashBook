import { describe, expect, it } from "vitest";
import { BOOKING_TABS, BOOKING_TYPE_OPTIONS } from "./index";

describe("booking types constants", () => {
    it("exposes the booking tabs used by booking list views", () => {
        expect(BOOKING_TABS).toEqual([
            { id: "upcoming", label: "Upcoming" },
            { id: "past", label: "Past" },
        ]);
    });

    it("includes the supported booking type filters", () => {
        expect(BOOKING_TYPE_OPTIONS).toEqual(
            expect.arrayContaining([
                { value: "", label: "All types" },
                { value: "regular", label: "Regular" },
                { value: "lesson_individual", label: "Individual Lesson" },
                { value: "lesson_group", label: "Group Lesson" },
                { value: "corporate_event", label: "Corporate Event" },
                { value: "tournament", label: "Tournament" },
            ])
        );
    });
});
