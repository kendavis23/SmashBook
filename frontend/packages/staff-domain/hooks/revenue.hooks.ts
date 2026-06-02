import { useQuery } from "@tanstack/react-query";
import {
    getClubRevenueTimeseriesEndpoint,
    getClubRevenueByTypeEndpoint,
    getClubRevenueSummaryEndpoint,
    getTenantRevenueComparisonEndpoint,
} from "@repo/api-client/modules/staff";
import type {
    ClubRevenueTimeseries,
    ClubRevenueByType,
    ClubRevenueSummary,
    TenantRevenueComparison,
    RevenueParams,
    RevenueTimeseriesParams,
} from "../models";

const revenueKeys = {
    timeseries: (clubId: string, params?: RevenueTimeseriesParams) =>
        ["revenue", clubId, "timeseries", params] as const,
    byType: (clubId: string, params?: RevenueParams) =>
        ["revenue", clubId, "by-type", params] as const,
    summary: (clubId: string, params?: RevenueParams) =>
        ["revenue", clubId, "summary", params] as const,
    comparison: (params?: RevenueParams) => ["revenue", "comparison", params] as const,
};

export function useClubRevenueTimeseries(clubId: string, params: RevenueTimeseriesParams = {}) {
    return useQuery({
        queryKey: revenueKeys.timeseries(clubId, params),
        queryFn: (): Promise<ClubRevenueTimeseries> =>
            getClubRevenueTimeseriesEndpoint(clubId, {
                granularity: params.granularity,
                basis: params.basis,
                date_from: params.dateFrom,
                date_to: params.dateTo,
            }),
        enabled: Boolean(clubId),
    });
}

export function useClubRevenueByType(clubId: string, params: RevenueParams = {}) {
    return useQuery({
        queryKey: revenueKeys.byType(clubId, params),
        queryFn: (): Promise<ClubRevenueByType> =>
            getClubRevenueByTypeEndpoint(clubId, {
                basis: params.basis,
                date_from: params.dateFrom,
                date_to: params.dateTo,
            }),
        enabled: Boolean(clubId),
    });
}

export function useClubRevenueSummary(clubId: string, params: RevenueParams = {}) {
    return useQuery({
        queryKey: revenueKeys.summary(clubId, params),
        queryFn: (): Promise<ClubRevenueSummary> =>
            getClubRevenueSummaryEndpoint(clubId, {
                basis: params.basis,
                date_from: params.dateFrom,
                date_to: params.dateTo,
            }),
        enabled: Boolean(clubId),
    });
}

export function useTenantRevenueComparison(params: RevenueParams = {}) {
    return useQuery({
        queryKey: revenueKeys.comparison(params),
        queryFn: (): Promise<TenantRevenueComparison> =>
            getTenantRevenueComparisonEndpoint({
                basis: params.basis,
                date_from: params.dateFrom,
                date_to: params.dateTo,
            }),
    });
}
