import type { TenantUserRole } from "@repo/auth";

const MANAGE_ROLES: TenantUserRole[] = ["owner", "admin", "ops_lead", "staff", "front_desk"];

export function canManageEquipment(role: TenantUserRole | null): boolean {
    return role !== null && MANAGE_ROLES.includes(role);
}
