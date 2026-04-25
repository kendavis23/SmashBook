import { describe, expect, it } from "vitest";
import {
    TRAINER_TABS,
    DAY_LABELS,
    DAY_OPTIONS,
    BOOKING_TYPE_LABELS,
    BOOKING_STATUS_LABELS,
    createDefaultAvailabilityForm,
} from "./index";

describe("TRAINER_TABS", () => {
    it("has two tabs: availability and bookings", () => {
        expect(TRAINER_TABS).toHaveLength(2);
        expect(TRAINER_TABS[0]?.id).toBe("availability");
        expect(TRAINER_TABS[1]?.id).toBe("bookings");
    });

    it("has correct labels", () => {
        expect(TRAINER_TABS[0]?.label).toBe("Availability");
        expect(TRAINER_TABS[1]?.label).toBe("Bookings");
    });
});

describe("DAY_LABELS", () => {
    it("maps 0–6 to Monday–Sunday", () => {
        expect(DAY_LABELS[0]).toBe("Monday");
        expect(DAY_LABELS[1]).toBe("Tuesday");
        expect(DAY_LABELS[2]).toBe("Wednesday");
        expect(DAY_LABELS[3]).toBe("Thursday");
        expect(DAY_LABELS[4]).toBe("Friday");
        expect(DAY_LABELS[5]).toBe("Saturday");
        expect(DAY_LABELS[6]).toBe("Sunday");
    });
});

describe("DAY_OPTIONS", () => {
    it("has 7 day options", () => {
        expect(DAY_OPTIONS).toHaveLength(7);
    });

    it("uses string values for day indices", () => {
        expect(DAY_OPTIONS[0]?.value).toBe("0");
        expect(DAY_OPTIONS[6]?.value).toBe("6");
    });

    it("has correct labels", () => {
        expect(DAY_OPTIONS[0]?.label).toBe("Monday");
        expect(DAY_OPTIONS[6]?.label).toBe("Sunday");
    });
});

describe("BOOKING_TYPE_LABELS", () => {
    it("maps known booking types", () => {
        expect(BOOKING_TYPE_LABELS["regular"]).toBe("Regular");
        expect(BOOKING_TYPE_LABELS["lesson_individual"]).toBe("Individual Lesson");
        expect(BOOKING_TYPE_LABELS["lesson_group"]).toBe("Group Lesson");
        expect(BOOKING_TYPE_LABELS["corporate_event"]).toBe("Corporate Event");
        expect(BOOKING_TYPE_LABELS["tournament"]).toBe("Tournament");
    });
});

describe("BOOKING_STATUS_LABELS", () => {
    it("maps known booking statuses", () => {
        expect(BOOKING_STATUS_LABELS["pending"]).toBe("Pending");
        expect(BOOKING_STATUS_LABELS["confirmed"]).toBe("Confirmed");
        expect(BOOKING_STATUS_LABELS["cancelled"]).toBe("Cancelled");
        expect(BOOKING_STATUS_LABELS["completed"]).toBe("Completed");
    });
});

describe("createDefaultAvailabilityForm", () => {
    it("returns the correct default shape", () => {
        const form = createDefaultAvailabilityForm();
        expect(form.day_of_week).toBe("0");
        expect(form.start_time).toBe("");
        expect(form.end_time).toBe("");
        expect(form.effective_until).toBe("");
        expect(form.notes).toBe("");
    });

    it("sets effective_from to today in YYYY-MM-DD format", () => {
        const form = createDefaultAvailabilityForm();
        expect(form.effective_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns a new object on each call", () => {
        const a = createDefaultAvailabilityForm();
        const b = createDefaultAvailabilityForm();
        expect(a).not.toBe(b);
    });
});
