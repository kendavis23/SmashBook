import { fetcher } from "../../../core/fetcher";
import type {
    InvoiceList,
    SetupIntentResponse,
    SubscriptionView,
    UpdatePaymentMethodRequest,
    UpdatePaymentMethodResponse,
} from "./subscription.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

// GET /subscription
export function getSubscriptionEndpoint(): Promise<SubscriptionView> {
    return fetcher<SubscriptionView>("/api/v1/subscription");
}

// GET /subscription/invoices
export function listInvoicesEndpoint(): Promise<InvoiceList> {
    return fetcher<InvoiceList>("/api/v1/subscription/invoices");
}

// POST /subscription/setup-intent
export function createSetupIntentEndpoint(): Promise<SetupIntentResponse> {
    return fetcher<SetupIntentResponse>("/api/v1/subscription/setup-intent", {
        method: "POST",
        headers: JSON_HEADERS,
    });
}

// PUT /subscription/payment-method
export function updatePaymentMethodEndpoint(
    data: UpdatePaymentMethodRequest
): Promise<UpdatePaymentMethodResponse> {
    return fetcher<UpdatePaymentMethodResponse>("/api/v1/subscription/payment-method", {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
