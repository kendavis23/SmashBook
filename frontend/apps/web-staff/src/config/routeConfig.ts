import {
    Activity,
    BadgeCheck,
    BarChart2,
    BarChart3,
    BookMarked,
    Building2,
    Calendar,
    CalendarCheck,
    Circle,
    CreditCard,
    GraduationCap,
    LayoutDashboard,
    Map,
    Package,
    PieChart,
    Receipt,
    Settings,
    Swords,
    TrendingUp,
    User,
    UserPlus,
    Users,
    UserCheck,
    Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UserRole =
    | "owner"
    | "admin"
    | "ops_lead"
    | "staff"
    | "front_desk"
    | "trainer"
    | "viewer";

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
    /**
     * Optional sub-section label within a collapsible section (e.g. "Utilisation"
     * inside "Analytics"). Children sharing the same subgroup are rendered together
     * under a small sub-heading. Children with no subgroup render as a flat list.
     */
    subgroup?: string;
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
    /* ── Overview — flat leaf ─────────────────────────────────────────────── */
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

    /* ── Operations — collapsible, high-frequency flat list ───────────────── */
    {
        key: "operations",
        label: "Operations",
        icon: Wrench,
        group: "Operations",
        children: [
            {
                key: "calendar",
                path: "/calendar",
                label: "Calendar",
                icon: Calendar,
                title: "Calendar",
                subtitle: "Visualise availability and schedules.",
                breadcrumb: ["Operations", "Calendar"],
                roles: ["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"],
                subgroup: "Booking",
            },
            {
                key: "bookings",
                path: "/bookings",
                label: "Bookings",
                icon: CalendarCheck,
                title: "Bookings",
                subtitle: "View and manage court reservations.",
                breadcrumb: ["Operations", "Bookings"],
                roles: ["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"],
                subgroup: "Booking",
            },
            {
                key: "open-match",
                path: "/open-match",
                label: "Open Match",
                icon: Swords,
                title: "Open Match",
                subtitle: "Browse and manage open match sessions.",
                breadcrumb: ["Operations", "Open Match"],
                roles: ["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"],
                subgroup: "Booking",
            },
            {
                key: "reservations",
                path: "/reservations",
                label: "Reservations",
                icon: BookMarked,
                title: "Reservations",
                subtitle: "Manage calendar blocks and court reservations.",
                breadcrumb: ["Operations", "Reservations"],
                roles: ["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"],
                subgroup: "Booking",
            },
            {
                key: "players",
                path: "/players",
                label: "Players",
                icon: User,
                title: "Players",
                subtitle: "View and manage registered players.",
                breadcrumb: ["Operations", "Players"],
                roles: ["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"],
                subgroup: "People",
            },
            {
                key: "register-player",
                path: "/players/new",
                label: "Register Player",
                icon: UserPlus,
                title: "Register Player",
                subtitle: "Invite a new player to join your club.",
                breadcrumb: ["Operations", "Players", "Register Player"],
                roles: ["owner", "admin", "ops_lead", "staff", "front_desk"],
                subgroup: "People",
            },
            {
                key: "trainers",
                path: "/trainers",
                label: "Trainers",
                icon: GraduationCap,
                title: "Trainers",
                subtitle: "View trainer profiles, availability, and bookings.",
                breadcrumb: ["Operations", "Trainers"],
                roles: ["owner", "admin", "ops_lead", "viewer", "trainer"],
                subgroup: "People",
            },
            {
                key: "staff",
                path: "/staff",
                label: "Staff",
                icon: Users,
                title: "Staff",
                subtitle: "Manage team members and their roles.",
                breadcrumb: ["Operations", "Staff"],
                roles: ["owner", "admin"],
                subgroup: "People",
            },
            {
                key: "staff-invitations",
                path: "/staff/invitations",
                label: "Staff Invitations",
                icon: UserPlus,
                title: "Staff Invitations",
                subtitle: "Review invitations and register staff for your active club.",
                breadcrumb: ["Operations", "Staff", "Staff Invitations"],
                roles: ["owner", "admin"],
                subgroup: "People",
            },
            {
                key: "clubs",
                path: "/clubs",
                label: "Clubs",
                icon: Building2,
                title: "Clubs",
                subtitle: "Manage your clubs and locations.",
                breadcrumb: ["Operations", "Clubs"],
                roles: ["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"],
                subgroup: "Management",
            },
            {
                key: "courts",
                path: "/courts",
                label: "Courts",
                icon: Circle,
                title: "Courts",
                subtitle: "Configure and manage playing courts.",
                breadcrumb: ["Operations", "Courts"],
                roles: ["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"],
                subgroup: "Management",
            },
            {
                key: "membership-plans",
                path: "/membership-plans",
                label: "Memberships",
                icon: CreditCard,
                title: "Membership Plans",
                subtitle: "Define and manage recurring membership plans.",
                breadcrumb: ["Operations", "Memberships"],
                roles: ["owner", "admin"],
                subgroup: "Management",
            },
            {
                key: "equipment",
                path: "/equipment",
                label: "Equipment",
                icon: Package,
                title: "Equipment",
                subtitle: "Track gear, inventory, and condition.",
                breadcrumb: ["Operations", "Equipment"],
                roles: ["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"],
                subgroup: "Management",
            },
        ],
    },

    /* ── Analytics — collapsible, nested "Utilisation" sub-group ──────────── */
    {
        key: "analytics",
        label: "Analytics",
        icon: BarChart3,
        group: "Analytics",
        roles: ["owner", "admin"],
        children: [
            {
                key: "club-utilisation",
                path: "/analytics/club-utilisation",
                label: "Club Utilisation",
                icon: Activity,
                title: "Club Utilisation",
                subtitle: "Track overall club usage and occupancy rates.",
                breadcrumb: ["Analytics", "Utilisation", "Club Utilisation"],
                roles: ["owner", "admin"],
                subgroup: "Utilisation",
            },
            {
                key: "court-utilisation",
                path: "/analytics/court-utilisation",
                label: "Court Utilisation",
                icon: BarChart2,
                title: "Court Utilisation",
                subtitle: "Analyse individual court booking rates and performance.",
                breadcrumb: ["Analytics", "Utilisation", "Court Utilisation"],
                roles: ["owner", "admin"],
                subgroup: "Utilisation",
            },
            {
                key: "club-utilisation-heatmap",
                path: "/analytics/club-utilisation-heatmap",
                label: "Heatmap",
                icon: Map,
                title: "Heatmap",
                subtitle: "Visualise peak usage patterns across time and courts.",
                breadcrumb: ["Analytics", "Utilisation", "Heatmap"],
                roles: ["owner", "admin"],
                subgroup: "Utilisation",
            },
            {
                key: "revenue-performance",
                path: "/analytics/revenue-performance",
                label: "Summary",
                icon: TrendingUp,
                title: "Revenue Performance",
                subtitle: "Gross, net and refund breakdown across all revenue streams.",
                breadcrumb: ["Analytics", "Revenue", "Revenue Performance"],
                roles: ["owner", "admin"],
                subgroup: "Revenue",
            },
            {
                key: "clubs-revenue",
                path: "/analytics/clubs-revenue",
                label: "Clubs Comparison",
                icon: Building2,
                title: "Clubs Revenue Overview",
                subtitle: "Tenant-wide revenue comparison across all clubs.",
                breadcrumb: ["Analytics", "Revenue", "Clubs Comparison"],
                roles: ["owner", "admin"],
                subgroup: "Revenue",
            },
            {
                key: "player-value",
                path: "/analytics/player-value",
                label: "Value",
                icon: Users,
                title: "Player Value",
                subtitle: "Lifetime spend and booking history across your top players.",
                breadcrumb: ["Analytics", "Players", "Value"],
                roles: ["owner", "admin"],
                subgroup: "Players",
            },
            {
                key: "player-engagement",
                path: "/analytics/player-engagement",
                label: "Engagement",
                icon: UserCheck,
                title: "Player Engagement",
                subtitle: "Recent activity and at-risk members across your club.",
                breadcrumb: ["Analytics", "Players", "Engagement"],
                roles: ["owner", "admin"],
                subgroup: "Players",
            },
            {
                key: "player-segments",
                path: "/analytics/player-segments",
                label: "Segments",
                icon: PieChart,
                title: "Player Segments",
                subtitle: "Players, spend and bookings broken down by membership tier.",
                breadcrumb: ["Analytics", "Players", "Segments"],
                roles: ["owner", "admin"],
                subgroup: "Players",
            },
            {
                key: "player-activity",
                path: "/analytics/player-activity",
                label: "Activity & Growth",
                icon: Activity,
                title: "Player Activity & Growth",
                subtitle: "Active players and new signups over time.",
                breadcrumb: ["Analytics", "Players", "Activity & Growth"],
                roles: ["owner", "admin"],
                subgroup: "Players",
            },
            {
                key: "coach-popularity",
                path: "/analytics/coach-popularity",
                label: "Coach Popularity",
                icon: GraduationCap,
                title: "Coach Popularity",
                subtitle: "Sessions, player reach and repeat bookings across your coaches.",
                breadcrumb: ["Analytics", "Staff", "Coach Popularity"],
                roles: ["owner", "admin"],
                subgroup: "Staff",
            },
        ],
    },

    /* ── Settings — collapsible billing/subscription ──────────────────────── */
    {
        key: "settings",
        label: "Settings",
        icon: Settings,
        group: "Settings",
        roles: ["owner"],
        children: [
            {
                key: "subscription",
                path: "/subscription",
                label: "My Plan",
                icon: BadgeCheck,
                title: "My Plan",
                subtitle: "View your SmashBook subscription and usage.",
                breadcrumb: ["Settings", "My Plan"],
                roles: ["owner"],
            },
            {
                key: "invoices",
                path: "/invoices",
                label: "Invoices",
                icon: Receipt,
                title: "Invoices",
                subtitle: "View and download SmashBook billing invoices.",
                breadcrumb: ["Settings", "Invoices"],
                roles: ["owner"],
            },
            {
                key: "cards",
                path: "/subscription/payment",
                label: "Cards",
                icon: CreditCard,
                title: "Cards",
                subtitle: "Manage your billing card.",
                breadcrumb: ["Settings", "Cards"],
                roles: ["owner"],
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
 * Uses a substring match to mirror the original pageConfig.match behaviour.
 */
export function getRouteByPath(pathname: string): RouteConfig | undefined {
    // Sort by path length descending so more-specific paths (e.g. /subscription/payment)
    // win over shorter prefixes (e.g. /subscription).
    const routes = getNavigableRoutes()
        .filter((route) => route.path !== undefined && pathname.includes(route.path))
        .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0));
    return routes[0];
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
