import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/staff", () => ({
    requestExportEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";
import { useRequestExport } from "./export.hooks";

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}

beforeEach(() => {
    vi.clearAllMocks();
});

const mockAccepted = {
    status: "queued",
    report_type: "revenue_summary" as const,
    format: "csv" as const,
    detail: "Export queued; a download link will be emailed to staff@example.com.",
};

const exportInput = {
    report_type: "revenue_summary" as const,
    club_id: "club-123",
    format: "csv" as const,
    basis: "service" as const,
};

describe("useRequestExport", () => {
    it("calls the endpoint with the provided input and returns the accepted response", async () => {
        vi.mocked(staffApi.requestExportEndpoint).mockResolvedValue(mockAccepted);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useRequestExport(), { wrapper: Wrapper });

        result.current.mutate(exportInput);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockAccepted);
        expect(staffApi.requestExportEndpoint).toHaveBeenCalledWith(exportInput);
    });

    it("surfaces an error when the endpoint rejects", async () => {
        vi.mocked(staffApi.requestExportEndpoint).mockRejectedValue(new Error("forbidden"));
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useRequestExport(), { wrapper: Wrapper });

        result.current.mutate(exportInput);

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe("forbidden");
    });
});
