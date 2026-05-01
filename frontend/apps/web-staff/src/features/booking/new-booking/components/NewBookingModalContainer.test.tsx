import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewBookingModalContainer from "./NewBookingModalContainer";

const mockMutate = vi.fn();
const mockReset = vi.fn();
const mockRecurringMutate = vi.fn();
const mockRecurringReset = vi.fn();

vi.mock("../../components/PlayerAutocomplete", () => ({
    PlayerAutocomplete: ({
        label,
        value,
        onChange,
    }: {
        label: string;
        value: string;
        onChange: (value: string) => void;
    }) => (
        <input
            type="text"
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
}));

vi.mock("../../hooks", () => ({
    useCreateBooking: vi.fn(),
    useCreateRecurringBooking: vi.fn(),
    useListCourts: vi.fn(),
    useGetCourtAvailability: vi.fn(),
    useListAvailableTrainers: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    formatCurrency: (amount: number | null | undefined) =>
        amount == null ? "—" : `£${amount.toFixed(2)}`,
    formatUTCDate: (value: string) =>
        new Date(value).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
        }),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    DatePicker: ({
        value,
        onChange,
        placeholder,
        disabled,
        className,
    }: {
        value: string;
        onChange: (v: string) => void;
        placeholder?: string;
        disabled?: boolean;
        className?: string;
    }) => (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={placeholder ?? "Pick a date"}
            disabled={disabled}
            className={className}
        />
    ),
    NumberInput: ({
        className,
        ...props
    }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
        <input type="number" className={className} {...props} />
    ),
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
        disabled,
        className,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string; disabled?: boolean }[];
        placeholder?: string;
        disabled?: boolean;
        className?: string;
    }) => (
        <select
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={placeholder ?? "select"}
            disabled={disabled}
            className={className}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
    datetimeLocalToUTC: (value: string) => value,
    RecurrencePicker: ({
        value,
        onChange,
    }: {
        value?: string;
        onChange: (rule: string) => void;
    }) => (
        <input
            type="text"
            aria-label="recurrence rule"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
    StatPill: ({ label, value }: { label: string; value: string }) => (
        <div>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    ),
}));

import {
    useCreateBooking,
    useCreateRecurringBooking,
    useGetCourtAvailability,
    useListCourts,
    useListAvailableTrainers,
} from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseCreateBooking = useCreateBooking as ReturnType<typeof vi.fn>;
const mockUseCreateRecurringBooking = useCreateRecurringBooking as ReturnType<typeof vi.fn>;
const mockUseListCourts = useListCourts as ReturnType<typeof vi.fn>;
const mockUseGetCourtAvailability = useGetCourtAvailability as ReturnType<typeof vi.fn>;
const mockUseListAvailableTrainers = useListAvailableTrainers as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

const defaultProps = {
    courtId: "court-1",
    courtName: "Court 1",
    date: "2026-04-20",
    startTime: "10:00",
    onClose: vi.fn(),
};

function selectBookingType(value: string): void {
    fireEvent.change(screen.getByRole("combobox", { name: "select" }), {
        target: { value },
    });
}

function selectTrainer(): void {
    fireEvent.change(screen.getByRole("combobox", { name: /select trainer/i }), {
        target: { value: "trainer-1" },
    });
}

function setupMocks(overrides?: {
    error?: Error | null;
    recurringError?: Error | null;
    isPending?: boolean;
}) {
    mockUseClubAccess.mockReturnValue({ clubId: "club-1" });
    mockUseListCourts.mockReturnValue({
        data: [{ id: "court-1", name: "Court 1" }],
    });
    mockUseListAvailableTrainers.mockReturnValue({
        data: [{ staff_profile_id: "trainer-1", full_name: "Jane Trainer" }],
        isLoading: false,
        isError: false,
    });
    mockUseGetCourtAvailability.mockReturnValue({
        data: {
            slots: [
                {
                    start_time: "10:00",
                    end_time: "11:30",
                    is_available: true,
                    price: 20,
                    price_label: "Peak",
                },
                {
                    start_time: "11:30",
                    end_time: "13:00",
                    is_available: false,
                    price: 15,
                    price_label: "Off-peak",
                },
            ],
        },
        isLoading: false,
        refetch: vi.fn(),
    });
    mockUseCreateBooking.mockReturnValue({
        mutate: mockMutate,
        reset: mockReset,
        isPending: overrides?.isPending ?? false,
        error: overrides?.error ?? null,
    });
    mockUseCreateRecurringBooking.mockReturnValue({
        mutate: mockRecurringMutate,
        reset: mockRecurringReset,
        isPending: overrides?.isPending ?? false,
        error: overrides?.recurringError ?? null,
    });
}

