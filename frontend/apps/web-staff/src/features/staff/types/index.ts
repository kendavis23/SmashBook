export type {
    StaffRole,
    StaffMember,
    StaffInvitation,
    StaffUpdateInput,
    StaffInviteInput,
    StaffInviteResult,
} from "@repo/staff-domain/models";

export type StaffEditDialogState = {
    staffId: string;
    currentRole: StaffRole;
    currentBio: string;
};

export type StaffFormState = {
    role: StaffRole;
    bio: string;
};

export type InviteStaffFormState = {
    email: string;
    role: StaffRole;
};

import type { StaffRole } from "@repo/staff-domain/models";

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
    trainer: "Trainer",
    ops_lead: "Operations Lead",
    admin: "Admin",
    front_desk: "Front Desk",
};

export const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
    { value: "trainer", label: STAFF_ROLE_LABELS.trainer },
    { value: "ops_lead", label: STAFF_ROLE_LABELS.ops_lead },
    { value: "admin", label: STAFF_ROLE_LABELS.admin },
    { value: "front_desk", label: STAFF_ROLE_LABELS.front_desk },
];
