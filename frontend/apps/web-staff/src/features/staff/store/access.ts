import type { TenantUserRole } from "@repo/auth";

const VIEW_ROLES: TenantUserRole[] = ["owner", "admin", "ops_lead"];
const MANAGE_ROLES: TenantUserRole[] = ["owner", "admin"];

export function canViewStaff(role: TenantUserRole | null): boolean {
    return role !== null && VIEW_ROLES.includes(role);
}

export function canManageStaff(role: TenantUserRole | null): boolean {
    return role !== null && MANAGE_ROLES.includes(role);
}
