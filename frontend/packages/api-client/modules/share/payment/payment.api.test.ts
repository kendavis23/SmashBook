import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createPaymentIntentEndpoint,
    createSetupIntentEndpoint,
    savePaymentMethodEndpoint,
    listPaymentMethodsEndpoint,
    deletePaymentMethodEndpoint,
    setDefaultPaymentMethodEndpoint,
    getWalletEndpoint,
    topUpWalletEndpoint,
    payBookingWithWalletEndpoint,
} from "./payment.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("createPaymentIntentEndpoint", () => {
    it("calls POST /api/v1/payments/payment-intent with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { booking_id: "booking-1", payment_method_id: "pm_123" };
        await createPaymentIntentEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/payments/payment-intent", {
            method: "POST",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("createSetupIntentEndpoint", () => {
    it("calls POST /api/v1/payments/setup-intent", async () => {
        mockFetcher.mockResolvedValue({});
        await createSetupIntentEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/payments/setup-intent", {
            method: "POST",
            cache: "no-store",
        });
    });
});

describe("savePaymentMethodEndpoint", () => {
    it("calls POST /api/v1/payments/payment-methods with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { payment_method_id: "pm_123", set_as_default: true };
        await savePaymentMethodEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/payments/payment-methods", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("listPaymentMethodsEndpoint", () => {
    it("calls GET /api/v1/payments/payment-methods", async () => {
        mockFetcher.mockResolvedValue([]);
        await listPaymentMethodsEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/payments/payment-methods", {
            cache: "no-store",
        });
    });
});

describe("deletePaymentMethodEndpoint", () => {
    it("calls DELETE /api/v1/payments/payment-methods/:methodId", async () => {
        mockFetcher.mockResolvedValue(undefined);
        await deletePaymentMethodEndpoint("pm_123");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/payments/payment-methods/pm_123", {
            method: "DELETE",
        });
    });
});

describe("setDefaultPaymentMethodEndpoint", () => {
    it("calls PATCH /api/v1/payments/payment-methods/:methodId/default", async () => {
        mockFetcher.mockResolvedValue({});
        await setDefaultPaymentMethodEndpoint("pm_123");
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/payments/payment-methods/pm_123/default",
            {
                method: "PATCH",
            }
        );
    });
});

describe("getWalletEndpoint", () => {
    it("calls GET /api/v1/payments/wallet", async () => {
        mockFetcher.mockResolvedValue({});
        await getWalletEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/payments/wallet");
    });
});

describe("topUpWalletEndpoint", () => {
    it("calls POST /api/v1/payments/wallet/top-up with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { amount_pence: 1000, payment_method_id: "pm_123" };
        await topUpWalletEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/payments/wallet/top-up", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("payBookingWithWalletEndpoint", () => {
    it("calls POST /api/v1/payments/wallet/pay-booking with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { booking_id: "booking-1" };
        await payBookingWithWalletEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/payments/wallet/pay-booking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});
