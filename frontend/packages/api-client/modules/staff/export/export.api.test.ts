import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestExportEndpoint } from "./export.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("requestExportEndpoint", () => {
    it("calls POST /api/v1/analytics/exports with body", async () => {
        mockFetcher.mockResolvedValue({
            status: "queued",
            report_type: "revenue_summary",
            format: "csv",
            detail: "Export queued; a download link will be emailed to staff@example.com.",
        });

        const data = {
            report_type: "revenue_summary" as const,
            club_id: "club-1",
            format: "csv" as const,
            basis: "service" as const,
        };

        await requestExportEndpoint(data);

        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/analytics/exports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});
