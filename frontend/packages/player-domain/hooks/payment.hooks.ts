import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createPaymentIntentEndpoint,
    createSetupIntentEndpoint,
    savePaymentMethodEndpoint,
    listPaymentMethodsEndpoint,
    deletePaymentMethodEndpoint,
    setDefaultPaymentMethodEndpoint,
    getWalletEndpoint,
    topUpWalletEndpoint,
} from "@repo/api-client/modules/share";
import type {
    PaymentIntent,
    PaymentIntentInput,
    PaymentMethod,
    SavePaymentMethodInput,
    SetupIntent,
    Wallet,
    WalletTopUp,
    WalletTopUpInput,
} from "../models";

const paymentKeys = {
    paymentMethods: () => ["player", "payment-methods"] as const,
    wallet: () => ["player", "wallet"] as const,
};

export function useCreatePaymentIntent() {
    return useMutation<PaymentIntent, Error, PaymentIntentInput>({
        mutationFn: (data: PaymentIntentInput) => createPaymentIntentEndpoint(data),
    });
}

export function useCreateSetupIntent() {
    return useMutation<SetupIntent, Error, void>({
        mutationFn: () => createSetupIntentEndpoint(),
    });
}

export function useSavePaymentMethod() {
    const queryClient = useQueryClient();
    return useMutation<PaymentMethod, Error, SavePaymentMethodInput>({
        mutationFn: (data: SavePaymentMethodInput) => savePaymentMethodEndpoint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: paymentKeys.paymentMethods() });
        },
    });
}

export function useListPaymentMethods() {
    return useQuery({
        queryKey: paymentKeys.paymentMethods(),
        queryFn: (): Promise<PaymentMethod[]> => listPaymentMethodsEndpoint(),
    });
}

export function useDeletePaymentMethod() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (methodId: string) => deletePaymentMethodEndpoint(methodId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: paymentKeys.paymentMethods() });
        },
    });
}

export function useSetDefaultPaymentMethod() {
    const queryClient = useQueryClient();
    return useMutation<PaymentMethod, Error, string>({
        mutationFn: (methodId: string) => setDefaultPaymentMethodEndpoint(methodId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: paymentKeys.paymentMethods() });
        },
    });
}

export function useGetWallet() {
    return useQuery({
        queryKey: paymentKeys.wallet(),
        queryFn: (): Promise<Wallet> => getWalletEndpoint(),
    });
}

export function useTopUpWallet() {
    const queryClient = useQueryClient();
    return useMutation<WalletTopUp, Error, WalletTopUpInput>({
        mutationFn: (data: WalletTopUpInput) => topUpWalletEndpoint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: paymentKeys.wallet() });
        },
    });
}
