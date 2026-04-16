import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    listClubsEndpoint,
    createClubEndpoint,
    getClubEndpoint,
    updateClubEndpoint,
    updateClubSettingsEndpoint,
    getOperatingHoursEndpoint,
    setOperatingHoursEndpoint,
    getPricingRulesEndpoint,
    setPricingRulesEndpoint,
    stripeConnectEndpoint,
} from "@repo/api-client/modules/staff";
import type {
    Club,
    ClubSettings,
    ClubInput,
    ClubUpdateInput,
    ClubSettingsInput,
    OperatingHours,
    PricingRule,
    StripeConnectInput,
    StripeConnectResult,
} from "../models";
import { toPricingRule } from "../mappers";
// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const clubKeys = {
    all: () => ["clubs"] as const,
    detail: (clubId: string) => ["clubs", clubId] as const,
    settings: (clubId: string) => ["clubs", clubId, "settings"] as const,
    operatingHours: (clubId: string) => ["clubs", clubId, "operating-hours"] as const,
    pricingRules: (clubId: string) => ["clubs", clubId, "pricing-rules"] as const,
};

// ---------------------------------------------------------------------------
// useListClubs — GET /api/v1/clubs
// ---------------------------------------------------------------------------

export function useListClubs({ enabled = true }: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: clubKeys.all(),
        queryFn: async (): Promise<Club[]> => listClubsEndpoint(),
        enabled,
    });
}

// ---------------------------------------------------------------------------
// useCreateClub — POST /api/v1/clubs
// ---------------------------------------------------------------------------

export function useCreateClub() {
    const queryClient = useQueryClient();
    return useMutation<Club, Error, ClubInput>({
        mutationFn: (data: ClubInput) => createClubEndpoint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clubKeys.all() });
        },
    });
}

// ---------------------------------------------------------------------------
// useGetClub — GET /api/v1/clubs/:clubId
// ---------------------------------------------------------------------------

export function useGetClub(clubId: string) {
    return useQuery({
        queryKey: clubKeys.detail(clubId),
        queryFn: async (): Promise<Club> => getClubEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useUpdateClub — PUT /api/v1/clubs/:clubId
// ---------------------------------------------------------------------------

export function useUpdateClub(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<Club, Error, ClubUpdateInput>({
        mutationFn: (data: ClubUpdateInput) => updateClubEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clubKeys.detail(clubId) });
            queryClient.invalidateQueries({ queryKey: clubKeys.all() });
        },
    });
}

// ---------------------------------------------------------------------------
// useUpdateClubSettings — PUT /api/v1/clubs/:clubId/settings
// ---------------------------------------------------------------------------

export function useUpdateClubSettings(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<ClubSettings, Error, ClubSettingsInput>({
        mutationFn: (data: ClubSettingsInput) => updateClubSettingsEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clubKeys.settings(clubId) });
            queryClient.invalidateQueries({ queryKey: clubKeys.detail(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useGetOperatingHours — GET /api/v1/clubs/:clubId/operating-hours
// ---------------------------------------------------------------------------

export function useGetOperatingHours(clubId: string) {
    return useQuery({
        queryKey: clubKeys.operatingHours(clubId),
        queryFn: async (): Promise<OperatingHours[]> => getOperatingHoursEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useSetOperatingHours — PUT /api/v1/clubs/:clubId/operating-hours
// ---------------------------------------------------------------------------

export function useSetOperatingHours(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<OperatingHours[], Error, OperatingHours[]>({
        mutationFn: (data: OperatingHours[]) => setOperatingHoursEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clubKeys.operatingHours(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useGetPricingRules — GET /api/v1/clubs/:clubId/pricing-rules
// ---------------------------------------------------------------------------

export function useGetPricingRules(clubId: string) {
    return useQuery({
        queryKey: clubKeys.pricingRules(clubId),
        queryFn: () => getPricingRulesEndpoint(clubId),
        enabled: Boolean(clubId),
        // toPricingRule maps DTO → PricingRule domain model (transforms datetime fields)
        select: (data): PricingRule[] => data.map(toPricingRule),
    });
}

// ---------------------------------------------------------------------------
// useSetPricingRules — PUT /api/v1/clubs/:clubId/pricing-rules
// ---------------------------------------------------------------------------

export function useSetPricingRules(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<PricingRule[], Error, PricingRule[]>({
        mutationFn: (data: PricingRule[]) => setPricingRulesEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clubKeys.pricingRules(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useStripeConnect — POST /api/v1/clubs/:clubId/stripe-connect
// ---------------------------------------------------------------------------

export function useStripeConnect(clubId: string) {
    return useMutation<StripeConnectResult, Error, StripeConnectInput>({
        mutationFn: (data: StripeConnectInput) => stripeConnectEndpoint(clubId, data),
    });
}
