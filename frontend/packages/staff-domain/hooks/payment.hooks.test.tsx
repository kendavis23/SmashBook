import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/staff", () => ({
    listPayoutsEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";
import { useListPayouts } from "./payment.hooks";

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

const CLUB_ID = "club-123";

const mockPayout = {
    id: "payout-1",
    stripe_payout_id: "po_123",
    status: "paid" as const,
    reconciliation_status: "matched" as const,
    gross_amount: 500,
    fee_amount: 15,
    amount: 485,
    matched_amount: 485,
    discrepancy_amount: 0,
    currency: "EUR",
    arrival_date: "2026-05-01T00:00:00Z",
    statement_descriptor: "SMASHBOOK",
    failure_code: null,
    paid_at: "2026-05-01T12:00:00Z",
};

describe("useListPayouts", () => {
    it("returns payouts for a club", async () => {
        vi.mocked(staffApi.listPayoutsEndpoint).mockResolvedValue([mockPayout]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListPayouts(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockPayout]);
        expect(staffApi.listPayoutsEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            reconciliation_status: undefined,
        });
    });

    it("passes reconciliationStatus to the endpoint", async () => {
        vi.mocked(staffApi.listPayoutsEndpoint).mockResolvedValue([mockPayout]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () => useListPayouts(CLUB_ID, { reconciliationStatus: "unmatched" }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.listPayoutsEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            reconciliation_status: "unmatched",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListPayouts(""), { wrapper: Wrapper });
        expect(staffApi.listPayoutsEndpoint).not.toHaveBeenCalled();
    });
});
