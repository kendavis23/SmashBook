export type { Plan, PlanInput, PlanUpdateInput } from "@repo/admin-domain/models";

export interface PlanFormState {
    name: string;
    max_clubs: string;
    max_courts_per_club: string;
    max_staff_users: string;
    open_games_feature: boolean;
    waitlist_feature: boolean;
    white_label_enabled: boolean;
    analytics_enabled: boolean;
    price_per_month: string;
    setup_fee: string;
    trial_days: string;
    booking_fee_pct: string;
    revenue_share_pct: string;
    third_party_revenue_share_pct: string;
    overage_fee_per_booking: string;
    max_api_calls_per_month: string;
    stripe_price_id: string;
}

export const DEFAULT_PLAN_FORM: PlanFormState = {
    name: "",
    max_clubs: "1",
    max_courts_per_club: "4",
    max_staff_users: "5",
    open_games_feature: false,
    waitlist_feature: false,
    white_label_enabled: false,
    analytics_enabled: false,
    price_per_month: "0",
    setup_fee: "0",
    trial_days: "0",
    booking_fee_pct: "",
    revenue_share_pct: "",
    third_party_revenue_share_pct: "",
    overage_fee_per_booking: "",
    max_api_calls_per_month: "",
    stripe_price_id: "",
};
