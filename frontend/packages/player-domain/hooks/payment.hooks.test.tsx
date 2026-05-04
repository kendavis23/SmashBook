import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/share", () => ({
    createPaymentIntentEndpoint: vi.fn(),
    createSetupIntentEndpoint: vi.fn(),
    savePaymentMethodEndpoint: vi.fn(),
    listPaymentMethodsEndpoint: vi.fn(),
    deletePaymentMethodEndpoint: vi.fn(),
    setDefaultPaymentMethodEndpoint: vi.fn(),
    getWalletEndpoint: vi.fn(),
    topUpWalletEndpoint: vi.fn(),
}));

import * as shareApi from "@repo/api-client/modules/share";

import {
    useCreatePaymentIntent,
    useCreateSetupIntent,
    useSavePaymentMethod,
    useListPaymentMethods,
    useDeletePaymentMethod,
    useSetDefaultPaymentMethod,
    useGetWallet,
    useTopUpWallet,
} from "./payment.hooks";

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

const mockPaymentMethod = {
    id: "pm_123",
    brand: "visa",
    last4: "4242",
    exp_month: 12,
    exp_year: 2027,
    is_default: true,
};

const mockPaymentIntent = {
    client_secret: "pi_secret_abc",
    payment_intent_id: "pi_123",
    amount: 2000,
    currency: "gbp",
};

const mockSetupIntent = {
    client_secret: "seti_secret_abc",
    setup_intent_id: "seti_123",
};

const mockWallet = {
    balance: 5000,
    currency: "gbp",
    auto_topup_enabled: false,
    auto_topup_threshold: null,
    auto_topup_amount: null,
    transactions: [],
};

const mockWalletTopUp = {
    client_secret: "pi_topup_secret",
    payment_intent_id: "pi_topup_123",
    amount: 1000,
    currency: "gbp",
};

describe("useCreatePaymentIntent", () => {
    it("calls createPaymentIntentEndpoint with correct args", async () => {
        vi.mocked(shareApi.createPaymentIntentEndpoint).mockResolvedValue(mockPaymentIntent);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useCreatePaymentIntent(), { wrapper: Wrapper });
        result.current.mutate({ booking_id: "booking-1", payment_method_id: "pm_123" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shareApi.createPaymentIntentEndpoint).toHaveBeenCalledWith({
            booking_id: "booking-1",
            payment_method_id: "pm_123",
        });
        expect(result.current.data).toEqual(mockPaymentIntent);
    });
});

describe("useCreateSetupIntent", () => {
    it("calls createSetupIntentEndpoint", async () => {
        vi.mocked(shareApi.createSetupIntentEndpoint).mockResolvedValue(mockSetupIntent);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useCreateSetupIntent(), { wrapper: Wrapper });
        result.current.mutate();
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shareApi.createSetupIntentEndpoint).toHaveBeenCalled();
        expect(result.current.data).toEqual(mockSetupIntent);
    });
});

describe("useSavePaymentMethod", () => {
    it("calls savePaymentMethodEndpoint and invalidates payment methods", async () => {
        vi.mocked(shareApi.savePaymentMethodEndpoint).mockResolvedValue(mockPaymentMethod);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useSavePaymentMethod(), { wrapper: Wrapper });
        result.current.mutate({ payment_method_id: "pm_123", set_as_default: true });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shareApi.savePaymentMethodEndpoint).toHaveBeenCalledWith({
            payment_method_id: "pm_123",
            set_as_default: true,
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["player", "payment-methods"] })
        );
    });
});

describe("useListPaymentMethods", () => {
    it("returns list of payment methods", async () => {
        vi.mocked(shareApi.listPaymentMethodsEndpoint).mockResolvedValue([mockPaymentMethod]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListPaymentMethods(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockPaymentMethod]);
        expect(shareApi.listPaymentMethodsEndpoint).toHaveBeenCalled();
    });
});

describe("useDeletePaymentMethod", () => {
    it("calls deletePaymentMethodEndpoint and invalidates payment methods", async () => {
        vi.mocked(shareApi.deletePaymentMethodEndpoint).mockResolvedValue(undefined);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useDeletePaymentMethod(), { wrapper: Wrapper });
        result.current.mutate("pm_123");
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shareApi.deletePaymentMethodEndpoint).toHaveBeenCalledWith("pm_123");
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["player", "payment-methods"] })
        );
    });
});

describe("useSetDefaultPaymentMethod", () => {
    it("calls setDefaultPaymentMethodEndpoint and invalidates payment methods", async () => {
        vi.mocked(shareApi.setDefaultPaymentMethodEndpoint).mockResolvedValue(mockPaymentMethod);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useSetDefaultPaymentMethod(), { wrapper: Wrapper });
        result.current.mutate("pm_123");
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shareApi.setDefaultPaymentMethodEndpoint).toHaveBeenCalledWith("pm_123");
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["player", "payment-methods"] })
        );
    });
});

describe("useGetWallet", () => {
    it("returns wallet data", async () => {
        vi.mocked(shareApi.getWalletEndpoint).mockResolvedValue(mockWallet);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetWallet(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockWallet);
        expect(shareApi.getWalletEndpoint).toHaveBeenCalled();
    });
});

describe("useTopUpWallet", () => {
    it("calls topUpWalletEndpoint and invalidates wallet", async () => {
        vi.mocked(shareApi.topUpWalletEndpoint).mockResolvedValue(mockWalletTopUp);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useTopUpWallet(), { wrapper: Wrapper });
        result.current.mutate({ amount_pence: 1000, payment_method_id: "pm_123" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shareApi.topUpWalletEndpoint).toHaveBeenCalledWith({
            amount_pence: 1000,
            payment_method_id: "pm_123",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["player", "wallet"] })
        );
    });
});
