export type {
    ClubAvailability,
    ClubAvailabilityCourt,
    ClubAvailabilitySlot,
    ClubAvailabilitySlotCourt,
    ClubAvailabilityExistingMatch,
    SurfaceType,
} from "@repo/player-domain/models";

export const SURFACE_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: "Any" },
    { value: "indoor", label: "Indoor" },
    { value: "outdoor", label: "Outdoor" },
    { value: "crystal", label: "Crystal" },
    { value: "artificial_grass", label: "Artificial Grass" },
];
