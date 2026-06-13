import { describe, it, expect, vi, beforeEach } from "vitest";
import { listPayoutsEndpoint } from "./payment.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("listPayoutsEndpoint", () => {
    it("calls GET /api/v1/payments/payouts with club_id", async () => {
        mockFetcher.mockResolvedValue([]);
        await listPayoutsEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/payments/payouts?club_id=club-1");
    });

    it("appends reconciliation_status filter", async () => {
        mockFetcher.mockResolvedValue([]);
        await listPayoutsEndpoint("club-1", { reconciliation_status: "unmatched" });
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/payments/payouts?club_id=club-1&reconciliation_status=unmatched"
        );
    });
});
