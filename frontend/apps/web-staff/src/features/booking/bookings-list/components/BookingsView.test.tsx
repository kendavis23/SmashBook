import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookingsView from "./BookingsView";
import type { Booking, BookingsListFilters } from "../../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    DatePicker: ({
        value,
        onChange,
        placeholder,
    }: {
        value: string;
        onChange: (v: string) => void;
        placeholder?: string;
    }) => (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={placeholder ?? "Pick a date"}
        />
    ),
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
        clearLabel,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
        placeholder?: string;
        clearLabel?: string;
    }) => (
        <select
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={placeholder ?? "select"}
        >
            {clearLabel !== undefined && <option value="">{clearLabel}</option>}
            {(options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
    formatUTCDateTime: (iso: string) => iso,
    formatUTCDate: (iso: string) => iso,
    formatUTCTime: (iso: string) => iso,
    datetimeLocalToUTC: (v: string) => v,
    formatCurrency: (amount: number | null | undefined) =>
        amount == null ? "—" : `£${amount.toFixed(2)}`,
}));

const defaultFilters: BookingsListFilters = {
    dateFrom: "2026-04-11",
    dateTo: "",
    bookingType: "",
    bookingStatus: "",
    courtId: "",
    playerSearch: "",
};

const mockBooking: Booking = {
    id: "b-1",
    club_id: "club-1",
    court_id: "court-1",
    court_name: "Court A",
    booking_type: "regular",
    status: "confirmed",
    is_open_game: false,
    start_datetime: "2026-04-11T10:00:00Z",
    end_datetime: "2026-04-11T11:30:00Z",
    min_skill_level: null,
    max_skill_level: null,
    max_players: 4,
    slots_available: 2,
    total_price: 50,
    notes: null,
    event_name: null,
    players: [],
    created_at: "2026-04-10T08:00:00Z",
};

function renderView(overrides: Partial<Parameters<typeof BookingsView>[0]> = {}) {
    const props = {
        bookings: [],
        isLoading: false,
        error: null,
        canManage: true,
        filters: defaultFilters,
        courts: [],
        courtNameMap: {},
        onFiltersChange: vi.fn(),
        onSearch: vi.fn(),
        onRefresh: vi.fn(),
        onCreateClick: vi.fn(),
        onManageClick: vi.fn(),
        ...overrides,
    };
    return render(<BookingsView {...props} />);
}

describe("BookingsView — loading state", () => {
    it("shows loading spinner", () => {
        renderView({ isLoading: true });
        expect(screen.getByText("Loading bookings…")).toBeInTheDocument();
    });
});

describe("BookingsView — error state", () => {
    it("renders error message", () => {
        renderView({ error: new Error("Network failure") });
        expect(screen.getByText("Network failure")).toBeInTheDocument();
    });
});

describe("BookingsView — empty state", () => {
    it("renders empty message", () => {
        renderView();
        expect(screen.getByText("No bookings found")).toBeInTheDocument();
    });

    it("shows New Booking button when canManage is true", () => {
        renderView();
        expect(screen.getAllByText("New Booking").length).toBeGreaterThan(0);
    });

    it("hides New Booking button when canManage is false", () => {
        renderView({ canManage: false });
        expect(screen.queryByText("New Booking")).toBeNull();
    });
});

