import { fetcher } from "../../../core/fetcher";
import type { ExportAccepted, ExportRequest } from "./export.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function requestExportEndpoint(data: ExportRequest): Promise<ExportAccepted> {
    return fetcher<ExportAccepted>("/api/v1/analytics/exports", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
