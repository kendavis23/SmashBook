export type UUID = string;

export type SurfaceType = "clay" | "grass" | "hard" | "artificial_grass";

export interface ClubAvailabilityCourt {
    id: UUID;
    name: string;
    surface_type: SurfaceType;
    has_lighting: boolean;
    lighting_surcharge: number | null;
}

export interface ClubAvailabilitySlotCourt {
    court_id: UUID;
    price: number | null;
    price_label: string | null;
}

export interface ClubAvailabilityExistingMatch {
    booking_id: UUID;
    court_id: UUID;
    slots_available: number;
    min_skill_level: number | null;
    max_skill_level: number | null;
    total_price: number | null;
}

export interface ClubAvailabilitySlot {
    start_time: string;
    end_time: string;
    available_count: number;
    available_courts: ClubAvailabilitySlotCourt[];
    existing_matches: ClubAvailabilityExistingMatch[];
}

export interface ClubAvailabilityDay {
    date: string;
    slots: ClubAvailabilitySlot[];
}

export interface ClubAvailabilityCursor {
    date: string;
    from_time: string;
}

export interface ClubAvailability {
    club_id: UUID;
    courts: ClubAvailabilityCourt[];
    days: ClubAvailabilityDay[];
    next_cursor: ClubAvailabilityCursor | null;
}

export interface ClubAvailabilityParams {
    start_date: string;
    end_date?: string;
    surface?: SurfaceType;
    from_time?: string;
    to_time?: string;
    skill_level?: number;
}
