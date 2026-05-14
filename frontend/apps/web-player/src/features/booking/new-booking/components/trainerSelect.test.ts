import { describe, expect, it } from "vitest";
import { buildTrainerOptions, getTrainerStaffProfileId } from "./trainerSelect";

describe("trainerSelect", () => {
    it("prefers staff_profile_id over id", () => {
        expect(
            getTrainerStaffProfileId({
                staff_profile_id: "staff-1",
                id: "trainer-1",
                full_name: "Alex Trainer",
            })
        ).toBe("staff-1");
    });

    it("falls back to id and then an empty string", () => {
        expect(getTrainerStaffProfileId({ id: "trainer-1", full_name: "Alex Trainer" })).toBe(
            "trainer-1"
        );
        expect(getTrainerStaffProfileId({ full_name: "No Id" })).toBe("");
    });

    it("builds select options and drops trainers without usable ids", () => {
        expect(
            buildTrainerOptions([
                { staff_profile_id: "staff-1", full_name: "Alex Trainer" },
                { id: "trainer-2", full_name: "Blair Coach" },
                { staff_profile_id: null, id: null, full_name: "Missing Id" },
            ])
        ).toEqual([
            { value: "staff-1", label: "Alex Trainer" },
            { value: "trainer-2", label: "Blair Coach" },
        ]);
    });
});
