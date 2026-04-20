import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReservationsView from "./ReservationsView";
import type { CalendarReservation, Court, ReservationFilters } from "../../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    formatUTCDateTime: (iso: string) => iso,
    formatUTCDate: (iso: string) => iso,
    formatUTCTime: (iso: string) => iso,
    datetimeLocalToUTC: (v: string) => v,
    DateTimePicker: ({
        value,
        onChange,
        className,
    }: {
        value: string;
        onChange: (v: string) => void;
        className?: string;
    }) => (
        <input
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={className}
        />
    ),
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
        clearLabel,
        "aria-label": ariaLabel,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
        placeholder?: string;
        clearLabel?: string;
        "aria-label"?: string;
    }) => (
        <select
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={ariaLabel ?? placeholder ?? "select"}
        >
            {clearLabel !== undefined && <option value="">{clearLabel}</option>}
            {(options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

const defaultFilters: ReservationFilters = {
    reservationType: "",
    courtId: "",
    fromDt: "",
    toDt: "",
};

const mockReservations: CalendarReservation[] = [
    {
        id: "res-1",
        club_id: "club-1",
        court_id: "court-1",
        reservation_type: "training_block",
        title: "Morning Training",
        start_datetime: "2026-04-11T08:00:00.000Z",
        end_datetime: "2026-04-11T10:00:00.000Z",
        allowed_booking_types: null,
        is_recurring: false,
        recurrence_rule: null,
        recurrence_end_date: null,
        created_by: "user-1",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
    },
    {
        id: "res-2",
        club_id: "club-1",
        court_id: null,
        reservation_type: "maintenance",
        title: "Weekly Maintenance",
        start_datetime: "2026-04-12T06:00:00.000Z",
        end_datetime: "2026-04-12T08:00:00.000Z",
        allowed_booking_types: null,
        is_recurring: true,
        recurrence_rule: "FREQ=WEEKLY;BYDAY=SU",
        recurrence_end_date: "2026-12-31",
        created_by: "user-1",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
    },
];

const mockCourts: Court[] = [
    {
        id: "court-1",
        club_id: "club-1",
        name: "Court A",
        surface_type: "indoor",
        has_lighting: false,
        lighting_surcharge: null,
        is_active: true,
    },
];

const mockCourtNameMap: Record<string, string> = { "court-1": "Court A" };

const defaultProps = {
    reservations: mockReservations,
    isLoading: false,
    error: null,
    canCreate: true,
    filters: defaultFilters,
    courts: mockCourts,
    courtNameMap: mockCourtNameMap,
    onFiltersChange: vi.fn(),
    onSearch: vi.fn(),
    onCreateClick: vi.fn(),
    onManageClick: vi.fn(),
    onRefresh: vi.fn(),
};

describe("ReservationsView — loading state", () => {
    it("shows loading spinner", () => {
        render(<ReservationsView {...defaultProps} reservations={[]} isLoading={true} />);
        expect(screen.getByText("Loading reservations…")).toBeInTheDocument();
    });
});

describe("ReservationsView — error state", () => {
    it("renders error message", () => {
        render(
            <ReservationsView
                {...defaultProps}
                reservations={[]}
                error={new Error("Failed to load")}
            />
        );
        expect(screen.getByText("Failed to load")).toBeInTheDocument();
    });
});

describe("ReservationsView — empty state", () => {
    it("shows empty message and Add Reservation CTA when canCreate", () => {
        render(<ReservationsView {...defaultProps} reservations={[]} />);
        expect(screen.getByText("No reservations")).toBeInTheDocument();
        const addButtons = screen.getAllByRole("button", { name: /add reservation/i });
        expect(addButtons.length).toBeGreaterThan(0);
    });

    it("does not show Add Reservation CTA when canCreate is false", () => {
        render(<ReservationsView {...defaultProps} reservations={[]} canCreate={false} />);
        expect(screen.queryByRole("button", { name: /add reservation/i })).not.toBeInTheDocument();
    });
});

describe("ReservationsView — reservation list", () => {
    it("renders all reservation titles", () => {
        render(<ReservationsView {...defaultProps} />);
        expect(screen.getByText("Morning Training")).toBeInTheDocument();
        expect(screen.getByText("Weekly Maintenance")).toBeInTheDocument();
    });

    it("shows Recurring badge for recurring reservations", () => {
        render(<ReservationsView {...defaultProps} />);
        expect(screen.getByText("Recurring")).toBeInTheDocument();
    });

    it("shows type badge labels", () => {
        render(<ReservationsView {...defaultProps} />);
        expect(screen.getAllByText("Training Block").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Maintenance").length).toBeGreaterThan(0);
    });

    it("shows court name from courtNameMap when court_id is present", () => {
        render(<ReservationsView {...defaultProps} />);
        expect(screen.getAllByText("Court A").length).toBeGreaterThan(0);
    });

    it("shows 'All courts' text when court_id is null", () => {
        render(<ReservationsView {...defaultProps} />);
        expect(screen.getAllByText("All courts").length).toBeGreaterThan(0);
    });
});

describe("ReservationsView — user events", () => {
    it("calls onCreateClick when Add Reservation header button is clicked", () => {
        const onCreateClick = vi.fn();
        render(<ReservationsView {...defaultProps} onCreateClick={onCreateClick} />);
        fireEvent.click(screen.getByRole("button", { name: /add reservation/i }));
        expect(onCreateClick).toHaveBeenCalledOnce();
    });

    it("calls onRefresh when Refresh is clicked", () => {
        const onRefresh = vi.fn();
        render(<ReservationsView {...defaultProps} onRefresh={onRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: /refresh reservations/i }));
        expect(onRefresh).toHaveBeenCalledOnce();
    });

    it("calls onSearch when Search button is clicked", () => {
        const onSearch = vi.fn();
        render(<ReservationsView {...defaultProps} onSearch={onSearch} />);
        fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));
        expect(onSearch).toHaveBeenCalledOnce();
    });

    it("calls onManageClick with correct reservation id when Manage is clicked", () => {
        const onManageClick = vi.fn();
        render(<ReservationsView {...defaultProps} onManageClick={onManageClick} />);
        fireEvent.click(screen.getByLabelText("Manage Morning Training"));
        expect(onManageClick).toHaveBeenCalledWith("res-1");
    });

    it("calls onFiltersChange when reservation type select changes", () => {
        const onFiltersChange = vi.fn();
        render(<ReservationsView {...defaultProps} onFiltersChange={onFiltersChange} />);
        fireEvent.change(screen.getByLabelText("Filter by reservation type"), {
            target: { value: "maintenance" },
        });
        expect(onFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            reservationType: "maintenance",
        });
    });

    it("calls onFiltersChange when court select changes", () => {
        const onFiltersChange = vi.fn();
        render(<ReservationsView {...defaultProps} onFiltersChange={onFiltersChange} />);
        fireEvent.change(screen.getByLabelText("Filter by court"), {
            target: { value: "court-1" },
        });
        expect(onFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            courtId: "court-1",
        });
    });
});