describe("BookingsView — booking list", () => {
    it("renders booking rows", () => {
        renderView({ bookings: [mockBooking] });
        expect(screen.getByText("Court A")).toBeInTheDocument();
        // "Regular" and "Confirmed" also appear in filter dropdowns — use getAllBy
        expect(screen.getAllByText("Regular").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Confirmed").length).toBeGreaterThan(0);
    });

    it("shows date and time columns instead of start and end columns", () => {
        renderView({ bookings: [mockBooking] });
        expect(screen.getByRole("button", { name: /Sort by Date/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Sort by Time/i })).toBeInTheDocument();
        expect(screen.queryByRole("columnheader", { name: "Start" })).toBeNull();
        expect(screen.queryByRole("columnheader", { name: "End" })).toBeNull();
        expect(screen.getByText("2026-04-11T10:00:00Z - 2026-04-11T11:30:00Z")).toBeInTheDocument();
    });

    function makeLaterBooking(): Booking {
        return {
            ...mockBooking,
            id: "b-2",
            court_id: "court-2",
            court_name: "Court B",
            start_datetime: "2026-04-12T09:00:00Z",
            end_datetime: "2026-04-12T10:30:00Z",
        };
    }

    it("sorts booking rows from compact sortable headers", () => {
        const laterBooking = makeLaterBooking();

        renderView({ bookings: [laterBooking, mockBooking] });

        let rows = screen.getAllByRole("row");
        expect(rows[1]).toHaveTextContent("Court B");
        expect(rows[2]).toHaveTextContent("Court A");

        fireEvent.click(screen.getByRole("button", { name: /Sort by Court ascending/i }));
        rows = screen.getAllByRole("row");
        expect(rows[1]).toHaveTextContent("Court A");
        expect(rows[2]).toHaveTextContent("Court B");

        fireEvent.click(screen.getByRole("button", { name: /Sort by Court descending/i }));
        rows = screen.getAllByRole("row");
        expect(rows[1]).toHaveTextContent("Court B");
        expect(rows[2]).toHaveTextContent("Court A");
    });

    it("clears sorting when fresh booking data arrives", () => {
        const laterBooking: Booking = {
            ...makeLaterBooking(),
            id: "b-3",
        };

        const { rerender } = renderView({ bookings: [mockBooking, laterBooking] });

        fireEvent.click(screen.getByRole("button", { name: /Sort by Court ascending/i }));
        let rows = screen.getAllByRole("row");
        expect(rows[1]).toHaveTextContent("Court A");
        expect(rows[2]).toHaveTextContent("Court B");

        rerender(
            <BookingsView
                bookings={[laterBooking, mockBooking]}
                isLoading={false}
                error={null}
                canManage
                filters={defaultFilters}
                courts={[]}
                courtNameMap={{}}
                onFiltersChange={vi.fn()}
                onSearch={vi.fn()}
                onRefresh={vi.fn()}
                onCreateClick={vi.fn()}
                onManageClick={vi.fn()}
            />
        );

        rows = screen.getAllByRole("row");
        expect(rows[1]).toHaveTextContent("Court B");
        expect(rows[2]).toHaveTextContent("Court A");
    });

    it("clears sorting immediately when refresh is clicked", () => {
        const laterBooking = makeLaterBooking();

        renderView({ bookings: [laterBooking, mockBooking] });

        fireEvent.click(screen.getByRole("button", { name: /Sort by Court ascending/i }));
        let rows = screen.getAllByRole("row");
        expect(rows[1]).toHaveTextContent("Court A");
        expect(rows[2]).toHaveTextContent("Court B");

        fireEvent.click(screen.getByRole("button", { name: "Refresh bookings" }));
        rows = screen.getAllByRole("row");
        expect(rows[1]).toHaveTextContent("Court B");
        expect(rows[2]).toHaveTextContent("Court A");
    });

    it("shows open game badge for open games", () => {
        renderView({ bookings: [{ ...mockBooking, is_open_game: true }] });
        expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("shows manage button for bookings when management is allowed", () => {
        renderView({ bookings: [mockBooking] });
        expect(
            screen.getByRole("button", { name: /Manage booking on Court A/i })
        ).toBeInTheDocument();
    });

    it("hides manage actions when management is not allowed", () => {
        renderView({ bookings: [mockBooking], canManage: false });
        expect(screen.queryByRole("button", { name: /Manage booking on Court A/i })).toBeNull();
    });
});

describe("BookingsView — manage flow", () => {
    it("calls onManageClick with correct id", () => {
        const handleManage = vi.fn();
        renderView({ bookings: [mockBooking], onManageClick: handleManage });
        fireEvent.click(screen.getByRole("button", { name: /Manage booking on Court A/i }));
        expect(handleManage).toHaveBeenCalledWith("b-1");
    });
});

describe("BookingsView — filter interactions", () => {
    it("calls onSearch when Search button is clicked", () => {
        const handleSearch = vi.fn();
        renderView({ onSearch: handleSearch });
        fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
        expect(handleSearch).toHaveBeenCalledTimes(1);
    });

    it("calls onRefresh when Refresh button is clicked", () => {
        const handleRefresh = vi.fn();
        renderView({ onRefresh: handleRefresh });
        fireEvent.click(screen.getByRole("button", { name: "Refresh bookings" }));
        expect(handleRefresh).toHaveBeenCalledTimes(1);
    });

    it("calls onCreateClick when New Booking header button is clicked", () => {
        const handleCreate = vi.fn();
        renderView({ bookings: [mockBooking], onCreateClick: handleCreate });
        fireEvent.click(screen.getByRole("button", { name: "New Booking" }));
        expect(handleCreate).toHaveBeenCalledTimes(1);
    });
});
