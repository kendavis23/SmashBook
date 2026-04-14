import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    createMembershipPlanEndpoint,
    listMembershipPlansEndpoint,
    getMembershipPlanEndpoint,
    updateMembershipPlanEndpoint,
} from "@repo/api-client/modules/staff";
import type { MembershipPlan, MembershipPlanInput, MembershipPlanUpdateInput } from "../models";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const membershipKeys = {
    all: (clubId: string) => ["membership-plans", clubId] as const,
    detail: (clubId: string, planId: string) => ["membership-plans", clubId, planId] as const,
};

// ---------------------------------------------------------------------------
// useListMembershipPlans — GET /api/v1/clubs/:clubId/membership-plans
// ---------------------------------------------------------------------------

export function useListMembershipPlans(clubId: string) {
    return useQuery({
        queryKey: membershipKeys.all(clubId),
        queryFn: (): Promise<MembershipPlan[]> => listMembershipPlansEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useGetMembershipPlan — GET /api/v1/clubs/:clubId/membership-plans/:planId
// ---------------------------------------------------------------------------

export function useGetMembershipPlan(clubId: string, planId: string) {
    return useQuery({
        queryKey: membershipKeys.detail(clubId, planId),
        queryFn: (): Promise<MembershipPlan> => getMembershipPlanEndpoint(clubId, planId),
        enabled: Boolean(clubId) && Boolean(planId),
    });
}

// ---------------------------------------------------------------------------
// useCreateMembershipPlan — POST /api/v1/clubs/:clubId/membership-plans
// ---------------------------------------------------------------------------

export function useCreateMembershipPlan(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<MembershipPlan, Error, MembershipPlanInput>({
        mutationFn: (data: MembershipPlanInput) => createMembershipPlanEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: membershipKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useUpdateMembershipPlan — PATCH /api/v1/clubs/:clubId/membership-plans/:planId
// ---------------------------------------------------------------------------

export function useUpdateMembershipPlan(clubId: string, planId: string) {
    const queryClient = useQueryClient();
    return useMutation<MembershipPlan, Error, MembershipPlanUpdateInput>({
        mutationFn: (data: MembershipPlanUpdateInput) =>
            updateMembershipPlanEndpoint(clubId, planId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: membershipKeys.detail(clubId, planId) });
            queryClient.invalidateQueries({ queryKey: membershipKeys.all(clubId) });
        },
    });
}
