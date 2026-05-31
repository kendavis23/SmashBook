import type { TenantUserRole } from "@repo/auth";

// To extend access to additional roles, add them to the relevant array.
const VIEW_ANALYTICS_ROLES: TenantUserRole[] = ["owner", "admin"];

export function canViewAnalytics(role: TenantUserRole | null): boolean {
    return role !== null && VIEW_ANALYTICS_ROLES.includes(role);
}
