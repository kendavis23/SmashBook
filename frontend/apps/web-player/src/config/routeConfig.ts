import { CalendarCheck, LayoutDashboard, Swords } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UserRole = "player";

export interface RouteConfig {
    key: string;
    /** undefined for parent nodes that have no URL of their own (e.g. Settings group) */
    path?: string;
    label: string;
    icon?: LucideIcon;
    /** Page header title shown in Navbar */
    title?: string;
    /** Page subtitle shown in Navbar */
    subtitle?: string;
    /** Breadcrumb trail shown in Navbar */
    breadcrumb?: string[];
    /**
     * Roles allowed to access this route.
     * undefined = any authenticated user.
     */
    roles?: UserRole[];
    /** Sidebar section group label (e.g. "Overview", "Operations"). Top-level routes only. */
    group?: string;
    children?: RouteConfig[];
}

function mergeRoles(
    inheritedRoles: UserRole[] | undefined,
    routeRoles: UserRole[] | undefined
): UserRole[] | undefined {
    if (!inheritedRoles) return routeRoles;
    if (!routeRoles) return inheritedRoles;
    return inheritedRoles.filter((role) => routeRoles.includes(role));
}

function flattenNavigableRoutes(routes: RouteConfig[], inheritedRoles?: UserRole[]): RouteConfig[] {
    return routes.flatMap((route) => {
        const effectiveRoles = mergeRoles(inheritedRoles, route.roles);
        const currentRoute = route.path ? [{ ...route, roles: effectiveRoles }] : [];
        const childRoutes = route.children
            ? flattenNavigableRoutes(route.children, effectiveRoles)
            : [];

        return [...currentRoute, ...childRoutes];
    });
}

/**
 * Single source of truth for navigation structure, page metadata, and role access.
 *
 * Rules:
 * - roles: undefined → any authenticated user may access
 * - roles: [...] → only users whose role appears in the array may access
 * - A parent node's roles gate the entire section (router + sidebar)
 */
export const ROUTES: RouteConfig[] = [
    {
        key: "dashboard",
        path: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        title: "Dashboard Overview",
        breadcrumb: ["Dashboard"],
        group: "Overview",
    },
    {
        key: "bookings",
        path: "/bookings",
        label: "Bookings",
        icon: CalendarCheck,
        title: "Bookings",
        breadcrumb: ["Operations", "Bookings"],
        group: "Operations",
    },
    {
        key: "my-games",
        path: "/my-games",
        label: "My Games",
        icon: Swords,
        title: "My Games",
        breadcrumb: ["Operations", "My Games"],
        group: "Operations",
    },
];

/** Flattened list of all navigable routes that have a path, including children. */
export function getNavigableRoutes(): RouteConfig[] {
    return flattenNavigableRoutes(ROUTES);
}

/** Searchable routes available to the current user role. */
export function getSearchableRoutes(userRole: string | undefined): RouteConfig[] {
    return getNavigableRoutes().filter((route) => canAccess(route.roles, userRole));
}

/**
 * Find the RouteConfig whose path matches the given pathname.
 * Uses a substring match to mirror the original pageConfig.match behaviour.
 */
export function getRouteByPath(pathname: string): RouteConfig | undefined {
    // Children first so more-specific paths (e.g. /settings/club) win over /settings
    return getNavigableRoutes().find(
        (route) => route.path !== undefined && pathname.includes(route.path)
    );
}

/**
 * Return true if a user with the given role may access a route.
 * @param roles - required roles from RouteConfig (undefined = unrestricted)
 * @param userRole - the current user's role string
 */
export function canAccess(roles: UserRole[] | undefined, userRole: string | undefined): boolean {
    if (!roles) return true;
    if (!userRole) return false;
    return roles.includes(userRole as UserRole);
}
