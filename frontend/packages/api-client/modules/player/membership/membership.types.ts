export type { UUID } from "../../staff/common";

export type {
    BillingPeriod,
    MembershipPlanResponse,
} from "../../share/membership/membership.types";
import type { MembershipPlanResponse } from "../../share/membership/membership.types";

export type MembershipStatus = "trialing" | "active" | "paused" | "cancelled" | "expired";

export interface MembershipSubscriptionResponse {
    id: string;
    user_id: string;
    club_id: string;
    status: MembershipStatus;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    cancelled_at: string | null;
    credits_remaining: number;
    guest_passes_remaining: number | null;
    plan: MembershipPlanResponse;
}

export interface MembershipSubscribeRequest {
    plan_id: string;
    payment_method_id?: string | null;
}

export interface MembershipSubscribeResponse {
    subscription_id: string;
    stripe_subscription_id: string;
    status: MembershipStatus;
    current_period_start: string;
    current_period_end: string;
    credits_remaining: number;
    guest_passes_remaining: number | null;
    client_secret: string | null;
}
