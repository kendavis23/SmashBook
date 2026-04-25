import type { TenantUserRole } from "@repo/auth";

const VIEW_OPEN_MATCH_ROLES: TenantUserRole[] = [
    "owner",
    "admin",
    "ops_lead",
    "staff",
    "front_desk",
    "viewer",
];

export function canViewOpenMatches(role: TenantUserRole | null): boolean {
    return role !== null && VIEW_OPEN_MATCH_ROLES.includes(role);
}
