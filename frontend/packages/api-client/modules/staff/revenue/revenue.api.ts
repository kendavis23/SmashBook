import { fetcher } from "../../../core/fetcher";
import type {
    ClubRevenueByType,
    ClubRevenueSummary,
    ClubRevenueTimeseries,
    Granularity,
    RevenueBasis,
    TenantRevenueComparison,
} from "./revenue.types";

const BASE = "/api/v1/analytics/revenue";

export function getClubRevenueTimeseriesEndpoint(
    clubId: string,
    params?: {
        granularity?: Granularity;
        basis?: RevenueBasis;
        date_from?: string;
        date_to?: string;
    }
): Promise<ClubRevenueTimeseries> {
    const query = new URLSearchParams();
    if (params?.granularity) query.set("granularity", params.granularity);
    if (params?.basis) query.set("basis", params.basis);
    if (params?.date_from) query.set("date_from", params.date_from);
    if (params?.date_to) query.set("date_to", params.date_to);
    const qs = query.toString();
    return fetcher<ClubRevenueTimeseries>(
        `${BASE}/clubs/${clubId}/timeseries${qs ? `?${qs}` : ""}`
    );
}

export function getClubRevenueByTypeEndpoint(
    clubId: string,
    params?: {
        basis?: RevenueBasis;
        date_from?: string;
        date_to?: string;
    }
): Promise<ClubRevenueByType> {
    const query = new URLSearchParams();
    if (params?.basis) query.set("basis", params.basis);
    if (params?.date_from) query.set("date_from", params.date_from);
    if (params?.date_to) query.set("date_to", params.date_to);
    const qs = query.toString();
    return fetcher<ClubRevenueByType>(`${BASE}/clubs/${clubId}/by-type${qs ? `?${qs}` : ""}`);
}

export function getClubRevenueSummaryEndpoint(
    clubId: string,
    params?: {
        basis?: RevenueBasis;
        date_from?: string;
        date_to?: string;
    }
): Promise<ClubRevenueSummary> {
    const query = new URLSearchParams();
    if (params?.basis) query.set("basis", params.basis);
    if (params?.date_from) query.set("date_from", params.date_from);
    if (params?.date_to) query.set("date_to", params.date_to);
    const qs = query.toString();
    return fetcher<ClubRevenueSummary>(`${BASE}/clubs/${clubId}/summary${qs ? `?${qs}` : ""}`);
}

export function getTenantRevenueComparisonEndpoint(params?: {
    basis?: RevenueBasis;
    date_from?: string;
    date_to?: string;
}): Promise<TenantRevenueComparison> {
    const query = new URLSearchParams();
    if (params?.basis) query.set("basis", params.basis);
    if (params?.date_from) query.set("date_from", params.date_from);
    if (params?.date_to) query.set("date_to", params.date_to);
    const qs = query.toString();
    return fetcher<TenantRevenueComparison>(`${BASE}/clubs${qs ? `?${qs}` : ""}`);
}
