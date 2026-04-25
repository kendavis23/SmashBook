import type { TenantUserRole } from "@repo/auth";

const MANAGE_ROLES: TenantUserRole[] = ["owner", "admin"];
const VIEW_ROLES: TenantUserRole[] = ["owner", "admin", "ops_lead", "staff", "front_desk"];

export function canManageTrainers(role: TenantUserRole | null): boolean {
    return role !== null && MANAGE_ROLES.includes(role);
}

export function canViewTrainers(role: TenantUserRole | null): boolean {
    return role !== null && VIEW_ROLES.includes(role);
}
