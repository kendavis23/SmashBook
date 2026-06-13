import type { TenantUserRole } from "@repo/auth";

// Roles that can view Stripe payouts and reconciliation. Financial data is
// owner/admin only. To extend access, add the role to the array.
const VIEW_PAYOUTS_ROLES: TenantUserRole[] = ["owner", "admin"];

export function canViewPayouts(role: TenantUserRole | null): boolean {
    return role !== null && VIEW_PAYOUTS_ROLES.includes(role);
}
