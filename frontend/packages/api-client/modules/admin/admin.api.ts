import { adminFetcher } from "./fetcher";
import type {
    TenantOnboardRequest,
    TenantOnboardResponse,
    PlanCreate,
    PlanUpdate,
    PlanResponse,
    TenantSummary,
    TenantDetail,
    TenantUpdate,
    TenantActivateRequest,
    TenantChangePlanRequest,
} from "./admin.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

// Onboarding

export function onboardTenantEndpoint(
    platformKey: string,
    data: TenantOnboardRequest
): Promise<TenantOnboardResponse> {
    return adminFetcher<TenantOnboardResponse>("/api/v1/admin/onboard", platformKey, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

// Subscription Plans

export function listPlansEndpoint(platformKey: string): Promise<PlanResponse[]> {
    return adminFetcher<PlanResponse[]>("/api/v1/admin/plans", platformKey);
}

export function createPlanEndpoint(platformKey: string, data: PlanCreate): Promise<PlanResponse> {
    return adminFetcher<PlanResponse>("/api/v1/admin/plans", platformKey, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function getPlanEndpoint(platformKey: string, planId: string): Promise<PlanResponse> {
    return adminFetcher<PlanResponse>(`/api/v1/admin/plans/${planId}`, platformKey);
}

export function updatePlanEndpoint(
    platformKey: string,
    planId: string,
    data: PlanUpdate
): Promise<PlanResponse> {
    return adminFetcher<PlanResponse>(`/api/v1/admin/plans/${planId}`, platformKey, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

// Tenants

export function listTenantsEndpoint(platformKey: string): Promise<TenantSummary[]> {
    return adminFetcher<TenantSummary[]>("/api/v1/admin/tenants", platformKey);
}

export function getTenantEndpoint(platformKey: string, tenantId: string): Promise<TenantDetail> {
    return adminFetcher<TenantDetail>(`/api/v1/admin/tenants/${tenantId}`, platformKey);
}

export function updateTenantEndpoint(
    platformKey: string,
    tenantId: string,
    data: TenantUpdate
): Promise<TenantDetail> {
    return adminFetcher<TenantDetail>(`/api/v1/admin/tenants/${tenantId}`, platformKey, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function activateTenantEndpoint(
    platformKey: string,
    tenantId: string,
    data: TenantActivateRequest
): Promise<TenantDetail> {
    return adminFetcher<TenantDetail>(`/api/v1/admin/tenants/${tenantId}/activate`, platformKey, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function suspendTenantEndpoint(
    platformKey: string,
    tenantId: string
): Promise<TenantDetail> {
    return adminFetcher<TenantDetail>(`/api/v1/admin/tenants/${tenantId}/suspend`, platformKey, {
        method: "POST",
    });
}

export function changeTenantPlanEndpoint(
    platformKey: string,
    tenantId: string,
    data: TenantChangePlanRequest
): Promise<TenantDetail> {
    return adminFetcher<TenantDetail>(
        `/api/v1/admin/tenants/${tenantId}/change-plan`,
        platformKey,
        { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(data) }
    );
}
