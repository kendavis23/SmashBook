import { describe, expect, it } from "vitest";

import {
    canAccess,
    getNavigableRoutes,
    getRouteByPath,
    getSearchableRoutes,
    ROUTES,
} from "./routeConfig";

describe("ROUTES", () => {
    it("contains all expected top-level route keys", () => {
        const keys = ROUTES.map((r) => r.key);
        expect(keys).toContain("dashboard");
        expect(keys).toContain("calendar");
        expect(keys).toContain("courts");
        expect(keys).toContain("bookings");
        expect(keys).toContain("players");
        expect(keys).toContain("staff");
        expect(keys).toContain("equipment");
        expect(keys).toContain("finance");
        expect(keys).toContain("reports");
        expect(keys).toContain("support");
    });

    it("every top-level route has a group assigned", () => {
        ROUTES.forEach((r) => {
            expect(r.group, `${r.key} missing group`).toBeDefined();
        });
    });

    it("routes are assigned to the correct groups", () => {
        const grouped = ROUTES.reduce<Record<string, string[]>>((acc, r) => {
            const g = r.group ?? "ungrouped";
            if (!acc[g]) acc[g] = [];
            acc[g].push(r.key);
            return acc;
        }, {});

        expect(grouped["Overview"]).toEqual(["dashboard"]);
        expect(grouped["Operations"]).toContain("courts");
        expect(grouped["Operations"]).toContain("bookings");
        expect(grouped["Operations"]).toContain("calendar");
        expect(grouped["People"]).toEqual(["staff", "players"]);
        expect(grouped["Finance & Reports"]).toEqual(["finance", "reports"]);
        expect(grouped["Support"]).toContain("support");
        expect(grouped["Support"]).toContain("equipment");
    });

    it("each route with a path has a title and breadcrumb", () => {
        const flat = (routes: typeof ROUTES): typeof ROUTES =>
            routes.flatMap((r) => (r.children ? [r, ...flat(r.children)] : [r]));

        flat(ROUTES)
            .filter((r) => r.path !== undefined)
            .forEach((r) => {
                expect(r.title, `${r.key} missing title`).toBeDefined();
                expect(r.breadcrumb, `${r.key} missing breadcrumb`).toBeDefined();
            });
    });
});

describe("getRouteByPath", () => {
    it("returns the dashboard route for /dashboard", () => {
        const result = getRouteByPath("/dashboard");
        expect(result?.key).toBe("dashboard");
    });

    it("returns the reports route for /reports", () => {
        const result = getRouteByPath("/reports");
        expect(result?.key).toBe("reports");
    });

    it("returns undefined for an unknown path", () => {
        expect(getRouteByPath("/unknown-xyz")).toBeUndefined();
    });
});

describe("getNavigableRoutes", () => {
    it("returns only routes with paths", () => {
        expect(getNavigableRoutes().every((route) => route.path !== undefined)).toBe(true);
    });

    it("includes all routes with paths", () => {
        const keys = getNavigableRoutes().map((route) => route.key);
        expect(keys).toContain("dashboard");
        expect(keys).toContain("finance");
        expect(keys).toContain("reports");
    });
});

describe("getSearchableRoutes", () => {
    it("filters out restricted routes for staff", () => {
        const keys = getSearchableRoutes("staff").map((route) => route.key);
        expect(keys).toContain("dashboard");
        expect(keys).not.toContain("finance");
        expect(keys).not.toContain("settings-club");
    });

    it("includes authorized routes for admin", () => {
        const keys = getSearchableRoutes("admin").map((route) => route.key);
        expect(keys).toContain("finance");
        expect(keys).toContain("reports");
        expect(keys).toContain("calendar");
        expect(keys).toContain("staff");
    });

    it("returns only unrestricted routes when the user role is missing", () => {
        const keys = getSearchableRoutes(undefined).map((route) => route.key);
        expect(keys).toContain("dashboard");
        expect(keys).toContain("support");
        expect(keys).not.toContain("calendar");
        expect(keys).not.toContain("settings-club");
    });
});

describe("canAccess", () => {
    it("returns true when roles is undefined (unrestricted)", () => {
        expect(canAccess(undefined, "staff")).toBe(true);
        expect(canAccess(undefined, undefined)).toBe(true);
    });

    it("returns false when roles is set and userRole is undefined", () => {
        expect(canAccess(["owner"], undefined)).toBe(false);
    });

    it("returns true when userRole is in the roles list", () => {
        expect(canAccess(["owner", "admin"], "owner")).toBe(true);
        expect(canAccess(["owner", "admin"], "admin")).toBe(true);
    });

    it("returns false when userRole is NOT in the roles list", () => {
        expect(canAccess(["owner"], "staff")).toBe(false);
        expect(canAccess(["owner"], "employee")).toBe(false);
        expect(canAccess(["owner", "admin"], "staff")).toBe(false);
    });

    it("restricted routes have the expected roles", () => {
        const calendarRoute = ROUTES.find((r) => r.key === "calendar");
        const staffRoute = ROUTES.find((r) => r.key === "staff");
        const financeRoute = ROUTES.find((r) => r.key === "finance");
        const reportsRoute = ROUTES.find((r) => r.key === "reports");
        expect(calendarRoute?.roles).toEqual(["owner", "admin"]);
        expect(staffRoute?.roles).toEqual(["owner", "admin"]);
        expect(financeRoute?.roles).toEqual(["owner", "admin"]);
        expect(reportsRoute?.roles).toEqual(["owner", "admin"]);
    });

    it("unrestricted routes have no roles defined", () => {
        const unrestricted = ["dashboard", "courts", "bookings", "players", "equipment", "support"];
        unrestricted.forEach((key) => {
            const route = ROUTES.find((r) => r.key === key);
            expect(route?.roles, `${key} should be unrestricted`).toBeUndefined();
        });
    });
});
