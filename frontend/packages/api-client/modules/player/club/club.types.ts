import type { UUID } from "../common";
export type { UUID };

export type SurfaceType = "clay" | "grass" | "hard" | "artificial_grass";

export interface AvailabilityCourt {
    id: UUID;
    name: string;
    surface_type: SurfaceType;
    has_lighting: boolean;
    lighting_surcharge: number | null;
}

export interface AvailabilitySlotCourt {
    court_id: UUID;
    price: number | null;
    price_label: string | null;
}

export interface AvailabilityExistingMatch {
    booking_id: UUID;
    court_id: UUID;
    slots_available: number;
    min_skill_level: number | null;
    max_skill_level: number | null;
    total_price: number | null;
}

export interface AvailabilitySlot {
    start_time: string;
    end_time: string;
    available_count: number;
    available_courts: AvailabilitySlotCourt[];
    existing_matches: AvailabilityExistingMatch[];
}

export interface AvailabilityDay {
    date: string;
    slots: AvailabilitySlot[];
}

export interface AvailabilityCursor {
    date: string;
    from_time: string;
}

export interface ClubAvailabilityResponse {
    club_id: UUID;
    courts: AvailabilityCourt[];
    days: AvailabilityDay[];
    next_cursor: AvailabilityCursor | null;
}

export interface GetClubAvailabilityParams {
    start_date: string;
    end_date?: string;
    surface?: SurfaceType;
    from_time?: string;
    to_time?: string;
}
