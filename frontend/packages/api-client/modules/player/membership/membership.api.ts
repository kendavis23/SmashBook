import { fetcher } from "../../../core/fetcher";
import type {
    MembershipSubscribeRequest,
    MembershipSubscribeResponse,
    MembershipSubscriptionResponse,
} from "./membership.types";

export { listMembershipPlansEndpoint } from "../../share/membership/membership.api";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function getMyMembershipEndpoint(clubId: string): Promise<MembershipSubscriptionResponse> {
    return fetcher<MembershipSubscriptionResponse>(`/api/v1/clubs/${clubId}/memberships/me`);
}

export function subscribeToPlanEndpoint(
    clubId: string,
    data: MembershipSubscribeRequest
): Promise<MembershipSubscribeResponse> {
    return fetcher<MembershipSubscribeResponse>(`/api/v1/clubs/${clubId}/memberships/subscribe`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function cancelMyMembershipEndpoint(
    clubId: string
): Promise<MembershipSubscriptionResponse> {
    return fetcher<MembershipSubscriptionResponse>(
        `/api/v1/clubs/${clubId}/memberships/me/cancel`,
        { method: "POST" }
    );
}
