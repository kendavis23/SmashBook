export type UUID = string;

export type BillingPeriod = "monthly" | "annual";

export type MembershipStatus = "trialing" | "active" | "paused" | "cancelled" | "expired";

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

export interface MembershipSubscription {
    id: UUID;
    user_id: UUID;
    club_id: UUID;
    status: MembershipStatus;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    cancelled_at: string | null;
    credits_remaining: number;
    guest_passes_remaining: number | null;
    pending_plan_id: UUID | null;
    plan: MembershipPlan;
}

export interface MembershipSubscribeInput {
    plan_id: UUID;
    payment_method_id?: string | null;
}

export interface MembershipUpgradeInput {
    plan_id: UUID;
    payment_method_id?: string | null;
}

export interface MembershipDowngradeInput {
    plan_id: UUID;
}

export interface MembershipSubscribeResult {
    subscription_id: UUID;
    stripe_subscription_id: string;
    status: MembershipStatus;
    current_period_start: string;
    current_period_end: string;
    credits_remaining: number;
    guest_passes_remaining: number | null;
    /** Present for non-trial plans — must be confirmed with Stripe.js */
    client_secret: string | null;
}
