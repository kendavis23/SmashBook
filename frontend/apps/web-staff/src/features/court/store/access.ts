import type { TenantUserRole } from "@repo/auth";

const MANAGE_ROLES: TenantUserRole[] = ["owner", "admin"];

export function canManageCourts(role: TenantUserRole | null): boolean {
    return role !== null && MANAGE_ROLES.includes(role);
}
