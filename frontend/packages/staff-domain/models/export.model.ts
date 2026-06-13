export type UUID = string;

export type ExportReportType =
    | "revenue_summary"
    | "revenue_by_type"
    | "revenue_timeseries"
    | "player_value";

export type ExportFormat = "csv" | "xlsx";

export type ExportRevenueBasis = "service" | "cash";

export interface ExportInput {
    report_type: ExportReportType;
    club_id: UUID;
    format?: ExportFormat;
    date_from?: string | null;
    date_to?: string | null;
    basis?: ExportRevenueBasis;
}

export interface ExportAccepted {
    status: string;
    report_type: ExportReportType;
    format: ExportFormat;
    detail: string;
}
