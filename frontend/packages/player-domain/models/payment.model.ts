export type UUID = string;

export interface SetupIntent {
    client_secret: string;
    setup_intent_id: string;
}

export interface SavePaymentMethodInput {
    payment_method_id: string;
    set_as_default?: boolean;
}

export interface PaymentMethod {
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    is_default: boolean;
}

export interface PaymentIntentInput {
    booking_id: UUID;
    payment_method_id?: string | null;
}

export interface PaymentIntent {
    client_secret: string;
    payment_intent_id: string;
    amount: number;
    currency: string;
}

export interface WalletTransaction {
    id: UUID;
    transaction_type: string;
    amount: number;
    balance_after: number;
    reference: string | null;
    notes: string | null;
    created_at: string;
}

export interface Wallet {
    balance: number;
    currency: string;
    auto_topup_enabled: boolean;
    auto_topup_threshold: number | null;
    auto_topup_amount: number | null;
    transactions: WalletTransaction[];
}

export interface WalletTopUpInput {
    amount_pence: number;
    payment_method_id?: string | null;
}

export interface WalletTopUp {
    client_secret: string;
    payment_intent_id: string;
    amount: number;
    currency: string;
}
