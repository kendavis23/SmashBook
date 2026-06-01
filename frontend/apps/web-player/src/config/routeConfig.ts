import {
    BadgeCheck,
    Bell,
    CalendarCheck,
    CalendarDays,
    CreditCard,
    LayoutDashboard,
    LayoutGrid,
    Swords,
    UserCircle,
    Wallet,
} from "lucide-react";
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
        title: "Dashboard",
        subtitle: "Your club at a glance.",
        breadcrumb: ["Dashboard"],
        group: "Overview",
    },
    {
        key: "book-by-court",
        path: "/book-by-court",
        label: "Book by court",
        icon: LayoutGrid,
        title: "Book by court",
        subtitle: "Browse courts and join open games",
        breadcrumb: ["Bookings", "Book by court"],
        group: "Bookings",
    },
    {
        key: "book-by-timeslot",
        path: "/book-by-timeslot",
        label: "Book by timeslot",
        icon: CalendarDays,
        title: "Book by timeslot",
        subtitle: "Pick a time, then choose a court or join an open game",
        breadcrumb: ["Bookings", "Book by timeslot"],
        group: "Bookings",
    },
    {
        key: "bookings",
        path: "/bookings",
        label: "My Bookings",
        icon: CalendarCheck,
        title: "Bookings",
        breadcrumb: ["Bookings", "My Bookings"],
        group: "Bookings",
    },
    {
        key: "my-games",
        path: "/my-games",
        label: "My Games",
        icon: Swords,
        title: "My Games",
        breadcrumb: ["Bookings", "My Games"],
        group: "Bookings",
    },
    {
        key: "account",
        label: "Account",
        icon: UserCircle,
        group: "Manage",
        children: [
            {
                key: "profile",
                path: "/profile",
                label: "Profile",
                title: "Profile",
                breadcrumb: ["Account", "Profile"],
            },
            {
                key: "notifications",
                path: "/profile/notifications",
                label: "Notifications",
                icon: Bell,
                title: "Notifications",
                breadcrumb: ["Account", "Notifications"],
            },
        ],
    },
    {
        key: "payments",
        label: "Payments",
        icon: CreditCard,
        group: "Manage",
        children: [
            {
                key: "payment-cards",
                path: "/profile/payments/cards",
                label: "Cards",
                title: "Payment Cards",
                breadcrumb: ["Payments", "Cards"],
            },
            {
                key: "payment-wallet",
                path: "/profile/payments/wallet",
                label: "Wallet",
                icon: Wallet,
                title: "Wallet",
                breadcrumb: ["Payments", "Wallet"],
            },
        ],
    },
    {
        key: "memberships",
        label: "Memberships",
        icon: BadgeCheck,
        group: "Manage",
        children: [
            {
                key: "my-membership",
                path: "/profile/memberships/current",
                label: "My Membership",
                title: "My Membership",
                breadcrumb: ["Memberships", "My Membership"],
            },
            {
                key: "membership-plans",
                path: "/profile/memberships/plans",
                label: "Plans",
                title: "Membership Plans",
                breadcrumb: ["Memberships", "Plans"],
            },
        ],
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
 * Sorts by path length descending so more-specific paths win over shorter prefixes
 * (e.g. /profile/notifications wins over /profile).
 */
export function getRouteByPath(pathname: string): RouteConfig | undefined {
    return [...getNavigableRoutes()]
        .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))
        .find((route) => route.path !== undefined && pathname.includes(route.path));
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
