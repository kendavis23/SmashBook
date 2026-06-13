import type { UUID } from "../common";
export type { UUID };

export type ExportReportType =
    | "revenue_summary"
    | "revenue_by_type"
    | "revenue_timeseries"
    | "player_value";

export type ExportFormat = "csv" | "xlsx";

export type RevenueBasis = "service" | "cash";

export interface ExportRequest {
    report_type: ExportReportType;
    club_id: UUID;
    format?: ExportFormat;
    date_from?: string | null;
    date_to?: string | null;
    basis?: RevenueBasis;
}

export interface ExportAccepted {
    status: string;
    report_type: ExportReportType;
    format: ExportFormat;
    detail: string;
}
