export type UUID = string;

export interface ClubCreate {
    name: string;
    address?: string;
    currency?: string;
}
export interface ClubUpdate {
    name?: string;
    address?: string;
    currency?: string;
}

export interface ClubResponse {
    id: UUID;
    tenant_id: UUID;
    name: string;
    address: string | null;
    currency: string;
    booking_duration_minutes: number;
    max_advance_booking_days: number;
    min_booking_notice_hours: number;
    max_bookings_per_player_per_week: number | null;
    skill_level_min: number;
    skill_level_max: number;
    skill_range_allowed: number;
    open_games_enabled: boolean;
    min_players_to_confirm: number;
    auto_cancel_hours_before: number | null;
    cancellation_notice_hours: number;
    cancellation_refund_pct: number;
    reminder_hours_before: number;
    waitlist_enabled: boolean;
}

export interface ClubSettingsResponse {
    booking_duration_minutes: number;
    max_advance_booking_days: number;
    min_booking_notice_hours: number;
    max_bookings_per_player_per_week: number | null;
    skill_level_min: number;
    skill_level_max: number;
    skill_range_allowed: number;
    open_games_enabled: boolean;
    min_players_to_confirm: number;
    auto_cancel_hours_before: number | null;
    cancellation_notice_hours: number;
    cancellation_refund_pct: number;
    reminder_hours_before: number;
    waitlist_enabled: boolean;
}

export interface ClubSettingsUpdate {
    booking_duration_minutes?: number;
    max_advance_booking_days?: number;
    min_booking_notice_hours?: number;
    max_bookings_per_player_per_week?: number;
    skill_level_min?: number;
    skill_level_max?: number;
    skill_range_allowed?: number;
    open_games_enabled?: boolean;
    min_players_to_confirm?: number;
    auto_cancel_hours_before?: number;
    cancellation_notice_hours?: number;
    cancellation_refund_pct?: number;
    reminder_hours_before?: number;
    waitlist_enabled?: boolean;
}

export interface OperatingHoursEntry {
    day_of_week: number;
    open_time: string;
    close_time: string;
    valid_from?: string;
    valid_until?: string;
}

export interface PricingRuleEntry {
    label: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    valid_from?: string;
    valid_until?: string;
    is_active?: boolean;
    price_per_slot: number;
    surge_trigger_pct?: number;
    surge_max_pct?: number;
    low_demand_trigger_pct?: number;
    low_demand_min_pct?: number;
    incentive_price?: number;
    incentive_label?: string;
    incentive_expires_at?: string;
}

export interface StripeConnectRequest {
    return_url: string;
    refresh_url: string;
}
export interface StripeConnectResponse {
    onboarding_url: string;
}
