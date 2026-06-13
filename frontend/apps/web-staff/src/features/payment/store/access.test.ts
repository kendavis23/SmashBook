import { describe, expect, it } from "vitest";
import { canViewPayouts } from "./access";

describe("canViewPayouts", () => {
    it("allows owner and admin", () => {
        expect(canViewPayouts("owner")).toBe(true);
        expect(canViewPayouts("admin")).toBe(true);
    });

    it("denies other roles and null", () => {
        expect(canViewPayouts("staff")).toBe(false);
        expect(canViewPayouts("viewer")).toBe(false);
        expect(canViewPayouts(null)).toBe(false);
    });
});
