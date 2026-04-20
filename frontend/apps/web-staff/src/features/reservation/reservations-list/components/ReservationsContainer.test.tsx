import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReservationsContainer from "./ReservationsContainer";

vi.mock("../../hooks", () => ({
    useListCourts: vi.fn(),
    useListCalendarReservations: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
    canManageReservation: vi.fn((role: string) => ["owner", "admin", "ops_lead"].includes(role)),
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => vi.fn(),
    useSearch: () => ({}),
}));

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
    TimeInput: ({
        className,
        ...props
    }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
        <input type="time" className={className} {...props} />
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

import { useListCourts, useListCalendarReservations } from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseListCourts = useListCourts as ReturnType<typeof vi.fn>;
const mockUseList = useListCalendarReservations as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

const mockReservations = [
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
];

function setupMocks(
    listOverride: { data?: typeof mockReservations; isLoading?: boolean; error?: Error | null } = {}
) {
    mockUseListCourts.mockReturnValue({ data: [] });
    const allData = listOverride.data ?? mockReservations;
    mockUseList.mockImplementation(
        (_clubId: string, filters: { reservationType?: string } = {}) => ({
            data: filters.reservationType
                ? allData.filter((r) => r.reservation_type === filters.reservationType)
                : allData,
            isLoading: listOverride.isLoading ?? false,
            error: listOverride.error ?? null,
            refetch: vi.fn(),
        })
    );
    mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
}

describe("ReservationsContainer — loading state", () => {
    it("renders loading indicator", () => {
        mockUseListCourts.mockReturnValue({ data: [] });
        mockUseList.mockReturnValue({ data: [], isLoading: true, error: null, refetch: vi.fn() });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
        render(<ReservationsContainer />);
        expect(screen.getByText("Loading reservations…")).toBeInTheDocument();
    });
});

describe("ReservationsContainer — error state", () => {
    it("renders error message", () => {
        mockUseListCourts.mockReturnValue({ data: [] });
        mockUseList.mockReturnValue({
            data: [],
            isLoading: false,
            error: new Error("Server error"),
            refetch: vi.fn(),
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
        render(<ReservationsContainer />);
        expect(screen.getByText("Server error")).toBeInTheDocument();
    });
});

describe("ReservationsContainer — reservation list", () => {
    it("renders all reservations", () => {
        setupMocks();
        render(<ReservationsContainer />);
        expect(screen.getByText("Morning Training")).toBeInTheDocument();
    });

    it("filters by reservation type when Search is clicked", () => {
        setupMocks({
            data: [
                ...mockReservations,
                {
                    ...mockReservations[0],
                    id: "res-2",
                    reservation_type: "maintenance",
                    title: "Maintenance Block",
                } as (typeof mockReservations)[0],
            ],
        });
        render(<ReservationsContainer />);

        fireEvent.change(screen.getByLabelText("Filter by reservation type"), {
            target: { value: "maintenance" },
        });
        fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

        expect(screen.queryByText("Morning Training")).not.toBeInTheDocument();
        expect(screen.getByText("Maintenance Block")).toBeInTheDocument();
    });
});

describe("ReservationsContainer — access control", () => {
    it("does not show Add Reservation for non-admin roles", () => {
        mockUseListCourts.mockReturnValue({ data: [] });
        mockUseList.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "staff" });
        render(<ReservationsContainer />);
        expect(screen.queryByRole("button", { name: /add reservation/i })).not.toBeInTheDocument();
    });
});