describe("NewBookingModalContainer", () => {
    beforeEach(() => {
        setupMocks();
        mockMutate.mockReset();
        mockReset.mockReset();
        mockRecurringMutate.mockReset();
        mockRecurringReset.mockReset();
        defaultProps.onClose = vi.fn();
    });

    it("renders compact heading and court name", () => {
        render(<NewBookingModalContainer {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "New Booking" })).toBeInTheDocument();
        expect(screen.getAllByText("Court 1").length).toBeGreaterThan(0);
    });

    it("does not render breadcrumb in modal mode", () => {
        render(<NewBookingModalContainer {...defaultProps} />);

        expect(screen.queryByText("Bookings")).not.toBeInTheDocument();
    });

    it("shows court name as read-only text, not a dropdown", () => {
        render(<NewBookingModalContainer {...defaultProps} />);

        // Court 1 shows as text, not a select option
        const selects = screen.queryAllByRole("combobox");
        const courtSelect = selects.find((el) =>
            Array.from((el as HTMLSelectElement).options).some(
                (o) => o.text === "Court 1" && o.value === "court-1"
            )
        );
        expect(courtSelect).toBeUndefined();
    });

    it("shows validation errors when required fields are missing", () => {
        render(<NewBookingModalContainer {...defaultProps} date="" startTime="" />);

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("submits with correct payload and calls onClose on success", async () => {
        mockMutate.mockImplementation((_payload: unknown, options: { onSuccess: () => void }) => {
            options.onSuccess();
        });

        render(<NewBookingModalContainer {...defaultProps} />);

        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith(
                expect.objectContaining({
                    club_id: "club-1",
                    court_id: "court-1",
                    start_datetime: "2026-04-20T10:00",
                    on_behalf_of_user_id: "player-owner-1",
                }),
                expect.objectContaining({ onSuccess: expect.any(Function) })
            );
        });
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("calls onSuccess callback after successful booking", async () => {
        const onSuccess = vi.fn();
        mockMutate.mockImplementation((_payload: unknown, options: { onSuccess: () => void }) => {
            options.onSuccess();
        });

        render(<NewBookingModalContainer {...defaultProps} onSuccess={onSuccess} />);

        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalled();
        });
    });

    it("requires on behalf of user ID when booking is not an open game", () => {
        render(<NewBookingModalContainer {...defaultProps} />);

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(screen.getByText("Player user ID is required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("requires staff trainer for group lesson bookings", () => {
        render(<NewBookingModalContainer {...defaultProps} />);

        selectBookingType("lesson_group");
        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(screen.getByText("Staff (Trainer) is required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("includes staff trainer in lesson booking payload", () => {
        render(<NewBookingModalContainer {...defaultProps} />);

        selectBookingType("lesson_group");
        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });
        selectTrainer();
        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                booking_type: "lesson_group",
                staff_profile_id: "trainer-1",
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("unchecks open game when booking type changes", () => {
        render(<NewBookingModalContainer {...defaultProps} />);

        fireEvent.click(screen.getByLabelText("Mark as open game"));
        expect(screen.queryByLabelText(/on behalf of/i)).not.toBeInTheDocument();

        selectBookingType("corporate_event");

        expect(screen.getByLabelText(/on behalf of/i)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                booking_type: "corporate_event",
                is_open_game: false,
                on_behalf_of_user_id: "player-owner-1",
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("calls onClose when X close button is clicked", () => {
        render(<NewBookingModalContainer {...defaultProps} />);

        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("calls onClose when Cancel is clicked", () => {
        render(<NewBookingModalContainer {...defaultProps} />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("shows api error and resets it on dismiss", () => {
        setupMocks({ error: new Error("Something went wrong") });
        render(<NewBookingModalContainer {...defaultProps} />);

        expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(mockReset).toHaveBeenCalled();
    });

    it("disables submit button while pending", () => {
        setupMocks({ isPending: true });
        render(<NewBookingModalContainer {...defaultProps} />);

        expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    });
});
