import { useQuery } from "@tanstack/react-query";
import { getMyMembershipEndpoint } from "@repo/api-client/modules/player";
import type { MembershipSubscription } from "../models";

const membershipKeys = {
    me: (clubId: string) => ["membership", "me", clubId] as const,
};

export function useMyMembership(clubId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: membershipKeys.me(clubId),
        queryFn: (): Promise<MembershipSubscription> => getMyMembershipEndpoint(clubId),
        enabled: Boolean(clubId) && (options?.enabled ?? true),
    });
}
