import { describe, expect, it } from "vitest";
import { canViewOpenMatches } from "./access";

describe("canViewOpenMatches", () => {
    it("returns true for permitted staff roles", () => {
        expect(canViewOpenMatches("owner")).toBe(true);
        expect(canViewOpenMatches("admin")).toBe(true);
        expect(canViewOpenMatches("ops_lead")).toBe(true);
        expect(canViewOpenMatches("staff")).toBe(true);
        expect(canViewOpenMatches("front_desk")).toBe(true);
        expect(canViewOpenMatches("viewer")).toBe(true);
    });

    it("returns false for null", () => {
        expect(canViewOpenMatches(null)).toBe(false);
    });
});
