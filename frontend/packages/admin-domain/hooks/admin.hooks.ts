import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    onboardTenantEndpoint,
    listPlansEndpoint,
    createPlanEndpoint,
    getPlanEndpoint,
    updatePlanEndpoint,
    listTenantsEndpoint,
    getTenantEndpoint,
    updateTenantEndpoint,
    activateTenantEndpoint,
    suspendTenantEndpoint,
    changeTenantPlanEndpoint,
} from "@repo/api-client/modules/admin";

import type {
    Plan,
    PlanInput,
    PlanUpdateInput,
    TenantSummary,
    TenantDetail,
    TenantOnboardInput,
    TenantOnboardResult,
    TenantUpdateInput,
    TenantActivateInput,
    TenantChangePlanInput,
} from "../models";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const planKeys = {
    all: (platformKey: string) => ["plans", platformKey] as const,
    detail: (platformKey: string, planId: string) => ["plans", platformKey, planId] as const,
};

const tenantKeys = {
    all: (platformKey: string) => ["tenants", platformKey] as const,
    detail: (platformKey: string, tenantId: string) => ["tenants", platformKey, tenantId] as const,
};

// ---------------------------------------------------------------------------
// useOnboardTenant — POST /api/v1/admin/onboard
// ---------------------------------------------------------------------------

export function useOnboardTenant(platformKey: string) {
    const queryClient = useQueryClient();
    return useMutation<TenantOnboardResult, Error, TenantOnboardInput>({
        mutationFn: (data: TenantOnboardInput) => onboardTenantEndpoint(platformKey, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.all(platformKey) });
        },
    });
}

// ---------------------------------------------------------------------------
// useListPlans — GET /api/v1/admin/plans
// ---------------------------------------------------------------------------

export function useListPlans(platformKey: string) {
    return useQuery({
        queryKey: planKeys.all(platformKey),
        queryFn: (): Promise<Plan[]> => listPlansEndpoint(platformKey),
        enabled: Boolean(platformKey),
    });
}

// ---------------------------------------------------------------------------
// useCreatePlan — POST /api/v1/admin/plans
// ---------------------------------------------------------------------------

export function useCreatePlan(platformKey: string) {
    const queryClient = useQueryClient();
    return useMutation<Plan, Error, PlanInput>({
        mutationFn: (data: PlanInput) => createPlanEndpoint(platformKey, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: planKeys.all(platformKey) });
        },
    });
}

// ---------------------------------------------------------------------------
// useGetPlan — GET /api/v1/admin/plans/:planId
// ---------------------------------------------------------------------------

export function useGetPlan(platformKey: string, planId: string) {
    return useQuery({
        queryKey: planKeys.detail(platformKey, planId),
        queryFn: (): Promise<Plan> => getPlanEndpoint(platformKey, planId),
        enabled: Boolean(platformKey) && Boolean(planId),
    });
}

// ---------------------------------------------------------------------------
// useUpdatePlan — PUT /api/v1/admin/plans/:planId
// ---------------------------------------------------------------------------

export function useUpdatePlan(platformKey: string, planId: string) {
    const queryClient = useQueryClient();
    return useMutation<Plan, Error, PlanUpdateInput>({
        mutationFn: (data: PlanUpdateInput) => updatePlanEndpoint(platformKey, planId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: planKeys.detail(platformKey, planId) });
            queryClient.invalidateQueries({ queryKey: planKeys.all(platformKey) });
        },
    });
}

// ---------------------------------------------------------------------------
// useListTenants — GET /api/v1/admin/tenants
// ---------------------------------------------------------------------------

export function useListTenants(platformKey: string) {
    return useQuery({
        queryKey: tenantKeys.all(platformKey),
        queryFn: (): Promise<TenantSummary[]> => listTenantsEndpoint(platformKey),
        enabled: Boolean(platformKey),
    });
}

// ---------------------------------------------------------------------------
// useGetTenant — GET /api/v1/admin/tenants/:tenantId
// ---------------------------------------------------------------------------

export function useGetTenant(platformKey: string, tenantId: string) {
    return useQuery({
        queryKey: tenantKeys.detail(platformKey, tenantId),
        queryFn: (): Promise<TenantDetail> => getTenantEndpoint(platformKey, tenantId),
        enabled: Boolean(platformKey) && Boolean(tenantId),
    });
}

// ---------------------------------------------------------------------------
// useUpdateTenant — PATCH /api/v1/admin/tenants/:tenantId
// ---------------------------------------------------------------------------

export function useUpdateTenant(platformKey: string, tenantId: string) {
    const queryClient = useQueryClient();
    return useMutation<TenantDetail, Error, TenantUpdateInput>({
        mutationFn: (data: TenantUpdateInput) => updateTenantEndpoint(platformKey, tenantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.detail(platformKey, tenantId) });
            queryClient.invalidateQueries({ queryKey: tenantKeys.all(platformKey) });
        },
    });
}

// ---------------------------------------------------------------------------
// useActivateTenant — POST /api/v1/admin/tenants/:tenantId/activate
// ---------------------------------------------------------------------------

export function useActivateTenant(platformKey: string, tenantId: string) {
    const queryClient = useQueryClient();
    return useMutation<TenantDetail, Error, TenantActivateInput>({
        mutationFn: (data: TenantActivateInput) =>
            activateTenantEndpoint(platformKey, tenantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.detail(platformKey, tenantId) });
            queryClient.invalidateQueries({ queryKey: tenantKeys.all(platformKey) });
        },
    });
}

// ---------------------------------------------------------------------------
// useSuspendTenant — POST /api/v1/admin/tenants/:tenantId/suspend
// ---------------------------------------------------------------------------

export function useSuspendTenant(platformKey: string, tenantId: string) {
    const queryClient = useQueryClient();
    return useMutation<TenantDetail, Error, void>({
        mutationFn: () => suspendTenantEndpoint(platformKey, tenantId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.detail(platformKey, tenantId) });
            queryClient.invalidateQueries({ queryKey: tenantKeys.all(platformKey) });
        },
    });
}

// ---------------------------------------------------------------------------
// useChangeTenantPlan — POST /api/v1/admin/tenants/:tenantId/change-plan
// ---------------------------------------------------------------------------

export function useChangeTenantPlan(platformKey: string, tenantId: string) {
    const queryClient = useQueryClient();
    return useMutation<TenantDetail, Error, TenantChangePlanInput>({
        mutationFn: (data: TenantChangePlanInput) =>
            changeTenantPlanEndpoint(platformKey, tenantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.detail(platformKey, tenantId) });
            queryClient.invalidateQueries({ queryKey: tenantKeys.all(platformKey) });
        },
    });
}
