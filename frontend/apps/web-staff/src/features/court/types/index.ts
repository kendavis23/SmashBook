export type {
    Court,
    CourtInput,
    CourtUpdateInput,
    SurfaceType,
    CourtAvailability,
    TimeSlot,
} from "@repo/staff-domain/models";

export const SURFACE_TYPE_LABELS: Record<string, string> = {
    indoor: "Indoor",
    outdoor: "Outdoor",
    crystal: "Crystal",
    artificial_grass: "Artificial Grass",
};

export interface AvailabilityFilters {
    search: string;
    surfaceType: string;
    date: string;
    timeFrom: string;
    timeTo: string;
}

export const SURFACE_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: "All surfaces" },
    { value: "indoor", label: "Indoor" },
    { value: "outdoor", label: "Outdoor" },
    { value: "crystal", label: "Crystal" },
    { value: "artificial_grass", label: "Artificial Grass" },
];
