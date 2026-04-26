type UUID = string;

export type SurfaceType = "indoor" | "outdoor" | "crystal" | "artificial_grass";

export interface CourtListParams {
    club_id?: string;
    surface_type?: SurfaceType;
    date?: string;
    time_from?: string;
    time_to?: string;
}

export interface CourtResponse {
    id: UUID;
    club_id: UUID;
    name: string;
    surface_type: SurfaceType;
    has_lighting: boolean;
    lighting_surcharge: number | null;
    is_active: boolean;
}

export interface TimeSlot {
    start_time: string;
    end_time: string;
    is_available: boolean;
    price: number | null;
    price_label: string | null;
}

export interface CourtAvailabilityResponse {
    court_id: UUID;
    date: string;
    slots: TimeSlot[];
}
