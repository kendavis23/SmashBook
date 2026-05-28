import { fetcher } from "../../../core/fetcher";
import type {
    MembershipSubscribeRequest,
    MembershipSubscribeResponse,
    MembershipSubscriptionResponse,
    MembershipUpgradeRequest,
    MembershipDowngradeRequest,
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

export function upgradeMyMembershipEndpoint(
    clubId: string,
    data: MembershipUpgradeRequest
): Promise<MembershipSubscribeResponse> {
    return fetcher<MembershipSubscribeResponse>(`/api/v1/clubs/${clubId}/memberships/me/upgrade`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function downgradeMyMembershipEndpoint(
    clubId: string,
    data: MembershipDowngradeRequest
): Promise<MembershipSubscriptionResponse> {
    return fetcher<MembershipSubscriptionResponse>(
        `/api/v1/clubs/${clubId}/memberships/me/downgrade`,
        {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify(data),
        }
    );
}

export function cancelPendingDowngradeEndpoint(
    clubId: string
): Promise<MembershipSubscriptionResponse> {
    return fetcher<MembershipSubscriptionResponse>(
        `/api/v1/clubs/${clubId}/memberships/me/downgrade/cancel`,
        { method: "POST" }
    );
}
