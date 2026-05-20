export type UUID = string;

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "suspended";

// Onboarding

export interface ClubOnboardInput {
    name: string;
    address?: string | null;
    currency?: string;
}

export interface OwnerInput {
    email: string;
    full_name: string;
    password: string;
}

export interface TenantOnboardInput {
    name: string;
    subdomain: string;
    plan_id: UUID;
    subscription_start_date?: string | null;
    clubs: ClubOnboardInput[];
    owner: OwnerInput;
}

export interface TenantOnboardResult {
    tenant_id: UUID;
    club_ids: UUID[];
    owner_id: UUID;
}

// Subscription Plans

export interface Plan {
    id: UUID;
    name: string;
    max_clubs: number;
    max_courts_per_club: number;
    max_staff_users: number;
    open_games_feature: boolean;
    waitlist_feature: boolean;
    white_label_enabled: boolean;
    analytics_enabled: boolean;
    price_per_month: number;
    setup_fee: number;
    trial_days: number;
    booking_fee_pct: number | null;
    revenue_share_pct: number | null;
    third_party_revenue_share_pct: number | null;
    overage_fee_per_booking: number | null;
    max_api_calls_per_month: number | null;
    stripe_price_id: string | null;
}

export interface PlanInput {
    name: string;
    max_clubs: number;
    max_courts_per_club: number;
    max_staff_users?: number;
    open_games_feature?: boolean;
    waitlist_feature?: boolean;
    white_label_enabled?: boolean;
    analytics_enabled?: boolean;
    price_per_month: number;
    setup_fee?: number;
    trial_days?: number;
    booking_fee_pct?: number | null;
    revenue_share_pct?: number | null;
    third_party_revenue_share_pct?: number | null;
    overage_fee_per_booking?: number | null;
    max_api_calls_per_month?: number | null;
    stripe_price_id?: string | null;
}

export interface PlanUpdateInput {
    name?: string | null;
    max_clubs?: number | null;
    max_courts_per_club?: number | null;
    max_staff_users?: number | null;
    open_games_feature?: boolean | null;
    waitlist_feature?: boolean | null;
    white_label_enabled?: boolean | null;
    analytics_enabled?: boolean | null;
    price_per_month?: number | null;
    setup_fee?: number | null;
    trial_days?: number | null;
    booking_fee_pct?: number | null;
    revenue_share_pct?: number | null;
    third_party_revenue_share_pct?: number | null;
    overage_fee_per_booking?: number | null;
    max_api_calls_per_month?: number | null;
    stripe_price_id?: string | null;
}

// Tenants

export interface TenantSummary {
    id: UUID;
    name: string;
    subdomain: string;
    custom_domain: string | null;
    plan_id: UUID;
    plan_name: string;
    is_active: boolean;
    subscription_status: SubscriptionStatus | null;
    subscription_start_date: string | null;
    club_count: number;
    created_at: string;
}

export interface TenantDetail {
    id: UUID;
    name: string;
    subdomain: string;
    custom_domain: string | null;
    plan_id: UUID;
    plan_name: string;
    is_active: boolean;
    subscription_start_date: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    subscription_status: SubscriptionStatus | null;
    club_count: number;
    owner_email: string | null;
    owner_full_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface TenantUpdateInput {
    name?: string | null;
    subdomain?: string | null;
    custom_domain?: string | null;
    is_active?: boolean | null;
    subscription_start_date?: string | null;
    owner_email?: string | null;
    owner_full_name?: string | null;
}

export interface TenantActivateInput {
    billing_email?: string | null;
}

export interface TenantChangePlanInput {
    plan_id: UUID;
}
