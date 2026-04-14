export type {
    Court,
    CalendarReservation,
    CalendarReservationInput,
    CalendarReservationUpdateInput,
    CalendarReservationType,
} from "@repo/staff-domain/models";

export interface ReservationFilters {
    reservationType: string;
    courtId: string;
    fromDt: string;
    toDt: string;
}

export const RESERVATION_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: "All types" },
    { value: "skill_filter", label: "Skill Filter" },
    { value: "training_block", label: "Training Block" },
    { value: "private_hire", label: "Private Hire" },
    { value: "maintenance", label: "Maintenance" },
    { value: "tournament_hold", label: "Tournament Hold" },
];

export const RESERVATION_TYPE_LABELS: Record<string, string> = {
    skill_filter: "Skill Filter",
    training_block: "Training Block",
    private_hire: "Private Hire",
    maintenance: "Maintenance",
    tournament_hold: "Tournament Hold",
};

export const RESERVATION_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    skill_filter: { bg: "bg-info/15", text: "text-info" },
    training_block: { bg: "bg-warning/15", text: "text-warning" },
    private_hire: { bg: "bg-success/15", text: "text-success" },
    maintenance: { bg: "bg-destructive/15", text: "text-destructive" },
    tournament_hold: { bg: "bg-secondary", text: "text-foreground" },
};
