export type UUID = string;

export type RevenueBasis = "service" | "cash";

export type Granularity = "day" | "week" | "month";

export interface RevenueTimeseriesPoint {
    period_start: string;
    gross_amount: number;
    refund_amount: number;
    net_amount: number;
    transaction_count: number;
}

export interface ClubRevenueTimeseries {
    club_id: UUID;
    basis: RevenueBasis;
    granularity: Granularity;
    date_from: string;
    date_to: string;
    currency: string | null;
    points: RevenueTimeseriesPoint[];
}

export interface RevenueByTypeRow {
    revenue_type: string;
    gross_amount: number;
    refund_amount: number;
    net_amount: number;
    transaction_count: number;
}

export interface ClubRevenueByType {
    club_id: UUID;
    basis: RevenueBasis;
    date_from: string;
    date_to: string;
    currency: string | null;
    rows: RevenueByTypeRow[];
}

export interface ClubRevenueSummary {
    club_id: UUID;
    basis: RevenueBasis;
    date_from: string;
    date_to: string;
    currency: string | null;
    gross_amount: number;
    refund_amount: number;
    net_amount: number;
    transaction_count: number;
    avg_transaction_value: number;
    by_type: RevenueByTypeRow[];
}

export interface ClubRevenueComparisonRow {
    club_id: UUID;
    club_name: string;
    currency: string | null;
    gross_amount: number;
    refund_amount: number;
    net_amount: number;
    transaction_count: number;
}

export interface TenantRevenueComparison {
    basis: RevenueBasis;
    date_from: string;
    date_to: string;
    clubs: ClubRevenueComparisonRow[];
}

export interface RevenueParams {
    basis?: RevenueBasis;
    dateFrom?: string;
    dateTo?: string;
}

export interface RevenueTimeseriesParams extends RevenueParams {
    granularity?: Granularity;
}
