export type UUID = string;

export type BillingPeriod = "monthly" | "annual";

export type MembershipStatus = "trialing" | "active" | "paused" | "cancelled" | "expired";

export type CreditType = "booking_credit" | "guest_pass";

export interface MembershipPlan {
    id: UUID;
    club_id: UUID;
    name: string;
    description: string | null;
    billing_period: BillingPeriod;
    price: number;
    trial_days: number;
    booking_credits_per_period: number | null;
    guest_passes_per_period: number | null;
    discount_pct: number | null;
    priority_booking_days: number | null;
    max_active_members: number | null;
    is_active: boolean;
    stripe_price_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface MembershipPlanInput {
    club_id: UUID;
    name: string;
    description?: string | null;
    billing_period: BillingPeriod;
    price: number;
    trial_days?: number;
    booking_credits_per_period?: number | null;
    guest_passes_per_period?: number | null;
    discount_pct?: number | null;
    priority_booking_days?: number | null;
    max_active_members?: number | null;
    is_active?: boolean;
    stripe_price_id?: string | null;
}

export interface MembershipPlanUpdateInput {
    name?: string;
    description?: string | null;
    billing_period?: BillingPeriod;
    price?: number;
    trial_days?: number;
    booking_credits_per_period?: number | null;
    guest_passes_per_period?: number | null;
    discount_pct?: number | null;
    priority_booking_days?: number | null;
    max_active_members?: number | null;
    is_active?: boolean;
    stripe_price_id?: string | null;
}
