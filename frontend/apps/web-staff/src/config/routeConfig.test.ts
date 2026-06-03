import { describe, expect, it } from "vitest";

import {
    canAccess,
    getNavigableRoutes,
    getRouteByPath,
    getSearchableRoutes,
    ROUTES,
} from "./routeConfig";

describe("ROUTES", () => {
    it("contains the expected top-level section keys", () => {
        const keys = ROUTES.map((r) => r.key);
        expect(keys).toEqual(["dashboard", "operations", "analytics", "settings"]);
    });

    it("every top-level route has a group assigned", () => {
        ROUTES.forEach((r) => {
            expect(r.group, `${r.key} missing group`).toBeDefined();
        });
    });

    it("top-level sections map to the expected groups", () => {
        const grouped = ROUTES.reduce<Record<string, string[]>>((acc, r) => {
            const g = r.group ?? "ungrouped";
            if (!acc[g]) acc[g] = [];
            acc[g].push(r.key);
            return acc;
        }, {});

        expect(grouped["Overview"]).toEqual(["dashboard"]);
        expect(grouped["Operations"]).toEqual(["operations"]);
        expect(grouped["Analytics"]).toEqual(["analytics"]);
        expect(grouped["Settings"]).toEqual(["settings"]);
        expect(grouped["Finance & Reports"]).toBeUndefined();
    });

    it("Operations is a collapsible section grouped into Booking / People / Management", () => {
        const ops = ROUTES.find((r) => r.key === "operations");
        const childKeys = ops?.children?.map((c) => c.key) ?? [];
        expect(childKeys).toContain("calendar");
        expect(childKeys).toContain("bookings");
        expect(childKeys).toContain("open-match");
        expect(childKeys).toContain("reservations");
        expect(childKeys).toContain("players");
        expect(childKeys).toContain("staff");
        expect(childKeys).toContain("courts");
        // Support was removed from Operations.
        expect(childKeys).not.toContain("support");
        // Every Operations child belongs to one of the three subgroups.
        const subgroupOf = (key: string): string | undefined =>
            ops?.children?.find((c) => c.key === key)?.subgroup;
        expect(subgroupOf("calendar")).toBe("Booking");
        expect(subgroupOf("reservations")).toBe("Booking");
        expect(subgroupOf("players")).toBe("People");
        expect(subgroupOf("staff")).toBe("People");
        expect(subgroupOf("courts")).toBe("Management");
        expect(subgroupOf("equipment")).toBe("Management");
        expect(
            ops?.children?.every((c) =>
                ["Booking", "People", "Management"].includes(c.subgroup ?? "")
            )
        ).toBe(true);
    });

    it("Analytics groups its children under the expected subgroups", () => {
        const analytics = ROUTES.find((r) => r.key === "analytics");
        expect(analytics?.children?.map((c) => c.key)).toEqual([
            "club-utilisation",
            "court-utilisation",
            "club-utilisation-heatmap",
            "revenue-performance",
            "clubs-revenue",
            "player-value",
            "player-engagement",
            "player-segments",
            "player-activity",
        ]);
        expect(analytics?.children?.map((c) => [c.key, c.subgroup])).toEqual([
            ["club-utilisation", "Utilisation"],
            ["court-utilisation", "Utilisation"],
            ["club-utilisation-heatmap", "Utilisation"],
            ["revenue-performance", "Revenue"],
            ["clubs-revenue", "Revenue"],
            ["player-value", "Players"],
            ["player-engagement", "Players"],
            ["player-segments", "Players"],
            ["player-activity", "Players"],
        ]);
    });

    it("Settings holds the billing/subscription items", () => {
        const settings = ROUTES.find((r) => r.key === "settings");
        expect(settings?.children?.map((c) => c.key)).toEqual([
            "subscription",
            "invoices",
            "cards",
        ]);
    });

    it("no longer exposes the removed Finance & Reports routes", () => {
        const allKeys = getNavigableRoutes().map((r) => r.key);
        expect(allKeys).not.toContain("finance");
        expect(allKeys).not.toContain("reports");
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

    it("resolves a nested child route by path", () => {
        const result = getRouteByPath("/analytics/court-utilisation");
        expect(result?.key).toBe("court-utilisation");
    });

    it("returns undefined for an unknown path", () => {
        expect(getRouteByPath("/unknown-xyz")).toBeUndefined();
    });
});

describe("getNavigableRoutes", () => {
    it("returns only routes with paths", () => {
        expect(getNavigableRoutes().every((route) => route.path !== undefined)).toBe(true);
    });

    it("flattens nested section children", () => {
        const keys = getNavigableRoutes().map((route) => route.key);
        expect(keys).toContain("dashboard");
        expect(keys).toContain("calendar");
        expect(keys).toContain("club-utilisation");
        expect(keys).toContain("subscription");
    });
});

describe("getSearchableRoutes", () => {
    it("filters out restricted routes for staff", () => {
        const keys = getSearchableRoutes("staff").map((route) => route.key);
        expect(keys).toContain("dashboard");
        expect(keys).toContain("bookings");
        // Analytics + Settings sections are owner/admin only.
        expect(keys).not.toContain("club-utilisation");
        expect(keys).not.toContain("subscription");
    });

    it("includes authorized routes for admin", () => {
        const keys = getSearchableRoutes("admin").map((route) => route.key);
        expect(keys).toContain("calendar");
        expect(keys).toContain("staff");
        expect(keys).toContain("club-utilisation");
        // Billing settings remain owner-only.
        expect(keys).not.toContain("subscription");
    });

    it("returns only unrestricted routes when the user role is missing", () => {
        const keys = getSearchableRoutes(undefined).map((route) => route.key);
        expect(keys).toContain("dashboard");
        expect(keys).not.toContain("bookings");
        expect(keys).not.toContain("club-utilisation");
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

    it("restricted sections have the expected roles", () => {
        const analytics = ROUTES.find((r) => r.key === "analytics");
        const settings = ROUTES.find((r) => r.key === "settings");
        expect(analytics?.roles).toEqual(["owner", "admin"]);
        expect(settings?.roles).toEqual(["owner"]);
    });

    it("Overview dashboard is unrestricted", () => {
        const route = ROUTES.find((r) => r.key === "dashboard");
        expect(route?.roles).toBeUndefined();
    });
});
