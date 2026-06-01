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
        expect(keys).toContain("bookings");
        expect(keys).toContain("my-games");
        expect(keys).toContain("account");
        expect(keys).toContain("payments");
        expect(keys).toContain("memberships");
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
        expect(grouped["Bookings"]).toEqual([
            "book-by-court",
            "book-by-timeslot",
            "bookings",
            "my-games",
        ]);
        expect(grouped["Manage"]).toEqual(["account", "payments", "memberships"]);
    });

    it("account group has the correct children", () => {
        const account = ROUTES.find((r) => r.key === "account");
        const childKeys = account?.children?.map((c) => c.key) ?? [];
        expect(childKeys).toEqual(["profile", "notifications"]);
    });

    it("payments group has the correct children", () => {
        const payments = ROUTES.find((r) => r.key === "payments");
        const childKeys = payments?.children?.map((c) => c.key) ?? [];
        expect(childKeys).toEqual(["payment-cards", "payment-wallet"]);
    });

    it("memberships group has the correct children", () => {
        const memberships = ROUTES.find((r) => r.key === "memberships");
        const childKeys = memberships?.children?.map((c) => c.key) ?? [];
        expect(childKeys).toEqual(["my-membership", "membership-plans"]);
    });

    it("each route with a path has a title and breadcrumb", () => {
        const flat = (routes: typeof ROUTES): typeof ROUTES =>
            routes.flatMap((r) => (r.children ? [...flat(r.children)] : [r]));

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

    it("returns the my-games route for /my-games", () => {
        const result = getRouteByPath("/my-games");
        expect(result?.key).toBe("my-games");
    });

    it("matches nested paths using substring logic", () => {
        const result = getRouteByPath("/bookings/history");
        expect(result?.key).toBe("bookings");
    });

    it("returns the profile route for /profile", () => {
        const result = getRouteByPath("/profile");
        expect(result?.key).toBe("profile");
    });

    it("returns the notifications route for /profile/notifications", () => {
        const result = getRouteByPath("/profile/notifications");
        expect(result?.key).toBe("notifications");
    });

    it("returns the payment-cards route for /profile/payments/cards", () => {
        const result = getRouteByPath("/profile/payments/cards");
        expect(result?.key).toBe("payment-cards");
    });

    it("returns the my-membership route for /profile/memberships/current", () => {
        const result = getRouteByPath("/profile/memberships/current");
        expect(result?.key).toBe("my-membership");
    });

    it("returns undefined for an unknown path", () => {
        expect(getRouteByPath("/unknown-xyz")).toBeUndefined();
    });
});

describe("getNavigableRoutes", () => {
    it("returns only routes with paths", () => {
        expect(getNavigableRoutes().every((route) => route.path !== undefined)).toBe(true);
    });

    it("includes all leaf routes", () => {
        const keys = getNavigableRoutes().map((r) => r.key);
        expect(keys).toContain("dashboard");
        expect(keys).toContain("bookings");
        expect(keys).toContain("my-games");
        expect(keys).toContain("profile");
        expect(keys).toContain("notifications");
        expect(keys).toContain("payment-cards");
        expect(keys).toContain("payment-wallet");
        expect(keys).toContain("my-membership");
        expect(keys).toContain("membership-plans");
    });

    it("does not include parent nodes without a path", () => {
        const keys = getNavigableRoutes().map((r) => r.key);
        expect(keys).not.toContain("account");
        expect(keys).not.toContain("payments");
        expect(keys).not.toContain("memberships");
    });
});

describe("getSearchableRoutes", () => {
    it("returns all routes for a player", () => {
        const keys = getSearchableRoutes("player").map((route) => route.key);
        expect(keys).toContain("dashboard");
        expect(keys).toContain("bookings");
        expect(keys).toContain("my-games");
        expect(keys).toContain("profile");
        expect(keys).toContain("notifications");
    });

    it("returns all unrestricted routes when the user role is missing", () => {
        const keys = getSearchableRoutes(undefined).map((route) => route.key);
        expect(keys).toContain("dashboard");
        expect(keys).toContain("profile");
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
