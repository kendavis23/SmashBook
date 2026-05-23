import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    getSubscriptionEndpoint,
    listInvoicesEndpoint,
    createSetupIntentEndpoint,
    updatePaymentMethodEndpoint,
} from "./subscription.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("getSubscriptionEndpoint", () => {
    it("calls GET /api/v1/subscription", async () => {
        mockFetcher.mockResolvedValue({});
        await getSubscriptionEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/subscription");
    });
});

describe("listInvoicesEndpoint", () => {
    it("calls GET /api/v1/subscription/invoices", async () => {
        mockFetcher.mockResolvedValue({ invoices: [] });
        await listInvoicesEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/subscription/invoices");
    });
});

describe("createSetupIntentEndpoint", () => {
    it("calls POST /api/v1/subscription/setup-intent", async () => {
        mockFetcher.mockResolvedValue({});
        await createSetupIntentEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/subscription/setup-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
    });
});

describe("updatePaymentMethodEndpoint", () => {
    it("calls PUT /api/v1/subscription/payment-method with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { payment_method_id: "pm_abc123" };
        await updatePaymentMethodEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/subscription/payment-method", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});
