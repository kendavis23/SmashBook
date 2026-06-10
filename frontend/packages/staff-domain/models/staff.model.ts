export type UUID = string;

export type StaffRole = "trainer" | "ops_lead" | "admin" | "front_desk";

export interface StaffInviteInput {
    club_id: UUID;
    email: string;
    role: StaffRole;
}

export interface StaffInviteResult {
    invitation_id: UUID;
    club_id: UUID;
    email: string;
    role: StaffRole;
    status: string;
    attached_existing_user: boolean;
    message: string;
}

export interface StaffInvitation {
    invitation_id: UUID;
    club_id: UUID;
    email: string;
    role: StaffRole;
    status: string;
    invited_by_user_id: UUID;
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
}

export interface StaffMember {
    staff_id: UUID;
    user_id: UUID;
    full_name: string;
    email: string;
    role: StaffRole;
    bio: string | null;
    is_active: boolean;
}

export interface StaffUpdateInput {
    role?: StaffRole | null;
    bio?: string | null;
}
