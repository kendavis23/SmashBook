// Domain models for the club context.
// These are the ONLY data structures apps and features should reference.
// DTO types are internal to @repo/api-client and must never be imported outside it.

export type UUID = string;

export interface Club {
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

export interface ClubSettings {
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

// Input models — used when creating or updating a club/settings

export interface ClubInput {
    name: string;
    address?: string;
    currency?: string;
}

export interface ClubUpdateInput {
    name?: string;
    address?: string;
    currency?: string;
}

export interface ClubSettingsInput {
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

export interface OperatingHours {
    day_of_week: number; // 0 = Monday … 6 = Sunday
    open_time: string; // "HH:MM"
    close_time: string; // "HH:MM"
    valid_from?: string; // ISO date
    valid_until?: string; // ISO date
}

export interface PricingRule {
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
    /** Stored as datetime-local string ("YYYY-MM-DDTHH:mm") after mapping from ISO. */
    incentive_expires_at?: string;
}

export interface StripeConnectInput {
    return_url: string;
    refresh_url: string;
}

export interface StripeConnectResult {
    onboarding_url: string;
}
