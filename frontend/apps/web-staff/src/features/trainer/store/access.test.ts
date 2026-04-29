import { describe, expect, it } from "vitest";
import { canManageTrainers, canViewTrainers } from "./access";

describe("canManageTrainers", () => {
    it("returns true for owner", () => {
        expect(canManageTrainers("owner")).toBe(true);
    });

    it("returns true for admin", () => {
        expect(canManageTrainers("admin")).toBe(true);
    });

    it("returns true for ops_lead", () => {
        expect(canManageTrainers("ops_lead")).toBe(true);
    });

    it("returns false for staff", () => {
        expect(canManageTrainers("staff")).toBe(false);
    });

    it("returns false for front_desk", () => {
        expect(canManageTrainers("front_desk")).toBe(false);
    });

    it("returns false for viewer", () => {
        expect(canManageTrainers("viewer")).toBe(false);
    });

    it("returns false for null", () => {
        expect(canManageTrainers(null)).toBe(false);
    });
});

describe("canViewTrainers", () => {
    it("returns true for owner", () => {
        expect(canViewTrainers("owner")).toBe(true);
    });

    it("returns true for admin", () => {
        expect(canViewTrainers("admin")).toBe(true);
    });

    it("returns true for ops_lead", () => {
        expect(canViewTrainers("ops_lead")).toBe(true);
    });

    it("returns false for staff", () => {
        expect(canViewTrainers("staff")).toBe(false);
    });

    it("returns false for front_desk", () => {
        expect(canViewTrainers("front_desk")).toBe(false);
    });

    it("returns false for viewer", () => {
        expect(canViewTrainers("viewer")).toBe(false);
    });

    it("returns false for null", () => {
        expect(canViewTrainers(null)).toBe(false);
    });
});
