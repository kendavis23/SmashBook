import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManageBookingContainer from "./ManageBookingContainer";

const mockNavigate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockCancelMutate = vi.fn();
const mockInviteMutate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ bookingId: "booking-1" }),
    useSearch: () => ({}),
}));

vi.mock("../../components/PlayerAutocomplete", () => ({
    PlayerAutocomplete: ({
        label,
        value,
        onChange,
        disabled,
    }: {
        label: string;
        value: string;
        onChange: (value: string) => void;
        disabled?: boolean;
    }) => (
        <input
            type="text"
            aria-label={label}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
}));

vi.mock("../../hooks", () => ({
    useGetBooking: vi.fn(),
    useUpdateBooking: vi.fn(),
    useCancelBooking: vi.fn(),
    useInvitePlayer: vi.fn(),
    useListCourts: vi.fn(),
    useGetCourtAvailability: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((item) => (
                <span key={item.label}>{item.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    ConfirmDeleteModal: ({
        title,
        onConfirm,
        onCancel,
    }: {
        title: string;
        onConfirm: () => void;
        onCancel: () => void;
    }) => (
        <div role="dialog">
            <span>{title}</span>
            <button onClick={onConfirm}>Confirm</button>
            <button onClick={onCancel}>Keep</button>
        </div>
    ),
    DatePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Pick a date"
        />
    ),
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string; disabled?: boolean }[];
        placeholder?: string;
    }) => (
        <select
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={placeholder ?? "select"}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
    formatUTCDateTime: (value: string) => value,
    datetimeLocalToUTC: (value: string) => value,
    formatCurrency: (amount: number | null) => (amount == null ? "—" : `£${amount.toFixed(2)}`),
}));

import {
    useCancelBooking,
    useGetBooking,
    useGetCourtAvailability,
    useInvitePlayer,
    useListCourts,
    useUpdateBooking,
} from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseGetBooking = useGetBooking as ReturnType<typeof vi.fn>;
const mockUseUpdateBooking = useUpdateBooking as ReturnType<typeof vi.fn>;
const mockUseCancelBooking = useCancelBooking as ReturnType<typeof vi.fn>;
const mockUseInvitePlayer = useInvitePlayer as ReturnType<typeof vi.fn>;
const mockUseListCourts = useListCourts as ReturnType<typeof vi.fn>;
const mockUseGetCourtAvailability = useGetCourtAvailability as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

const booking = {
    id: "booking-1",
    club_id: "club-1",
    court_id: "court-1",
    court_name: "Court 1",
    booking_type: "regular",
    status: "confirmed",
    start_datetime: "2026-04-20T10:00:00Z",
    end_datetime: "2026-04-20T11:30:00Z",
    created_at: "2026-04-18T09:00:00Z",
    notes: " Existing note ",
    event_name: "Existing event",
    is_open_game: false,
    total_price: 20,
    max_players: 4,
    slots_available: 1,
    min_skill_level: null,
    max_skill_level: null,
    players: [],
};

function setupMocks(overrides?: { isLoading?: boolean; error?: Error | null; data?: unknown }) {
    mockUseClubAccess.mockReturnValue({ clubId: "club-1" });
    mockUseGetBooking.mockReturnValue({
        data: overrides?.data === undefined ? booking : overrides.data,
        isLoading: overrides?.isLoading ?? false,
        error: overrides?.error ?? null,
    });
    mockUseListCourts.mockReturnValue({
        data: [
            { id: "court-1", name: "Court 1" },
            { id: "court-2", name: "Court 2" },
        ],
    });
    mockUseGetCourtAvailability.mockReturnValue({
        data: {
            slots: [{ start_time: "10:00", is_available: true, price_label: null }],
        },
        isLoading: false,
    });
    mockUseUpdateBooking.mockReturnValue({
        mutate: mockUpdateMutate,
        isPending: false,
    });
    mockUseCancelBooking.mockReturnValue({
        mutate: mockCancelMutate,
        isPending: false,
    });
    mockUseInvitePlayer.mockReturnValue({
        mutate: mockInviteMutate,
        isPending: false,
    });
}

describe("ManageBookingContainer", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockUpdateMutate.mockReset();
        mockCancelMutate.mockReset();
        mockInviteMutate.mockReset();
    });

    it("shows a loading state", () => {
        setupMocks({ isLoading: true, data: undefined });
        render(<ManageBookingContainer />);

        expect(screen.getByText("Loading booking…")).toBeInTheDocument();
    });

    it("shows an error state when booking is missing", () => {
        setupMocks({ data: undefined, error: new Error("Booking missing") });
        render(<ManageBookingContainer />);

        expect(screen.getByText("Booking missing")).toBeInTheDocument();
    });

    it("submits an updated payload", async () => {
        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("Existing event")).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText(/event name/i), {
            target: { value: " League Night " },
        });
        fireEvent.change(screen.getByLabelText(/contact email/i), {
            target: { value: "staff@example.com" },
        });
        fireEvent.change(screen.getByPlaceholderText(/internal notes visible to staff only/i), {
            target: { value: " Updated note " },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(mockUpdateMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                court_id: "court-1",
                start_datetime: "2026-04-20T10:00",
                event_name: "League Night",
                contact_email: "staff@example.com",
                notes: "Updated note",
            }),
            // datetimeLocalToUTC is mocked as identity
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            })
        );
    });

    it("navigates back when Back is clicked", async () => {
        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole("button", { name: "Back" }));

        expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/bookings" }));
    });

    it("cancels a booking after confirmation and navigates away", async () => {
        mockCancelMutate.mockImplementation((bookingId, options) => {
            options.onSuccess();
        });

        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Cancel Booking" })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole("button", { name: "Cancel Booking" }));
        fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

        expect(mockCancelMutate).toHaveBeenCalledWith(
            "booking-1",
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            })
        );
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "/bookings",
                search: expect.objectContaining({ cancelled: true }),
            })
        );
    });

    it("invites a player for open game bookings", async () => {
        setupMocks({ data: { ...booking, status: "pending", is_open_game: true } });
        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByLabelText("Player")).toBeInTheDocument();
        });
        fireEvent.change(screen.getByLabelText("Player"), { target: { value: " user-123 " } });
        fireEvent.click(screen.getByRole("button", { name: "Invite" }));

        expect(mockInviteMutate).toHaveBeenCalledWith(
            { user_id: "user-123" },
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            })
        );
    });
});
