import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---------------------------------------------------------------------------
// Mock the api-client module
// ---------------------------------------------------------------------------

vi.mock("@repo/api-client/modules/staff", () => ({
    getSubscriptionEndpoint: vi.fn(),
    listInvoicesEndpoint: vi.fn(),
    createSetupIntentEndpoint: vi.fn(),
    updatePaymentMethodEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";

import {
    useGetSubscription,
    useListInvoices,
    useCreateSetupIntent,
    useUpdatePaymentMethod,
} from "./subscription.hooks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockSubscription = {
    plan_id: "plan-uuid",
    plan_name: "Pro",
    price_per_month: 99,
    limits: { max_clubs: 5, max_courts_per_club: 10, max_staff_users: 20 },
    usage: { clubs_used: 1, courts_used: 3, staff_used: 4 },
    features: { open_games: true, waitlist: true, white_label: false, analytics: true },
    is_active: true,
    subscription_status: "active" as const,
    subscription_start_date: "2026-01-01T00:00:00Z",
    current_period_end: "2026-06-01T00:00:00Z",
    has_payment_method: true,
};

const mockInvoice = {
    id: "inv_1",
    number: "INV-001",
    status: "paid",
    amount_due: 9900,
    amount_paid: 9900,
    currency: "usd",
    created: "2026-05-01T00:00:00Z",
    period_start: "2026-05-01T00:00:00Z",
    period_end: "2026-06-01T00:00:00Z",
    hosted_invoice_url: "https://stripe.com/invoice/1",
    invoice_pdf: "https://stripe.com/invoice/1.pdf",
};

const mockSetupIntent = {
    setup_intent_id: "seti_abc",
    client_secret: "seti_abc_secret",
};

const mockPaymentMethodResult = {
    default_payment_method_id: "pm_xyz",
};

// ---------------------------------------------------------------------------
// useGetSubscription
// ---------------------------------------------------------------------------

describe("useGetSubscription", () => {
    it("returns subscription data", async () => {
        vi.mocked(staffApi.getSubscriptionEndpoint).mockResolvedValue(mockSubscription as never);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetSubscription(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockSubscription);
        expect(staffApi.getSubscriptionEndpoint).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// useListInvoices
// ---------------------------------------------------------------------------

describe("useListInvoices", () => {
    it("returns the invoices array from the response", async () => {
        vi.mocked(staffApi.listInvoicesEndpoint).mockResolvedValue({
            invoices: [mockInvoice],
        } as never);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListInvoices(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockInvoice]);
    });
});

// ---------------------------------------------------------------------------
// useCreateSetupIntent
// ---------------------------------------------------------------------------

describe("useCreateSetupIntent", () => {
    it("calls createSetupIntentEndpoint and returns the intent", async () => {
        vi.mocked(staffApi.createSetupIntentEndpoint).mockResolvedValue(mockSetupIntent as never);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useCreateSetupIntent(), { wrapper: Wrapper });
        result.current.mutate();
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockSetupIntent);
        expect(staffApi.createSetupIntentEndpoint).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// useUpdatePaymentMethod
// ---------------------------------------------------------------------------

describe("useUpdatePaymentMethod", () => {
    it("calls endpoint with payment_method_id and invalidates subscription", async () => {
        vi.mocked(staffApi.updatePaymentMethodEndpoint).mockResolvedValue(
            mockPaymentMethodResult as never
        );
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useUpdatePaymentMethod(), { wrapper: Wrapper });
        result.current.mutate({ payment_method_id: "pm_xyz" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.updatePaymentMethodEndpoint).toHaveBeenCalledWith({
            payment_method_id: "pm_xyz",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["subscription"] })
        );
    });
});
