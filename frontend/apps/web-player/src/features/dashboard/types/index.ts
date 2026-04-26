export type {
    BookingInput,
    BookingType,
    Court,
    CourtAvailability,
    OpenGame,
    OpenGameFilters,
    SurfaceType,
    TimeSlot,
} from "@repo/player-domain/models";

export type ClubOption = {
    id: string;
    name: string;
    role: string;
};

export type BookingModalState = {
    courtId: string;
    courtName: string;
    date: string;
    startTime: string;
} | null;
