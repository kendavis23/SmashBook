import type { UUID } from "../common";
export type { UUID };

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "suspended";

export interface PlanLimits {
    max_clubs: number;
    max_courts_per_club: number;
    max_staff_users: number;
}

export interface UsageCounts {
    clubs_used: number;
    courts_used: number;
    staff_used: number;
}

export interface PlanFeatures {
    open_games: boolean;
    waitlist: boolean;
    white_label: boolean;
    analytics: boolean;
}

export interface SubscriptionView {
    plan_id: UUID;
    plan_name: string;
    /** Python Decimal serialises as a string in JSON — use Number() before arithmetic. */
    price_per_month: number | string;
    limits: PlanLimits;
    usage: UsageCounts;
    features: PlanFeatures;
    is_active: boolean;
    subscription_status: SubscriptionStatus | null;
    subscription_start_date: string | null;
    current_period_end: string | null;
    has_payment_method: boolean;
}

export interface InvoiceItem {
    id: string;
    number: string | null;
    status: string | null;
    amount_due: number;
    amount_paid: number;
    currency: string;
    created: string;
    period_start: string | null;
    period_end: string | null;
    hosted_invoice_url: string | null;
    invoice_pdf: string | null;
}

export interface InvoiceList {
    invoices: InvoiceItem[];
}

export interface SetupIntentResponse {
    setup_intent_id: string;
    client_secret: string;
}

export interface UpdatePaymentMethodRequest {
    payment_method_id: string;
}

export interface UpdatePaymentMethodResponse {
    default_payment_method_id: string;
}
