import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getSubscriptionEndpoint,
    listInvoicesEndpoint,
    createSetupIntentEndpoint,
    updatePaymentMethodEndpoint,
} from "@repo/api-client/modules/staff";
import type {
    Subscription,
    InvoiceItem,
    SetupIntent,
    UpdatePaymentMethodInput,
    UpdatePaymentMethodResult,
} from "../models";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const subscriptionKeys = {
    subscription: () => ["subscription"] as const,
    invoices: () => ["subscription", "invoices"] as const,
};

// ---------------------------------------------------------------------------
// useGetSubscription — GET /api/v1/subscription
// ---------------------------------------------------------------------------

export function useGetSubscription() {
    return useQuery({
        queryKey: subscriptionKeys.subscription(),
        queryFn: async (): Promise<Subscription> => {
            const raw = await getSubscriptionEndpoint();
            return raw as Subscription;
        },
    });
}

// ---------------------------------------------------------------------------
// useListInvoices — GET /api/v1/subscription/invoices
// ---------------------------------------------------------------------------

export function useListInvoices() {
    return useQuery({
        queryKey: subscriptionKeys.invoices(),
        queryFn: async (): Promise<InvoiceItem[]> => {
            const raw = await listInvoicesEndpoint();
            return raw.invoices as InvoiceItem[];
        },
    });
}

// ---------------------------------------------------------------------------
// useCreateSetupIntent — POST /api/v1/subscription/setup-intent
// ---------------------------------------------------------------------------

export function useCreateSetupIntent() {
    return useMutation<SetupIntent, Error, void>({
        mutationFn: async (): Promise<SetupIntent> => {
            const raw = await createSetupIntentEndpoint();
            return raw as SetupIntent;
        },
    });
}

// ---------------------------------------------------------------------------
// useUpdatePaymentMethod — PUT /api/v1/subscription/payment-method
// ---------------------------------------------------------------------------

export function useUpdatePaymentMethod() {
    const queryClient = useQueryClient();
    return useMutation<UpdatePaymentMethodResult, Error, UpdatePaymentMethodInput>({
        mutationFn: (data: UpdatePaymentMethodInput) =>
            updatePaymentMethodEndpoint(data) as Promise<UpdatePaymentMethodResult>,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: subscriptionKeys.subscription() });
        },
    });
}
