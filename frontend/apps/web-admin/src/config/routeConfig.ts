import { BookOpen, Building2, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UserRole = "player";

export interface RouteConfig {
    key: string;
    path?: string;
    label: string;
    icon?: LucideIcon;
    title?: string;
    subtitle?: string;
    breadcrumb?: string[];
    roles?: UserRole[];
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

export const ROUTES: RouteConfig[] = [
    {
        key: "plans",
        path: "/plans",
        label: "Plans",
        icon: BookOpen,
        title: "Subscription Plans",
        subtitle: "Manage platform subscription plans",
        breadcrumb: ["Plans"],
        group: "Admin",
    },
    {
        key: "onboard",
        path: "/onboard",
        label: "Onboard",
        icon: UserPlus,
        title: "Onboard",
        subtitle: "Create a tenant, club, courts, and owner account",
        breadcrumb: ["Onboard"],
        group: "Admin",
    },
    {
        key: "tenants",
        path: "/tenants",
        label: "Tenants",
        icon: Building2,
        title: "Tenants",
        subtitle: "Manage platform tenants and subscriptions",
        breadcrumb: ["Tenants"],
        group: "Admin",
    },
];

export function getNavigableRoutes(): RouteConfig[] {
    return flattenNavigableRoutes(ROUTES);
}

export function getSearchableRoutes(userRole: string | undefined): RouteConfig[] {
    return getNavigableRoutes().filter((route) => canAccess(route.roles, userRole));
}

export function getRouteByPath(pathname: string): RouteConfig | undefined {
    return getNavigableRoutes().find(
        (route) => route.path !== undefined && pathname.includes(route.path)
    );
}

export function canAccess(roles: UserRole[] | undefined, userRole: string | undefined): boolean {
    if (!roles) return true;
    if (!userRole) return false;
    return roles.includes(userRole as UserRole);
}
