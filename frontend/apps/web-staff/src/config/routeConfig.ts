import {
    BarChart2,
    Building2,
    Calendar,
    CalendarCheck,
    Circle,
    DollarSign,
    Headphones,
    LayoutDashboard,
    Package,
    User,
    Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UserRole =
    | "admin"
    | "owner"
    | "staff"
    | "employee"
    | "front_desk"
    | "trainer"
    | "ops_lead"
    | "viewer"
    | "player";

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
        title: "Dashboard",
        subtitle: "Your club at a glance.",
        breadcrumb: ["Dashboard"],
        group: "Overview",
    },
    {
        key: "clubs",
        path: "/clubs",
        label: "Clubs",
        icon: Building2,
        title: "Clubs",
        subtitle: "Manage your clubs and locations.",
        breadcrumb: ["Operations", "Clubs"],
        roles: ["admin", "owner", "front_desk"],
        group: "Operations",
    },
    {
        key: "courts",
        path: "/courts",
        label: "Courts",
        icon: Circle,
        title: "Courts",
        subtitle: "Configure and manage playing courts.",
        breadcrumb: ["Operations", "Courts"],
        group: "Operations",
    },
    {
        key: "bookings",
        path: "/bookings",
        label: "Bookings",
        icon: CalendarCheck,
        title: "Bookings",
        subtitle: "View and manage court reservations.",
        breadcrumb: ["Operations", "Bookings"],
        group: "Operations",
    },
    {
        key: "calendar",
        path: "/calendar",
        label: "Calendar",
        icon: Calendar,
        title: "Calendar",
        subtitle: "Visualise availability and schedules.",
        breadcrumb: ["Operations", "Calendar"],
        roles: ["owner", "admin"],
        group: "Operations",
    },
    {
        key: "staff",
        path: "/staff",
        label: "Staff",
        icon: Users,
        title: "Staff",
        subtitle: "Manage team members and their roles.",
        breadcrumb: ["People", "Staff"],
        roles: ["owner", "admin"],
        group: "People",
    },
    {
        key: "players",
        path: "/players",
        label: "Players",
        icon: User,
        title: "Players",
        subtitle: "View and manage registered players.",
        breadcrumb: ["People", "Players"],
        group: "People",
    },
    {
        key: "finance",
        path: "/finance",
        label: "Finance",
        icon: DollarSign,
        title: "Finance",
        subtitle: "Track revenue, payouts, and transactions.",
        breadcrumb: ["Finance & Reports", "Finance"],
        roles: ["owner", "admin"],
        group: "Finance & Reports",
    },
    {
        key: "reports",
        path: "/reports",
        label: "Reports",
        icon: BarChart2,
        title: "Reports",
        subtitle: "Analyse performance and club metrics.",
        breadcrumb: ["Finance & Reports", "Reports"],
        roles: ["owner", "admin"],
        group: "Finance & Reports",
    },
    {
        key: "support",
        path: "/support",
        label: "Support",
        icon: Headphones,
        title: "Support",
        subtitle: "Handle player queries and issues.",
        breadcrumb: ["Support", "Support"],
        group: "Support",
    },
    {
        key: "equipment",
        path: "/equipment",
        label: "Equipment",
        icon: Package,
        title: "Equipment",
        subtitle: "Track gear, inventory, and condition.",
        breadcrumb: ["Support", "Equipment"],
        group: "Support",
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
