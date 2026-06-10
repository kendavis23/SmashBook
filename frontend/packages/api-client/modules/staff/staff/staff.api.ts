import { fetcher } from "../../../core/fetcher";
import type {
    StaffInviteRequest,
    StaffInviteResponse,
    InvitationListItem,
    StaffListItem,
    StaffUpdateRequest,
} from "./staff.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function createStaffInvitationEndpoint(
    data: StaffInviteRequest
): Promise<StaffInviteResponse> {
    return fetcher<StaffInviteResponse>("/api/v1/staff/invitations", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function listStaffInvitationsEndpoint(clubId: string): Promise<InvitationListItem[]> {
    return fetcher<InvitationListItem[]>(`/api/v1/staff/invitations?club_id=${clubId}`);
}

export function deleteStaffInvitationEndpoint(invitationId: string, clubId: string): Promise<void> {
    return fetcher<void>(`/api/v1/staff/invitations/${invitationId}?club_id=${clubId}`, {
        method: "DELETE",
    });
}

export function listStaffEndpoint(clubId: string): Promise<StaffListItem[]> {
    return fetcher<StaffListItem[]>(`/api/v1/staff?club_id=${clubId}`);
}

export function updateStaffEndpoint(
    staffId: string,
    clubId: string,
    data: StaffUpdateRequest
): Promise<StaffListItem> {
    return fetcher<StaffListItem>(`/api/v1/staff/${staffId}?club_id=${clubId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function deleteStaffEndpoint(staffId: string, clubId: string): Promise<void> {
    return fetcher<void>(`/api/v1/staff/${staffId}?club_id=${clubId}`, {
        method: "DELETE",
    });
}
