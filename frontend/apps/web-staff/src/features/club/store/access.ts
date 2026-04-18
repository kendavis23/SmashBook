import type { TenantUserRole } from "@repo/auth";

// Roles that can manage club settings, hours, pricing, and staff.
// To extend access, add the role to the relevant array.
const MANAGE_ROLES: TenantUserRole[] = ["owner", "admin"];

// Roles that can create a new club. Only owners may create clubs.
const CREATE_CLUB_ROLES: TenantUserRole[] = ["owner", "admin"];

// canViewClubList: roles that can view the club list. Owners and admins can view the club list, but staff cannot.
const VIEW_CLUB_LIST_ROLES: TenantUserRole[] = ["owner", "admin"];

export function canManageClub(role: TenantUserRole | null): boolean {
    return role !== null && MANAGE_ROLES.includes(role);
}

export function canCreateClub(role: TenantUserRole | null): boolean {
    return role !== null && CREATE_CLUB_ROLES.includes(role);
}

export function canViewClubList(role: TenantUserRole | null): boolean {
    return role !== null && VIEW_CLUB_LIST_ROLES.includes(role);
}
