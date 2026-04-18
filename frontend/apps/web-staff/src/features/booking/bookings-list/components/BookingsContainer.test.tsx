import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import BookingsContainer from "./BookingsContainer";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(() => mockNavigate),
    useSearch: vi.fn(() => ({})),
}));

vi.mock("../../hooks", () => ({
    useListBookings: vi.fn(() => ({ data: [], isLoading: false, error: null, refetch: vi.fn() })),
    useCancelBooking: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useListCourts: vi.fn(() => ({ data: [] })),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(() => ({ clubId: "club-1", role: "admin", isOwner: false })),
    canManageBooking: vi.fn((role: string) =>
        ["owner", "admin", "ops_lead", "staff", "front_desk"].includes(role)
    ),
}));

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title }: { title: string }) => <div>{title}</div>,
    ConfirmDeleteModal: () => <div />,
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
}));

vi.mock("../../components/CreateBookingModal", () => ({
    default: () => <div data-testid="create-modal" />,
}));

import * as hooks from "../../hooks";
import * as store from "../../store";

describe("BookingsContainer", () => {
    beforeEach(() => {
        mockNavigate.mockReset();
        vi.mocked(store.useClubAccess).mockReturnValue({
            clubId: "club-1",
            role: "admin",
            isOwner: false,
        });
        vi.mocked(hooks.useListBookings).mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useListBookings>);
        vi.mocked(hooks.useCancelBooking).mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof hooks.useCancelBooking>);
        vi.mocked(hooks.useListCourts).mockReturnValue({
            data: [],
        } as unknown as ReturnType<typeof hooks.useListCourts>);
    });

    it("renders the bookings page heading", () => {
        render(<BookingsContainer />);
        expect(screen.getByRole("heading", { name: "Bookings" })).toBeInTheDocument();
    });

    it("shows loading spinner when fetching", () => {
        vi.mocked(hooks.useListBookings).mockReturnValue({
            data: [],
            isLoading: true,
            error: null,
            refetch: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useListBookings>);
        render(<BookingsContainer />);
        expect(screen.getByText("Loading bookings…")).toBeInTheDocument();
    });

    it("shows error message on fetch failure", () => {
        vi.mocked(hooks.useListBookings).mockReturnValue({
            data: [],
            isLoading: false,
            error: new Error("Server error"),
            refetch: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useListBookings>);
        render(<BookingsContainer />);
        expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    it("shows empty state when no bookings", () => {
        render(<BookingsContainer />);
        expect(screen.getByText("No bookings found")).toBeInTheDocument();
    });
});
