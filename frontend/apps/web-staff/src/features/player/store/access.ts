import type { TenantUserRole } from "@repo/auth";

const REGISTER_ROLES: TenantUserRole[] = ["owner", "admin", "ops_lead", "staff", "front_desk"];

export function canRegisterPlayer(role: TenantUserRole | null): boolean {
    return role !== null && REGISTER_ROLES.includes(role);
}
