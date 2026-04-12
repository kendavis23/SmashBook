import { fetcher } from "../../../core/fetcher";
import type {
    MembershipPlanCreate,
    MembershipPlanUpdate,
    MembershipPlanResponse,
} from "./membership.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function createMembershipPlanEndpoint(
    clubId: string,
    data: MembershipPlanCreate
): Promise<MembershipPlanResponse> {
    return fetcher<MembershipPlanResponse>(`/api/v1/clubs/${clubId}/membership-plans`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function listMembershipPlansEndpoint(clubId: string): Promise<MembershipPlanResponse[]> {
    return fetcher<MembershipPlanResponse[]>(`/api/v1/clubs/${clubId}/membership-plans`);
}

export function getMembershipPlanEndpoint(
    clubId: string,
    planId: string
): Promise<MembershipPlanResponse> {
    return fetcher<MembershipPlanResponse>(`/api/v1/clubs/${clubId}/membership-plans/${planId}`);
}

export function updateMembershipPlanEndpoint(
    clubId: string,
    planId: string,
    data: MembershipPlanUpdate
): Promise<MembershipPlanResponse> {
    return fetcher<MembershipPlanResponse>(`/api/v1/clubs/${clubId}/membership-plans/${planId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
