import { fetcher } from "../../../core/fetcher";
import type { MembershipPlanResponse } from "./membership.types";

export function listMembershipPlansEndpoint(clubId: string): Promise<MembershipPlanResponse[]> {
    return fetcher<MembershipPlanResponse[]>(`/api/v1/clubs/${clubId}/membership-plans`);
}
