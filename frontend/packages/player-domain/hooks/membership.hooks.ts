import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    cancelMyMembershipEndpoint,
    getMyMembershipEndpoint,
    subscribeToPlanEndpoint,
    upgradeMyMembershipEndpoint,
    downgradeMyMembershipEndpoint,
    cancelPendingDowngradeEndpoint,
} from "@repo/api-client/modules/player";
import { listMembershipPlansEndpoint } from "@repo/api-client/modules/share";
import type {
    MembershipPlan,
    MembershipSubscribeInput,
    MembershipSubscribeResult,
    MembershipSubscription,
    MembershipUpgradeInput,
    MembershipDowngradeInput,
} from "../models";

const membershipKeys = {
    all: (clubId: string) => ["membership-plans", clubId] as const,
    me: (clubId: string) => ["membership", "me", clubId] as const,
};

export function useListMembershipPlans(clubId: string) {
    return useQuery({
        queryKey: membershipKeys.all(clubId),
        queryFn: (): Promise<MembershipPlan[]> => listMembershipPlansEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}

export function useMyMembership(clubId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: membershipKeys.me(clubId),
        queryFn: (): Promise<MembershipSubscription> => getMyMembershipEndpoint(clubId),
        enabled: Boolean(clubId) && (options?.enabled ?? true),
    });
}

export function useSubscribeToMembership(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<MembershipSubscribeResult, Error, MembershipSubscribeInput>({
        mutationFn: (data) => subscribeToPlanEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: membershipKeys.me(clubId) });
        },
    });
}

export function useCancelMyMembership(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<MembershipSubscription, Error, void>({
        mutationFn: () => cancelMyMembershipEndpoint(clubId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: membershipKeys.me(clubId) });
        },
    });
}

export function useUpgradeMyMembership(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<MembershipSubscribeResult, Error, MembershipUpgradeInput>({
        mutationFn: (data) => upgradeMyMembershipEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: membershipKeys.me(clubId) });
        },
    });
}

export function useDowngradeMyMembership(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<MembershipSubscription, Error, MembershipDowngradeInput>({
        mutationFn: (data) => downgradeMyMembershipEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: membershipKeys.me(clubId) });
        },
    });
}

export function useCancelPendingDowngrade(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<MembershipSubscription, Error, void>({
        mutationFn: () => cancelPendingDowngradeEndpoint(clubId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: membershipKeys.me(clubId) });
        },
    });
}
