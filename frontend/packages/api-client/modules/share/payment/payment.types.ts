import type { UUID } from "../../staff/common";

export interface SetupIntentResponse {
    client_secret: string;
    setup_intent_id: string;
}

export interface SavePaymentMethodRequest {
    payment_method_id: string;
    set_as_default?: boolean;
}

export interface PaymentMethodResponse {
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    is_default: boolean;
}

export interface PaymentIntentRequest {
    booking_id: UUID;
    payment_method_id?: string | null;
}

export interface PaymentIntentResponse {
    client_secret: string;
    payment_intent_id: string;
    amount: number;
    currency: string;
}

export interface WalletTransactionResponse {
    id: UUID;
    transaction_type: string;
    amount: number;
    balance_after: number;
    reference: string | null;
    notes: string | null;
    created_at: string;
}

export interface WalletResponse {
    balance: number;
    currency: string;
    auto_topup_enabled: boolean;
    auto_topup_threshold: number | null;
    auto_topup_amount: number | null;
    transactions: WalletTransactionResponse[];
}

export interface WalletTopUpRequest {
    amount_pence: number;
    payment_method_id?: string | null;
}

export interface WalletTopUpResponse {
    client_secret: string;
    payment_intent_id: string;
    amount: number;
    currency: string;
}
