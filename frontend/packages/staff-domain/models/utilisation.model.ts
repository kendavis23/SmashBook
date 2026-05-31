export type UUID = string;

export interface DailyUtilisationPoint {
    snapshot_date: string;
    total_slots: number;
    booked_slots: number;
    utilisation_pct: number | string;
    revenue_actual: number | string;
    revenue_potential: number | string;
}

export interface ClubDailyUtilisation {
    club_id: UUID;
    date_from: string;
    date_to: string;
    points: DailyUtilisationPoint[];
}

export interface CourtUtilisationSummary {
    court_id: UUID;
    court_name: string;
    total_slots: number;
    booked_slots: number;
    utilisation_pct: number;
    revenue_actual: number;
    revenue_potential: number;
}

export interface ClubCourtsUtilisation {
    club_id: UUID;
    date_from: string;
    date_to: string;
    courts: CourtUtilisationSummary[];
}

export interface HeatmapCell {
    day_of_week: number; // 0 = Monday … 6 = Sunday
    hour_of_day: number; // 0–23
    avg_utilisation_pct: number;
    total_slots: number;
    booked_slots: number;
}

export interface ClubUtilisationHeatmap {
    club_id: UUID;
    date_from: string;
    date_to: string;
    cells: HeatmapCell[];
}

export interface UtilisationDateRange {
    dateFrom?: string;
    dateTo?: string;
}
