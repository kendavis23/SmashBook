export type {
    ClubAvailability,
    ClubAvailabilityCourt,
    ClubAvailabilitySlot,
} from "@repo/player-domain";

export const SURFACE_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: "Any" },
    { value: "indoor", label: "Indoor" },
    { value: "outdoor", label: "Outdoor" },
    { value: "crystal", label: "Crystal" },
    { value: "artificial_grass", label: "Grass" },
];
