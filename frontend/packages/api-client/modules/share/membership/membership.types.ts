import type { UUID } from "../booking/booking.types";

export type BillingPeriod = "monthly" | "annual";

export interface MembershipPlanResponse {
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
