import { fetcher } from "../../../core/fetcher";
import type {
    PaymentIntentRequest,
    PaymentIntentResponse,
    PaymentMethodResponse,
    SavePaymentMethodRequest,
    SetupIntentResponse,
    WalletResponse,
    WalletTopUpRequest,
    WalletTopUpResponse,
} from "./payment.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function createPaymentIntentEndpoint(
    data: PaymentIntentRequest
): Promise<PaymentIntentResponse> {
    return fetcher<PaymentIntentResponse>("/api/v1/payments/payment-intent", {
        method: "POST",
        cache: "no-store",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function createSetupIntentEndpoint(): Promise<SetupIntentResponse> {
    return fetcher<SetupIntentResponse>("/api/v1/payments/setup-intent", {
        method: "POST",
        cache: "no-store",
    });
}

export function savePaymentMethodEndpoint(
    data: SavePaymentMethodRequest
): Promise<PaymentMethodResponse> {
    return fetcher<PaymentMethodResponse>("/api/v1/payments/payment-methods", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function listPaymentMethodsEndpoint(): Promise<PaymentMethodResponse[]> {
    return fetcher<PaymentMethodResponse[]>("/api/v1/payments/payment-methods", {
        cache: "no-store",
    });
}

export function deletePaymentMethodEndpoint(methodId: string): Promise<void> {
    return fetcher<void>(`/api/v1/payments/payment-methods/${methodId}`, {
        method: "DELETE",
    });
}

export function setDefaultPaymentMethodEndpoint(methodId: string): Promise<PaymentMethodResponse> {
    return fetcher<PaymentMethodResponse>(`/api/v1/payments/payment-methods/${methodId}/default`, {
        method: "PATCH",
    });
}

export function getWalletEndpoint(): Promise<WalletResponse> {
    return fetcher<WalletResponse>("/api/v1/payments/wallet");
}

export function topUpWalletEndpoint(data: WalletTopUpRequest): Promise<WalletTopUpResponse> {
    return fetcher<WalletTopUpResponse>("/api/v1/payments/wallet/top-up", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
