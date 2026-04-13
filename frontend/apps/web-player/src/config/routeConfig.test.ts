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
        expect(keys).toContain("courts");
        expect(keys).toContain("bookings");
        expect(keys).toContain("players");
        expect(keys).toContain("equipment");
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
        expect(grouped["Operations"]).toEqual(["courts", "bookings"]);
        expect(grouped["People"]).toEqual(["players"]);
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

    it("returns the equipment route for /equipment", () => {
        const result = getRouteByPath("/equipment");
        expect(result?.key).toBe("equipment");
    });

    it("returns the support route for /support", () => {
        const result = getRouteByPath("/support");
        expect(result?.key).toBe("support");
    });

    it("matches nested paths using substring logic", () => {
        const result = getRouteByPath("/bookings/history");
        expect(result?.key).toBe("bookings");
    });

    it("returns undefined for an unknown path", () => {
        expect(getRouteByPath("/unknown-xyz")).toBeUndefined();
    });
});

describe("getNavigableRoutes", () => {
    it("returns only routes with paths", () => {
        expect(getNavigableRoutes().every((route) => route.path !== undefined)).toBe(true);
    });

    it("returns the same top-level route keys because there are no nested routes", () => {
        const keys = getNavigableRoutes().map((route) => route.key);
        expect(keys).toEqual(ROUTES.map((route) => route.key));
    });
});

describe("getSearchableRoutes", () => {
    it("returns all routes for a player", () => {
        const keys = getSearchableRoutes("player").map((route) => route.key);
        expect(keys).toContain("dashboard");
        expect(keys).toContain("courts");
        expect(keys).toContain("bookings");
        expect(keys).toContain("players");
        expect(keys).toContain("support");
        expect(keys).toContain("equipment");
    });

    it("returns all unrestricted routes when the user role is missing", () => {
        const keys = getSearchableRoutes(undefined).map((route) => route.key);
        expect(keys).toEqual(ROUTES.map((route) => route.key));
    });
});

describe("canAccess", () => {
    it("returns true when roles is undefined (unrestricted)", () => {
        expect(canAccess(undefined, "player")).toBe(true);
        expect(canAccess(undefined, undefined)).toBe(true);
    });

    it("returns false when roles is set and userRole is undefined", () => {
        expect(canAccess(["player"], undefined)).toBe(false);
    });

    it("returns true when userRole is in the roles list", () => {
        expect(canAccess(["player"], "player")).toBe(true);
    });

    it("returns false when userRole is NOT in the roles list", () => {
        expect(canAccess(["player"], "staff")).toBe(false);
        expect(canAccess(["player"], "owner")).toBe(false);
    });

    it("all current routes are unrestricted", () => {
        ROUTES.forEach((route) => {
            expect(route.roles, `${route.key} should be unrestricted`).toBeUndefined();
        });
    });
});
