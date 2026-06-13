import type { UUID } from "../common";
import type { RevenueBasis } from "../revenue/revenue.types";
export type { UUID };
export type { RevenueBasis };

export type ExportReportType =
    | "revenue_summary"
    | "revenue_by_type"
    | "revenue_timeseries"
    | "player_value";

export type ExportFormat = "csv" | "xlsx";

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
