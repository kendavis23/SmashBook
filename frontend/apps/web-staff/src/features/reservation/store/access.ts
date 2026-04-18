import type { TenantUserRole } from "@repo/auth";

const MANAGE_RESERVATION_ROLES: TenantUserRole[] = [
    "owner",
    "admin",
    "ops_lead",
    "staff",
    "front_desk",
];

export function canManageReservation(role: TenantUserRole | null): boolean {
    return role !== null && MANAGE_RESERVATION_ROLES.includes(role);
}
