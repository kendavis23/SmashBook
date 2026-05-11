import { fetcher } from "../../../core/fetcher";
import type { MembershipSubscriptionResponse } from "./membership.types";

export function getMyMembershipEndpoint(clubId: string): Promise<MembershipSubscriptionResponse> {
    return fetcher<MembershipSubscriptionResponse>(`/api/v1/clubs/${clubId}/memberships/me`);
}
