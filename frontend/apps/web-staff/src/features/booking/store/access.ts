import type { TenantUserRole } from "@repo/auth";

const MANAGE_BOOKING_ROLES: TenantUserRole[] = [
    "owner",
    "admin",
    "ops_lead",
    "staff",
    "front_desk",
];

export function canManageBooking(role: TenantUserRole | null): boolean {
    return role !== null && MANAGE_BOOKING_ROLES.includes(role);
}
