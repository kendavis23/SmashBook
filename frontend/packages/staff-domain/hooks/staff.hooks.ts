import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    createStaffInvitationEndpoint,
    listStaffInvitationsEndpoint,
    deleteStaffInvitationEndpoint,
    listStaffEndpoint,
    updateStaffEndpoint,
    deleteStaffEndpoint,
} from "@repo/api-client/modules/staff";
import type {
    StaffInviteInput,
    StaffInviteResult,
    StaffInvitation,
    StaffMember,
    StaffUpdateInput,
} from "../models";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const staffKeys = {
    members: (clubId: string) => ["staff", clubId] as const,
    invitations: (clubId: string) => ["staff-invitations", clubId] as const,
};

// ---------------------------------------------------------------------------
// useCreateStaffInvitation — POST /api/v1/staff/invitations
// ---------------------------------------------------------------------------

export function useCreateStaffInvitation(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<StaffInviteResult, Error, StaffInviteInput>({
        mutationFn: (data: StaffInviteInput) => createStaffInvitationEndpoint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: staffKeys.invitations(clubId) });
            queryClient.invalidateQueries({ queryKey: staffKeys.members(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useListStaffInvitations — GET /api/v1/staff/invitations?club_id=...
// ---------------------------------------------------------------------------

export function useListStaffInvitations(clubId: string) {
    return useQuery({
        queryKey: staffKeys.invitations(clubId),
        queryFn: (): Promise<StaffInvitation[]> => listStaffInvitationsEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useDeleteStaffInvitation — DELETE /api/v1/staff/invitations/:id
// ---------------------------------------------------------------------------

export function useDeleteStaffInvitation(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (invitationId: string) => deleteStaffInvitationEndpoint(invitationId, clubId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: staffKeys.invitations(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useListStaff — GET /api/v1/staff?club_id=...
// ---------------------------------------------------------------------------

export function useListStaff(clubId: string) {
    return useQuery({
        queryKey: staffKeys.members(clubId),
        queryFn: (): Promise<StaffMember[]> => listStaffEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useUpdateStaff — PATCH /api/v1/staff/:staffId
// ---------------------------------------------------------------------------

export function useUpdateStaff(clubId: string, staffId: string) {
    const queryClient = useQueryClient();
    return useMutation<StaffMember, Error, StaffUpdateInput>({
        mutationFn: (data: StaffUpdateInput) => updateStaffEndpoint(staffId, clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: staffKeys.members(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useDeleteStaff — DELETE /api/v1/staff/:staffId
// ---------------------------------------------------------------------------

export function useDeleteStaff(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (staffId: string) => deleteStaffEndpoint(staffId, clubId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: staffKeys.members(clubId) });
        },
    });
}
