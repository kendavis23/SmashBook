import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManageBookingModalView } from "./ManageBookingModalView";
import type { ManageBookingFormState } from "./ManageBookingView";

vi.mock("@repo/ui", () => ({
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
    DatePicker: ({
        value,
        onChange,
        minDate,
    }: {
        value: string;
        onChange: (v: string) => void;
        minDate?: string;
    }) => (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Pick a date"
            min={minDate}
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
            {options.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
    StatPill: ({ label, value }: { label: string; value: string }) => (
        <div>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    ),
    formatUTCDateTime: (v: string) => v,
    formatCurrency: (amount: number | null) => (amount == null ? "—" : `£${amount.toFixed(2)}`),
}));

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
    notes: "",
    event_name: null,
    is_open_game: false,
    total_price: 20,
    max_players: 4,
    slots_available: 2,
    min_skill_level: null,
    max_skill_level: null,
    players: [],
};

const form: ManageBookingFormState = {
    courtId: "court-1",
    bookingDate: "2026-04-20",
    startTime: "10:00",
    notes: "",
    eventName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
};

const defaultProps = {
    booking: booking as never,
    courts: [{ id: "court-1", name: "Court 1" }],
    slots: [
        {
            start_time: "10:00",
            end_time: "11:30",
            is_available: true,
            price: null,
            price_label: null,
        },
    ],
    slotsLoading: false,
    form,
    isDirty: true,
    apiError: "",
    updateSuccess: false,
    isUpdating: false,
    isInviting: false,
    isCancelling: false,
    showCancelConfirm: false,
    onFormChange: vi.fn(),
    onInvitePlayer: vi.fn(),
    onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
    onCancelBooking: vi.fn(),
    onConfirmCancel: vi.fn(),
    onDismissCancelConfirm: vi.fn(),
    onDismissError: vi.fn(),
    onDismissSuccess: vi.fn(),
    onBack: vi.fn(),
    onClose: vi.fn(),
    onRefresh: vi.fn(),
    onRefreshSlots: vi.fn(),
    selectedPrice: null,
};

describe("ManageBookingModalView", () => {
    it("renders court name in heading and status badge", () => {
        render(<ManageBookingModalView {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "Court 1" })).toBeInTheDocument();
        expect(screen.getByText("Confirmed")).toBeInTheDocument();
    });

    it("renders stat pills with booking metadata", () => {
        render(<ManageBookingModalView {...defaultProps} />);

        expect(screen.getByText("Type")).toBeInTheDocument();
        expect(screen.getByText("Players")).toBeInTheDocument();
        expect(screen.getByText("Total")).toBeInTheDocument();
    });

    it("calls onClose when X button is clicked", () => {
        const onClose = vi.fn();
        render(<ManageBookingModalView {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        expect(onClose).toHaveBeenCalled();
    });

    it("calls onBack when Close button is clicked", () => {
        const onBack = vi.fn();
        render(<ManageBookingModalView {...defaultProps} onBack={onBack} />);

        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onBack).toHaveBeenCalled();
    });

    it("calls onSubmit when Save Changes is clicked", () => {
        const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
        render(<ManageBookingModalView {...defaultProps} onSubmit={onSubmit} />);

        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
        expect(onSubmit).toHaveBeenCalled();
    });

    it("disables Save Changes when form is not dirty", () => {
        render(<ManageBookingModalView {...defaultProps} isDirty={false} />);

        expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    });

    it("shows cancel booking button for active bookings", () => {
        render(<ManageBookingModalView {...defaultProps} />);

        expect(screen.getByRole("button", { name: "Cancel Booking" })).toBeInTheDocument();
    });

    it("does not show cancel or save buttons for cancelled bookings", () => {
        render(
            <ManageBookingModalView
                {...defaultProps}
                booking={{ ...booking, status: "cancelled" } as never}
            />
        );

        expect(screen.queryByRole("button", { name: "Cancel Booking" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
    });

    it("calls onCancelBooking when Cancel Booking is clicked", () => {
        const onCancelBooking = vi.fn();
        render(<ManageBookingModalView {...defaultProps} onCancelBooking={onCancelBooking} />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel Booking" }));
        expect(onCancelBooking).toHaveBeenCalled();
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <ManageBookingModalView
                {...defaultProps}
                apiError="Update failed"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Update failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalled();
    });

    it("shows invite controls for open game bookings", () => {
        render(
            <ManageBookingModalView
                {...defaultProps}
                booking={{ ...booking, is_open_game: true } as never}
            />
        );

        expect(screen.getByLabelText("Player ID")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Invite" })).toBeInTheDocument();
    });

    it("hides invite section for non-open game bookings", () => {
        render(<ManageBookingModalView {...defaultProps} />);

        expect(screen.queryByText("Invite Player")).not.toBeInTheDocument();
    });

    it("calls onInvitePlayer with the entered player id", () => {
        const onInvitePlayer = vi.fn();
        render(
            <ManageBookingModalView
                {...defaultProps}
                booking={{ ...booking, is_open_game: true } as never}
                onInvitePlayer={onInvitePlayer}
            />
        );

        fireEvent.change(screen.getByLabelText("Player ID"), { target: { value: "user-123" } });
        fireEvent.click(screen.getByRole("button", { name: "Invite" }));

        expect(onInvitePlayer).toHaveBeenCalledWith("user-123");
    });

    it("renders notes collapsed by default", () => {
        render(<ManageBookingModalView {...defaultProps} />);

        expect(screen.getByRole("checkbox", { name: "Notes" })).not.toBeChecked();
        expect(screen.queryByPlaceholderText(/Internal notes/i)).not.toBeInTheDocument();
    });

    it("calls onFormChange when notes field is changed", () => {
        const onFormChange = vi.fn();
        render(<ManageBookingModalView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.click(screen.getByRole("checkbox", { name: "Notes" }));
        fireEvent.change(screen.getByPlaceholderText(/Internal notes/i), {
            target: { value: "Updated note" },
        });

        expect(onFormChange).toHaveBeenCalledWith({ notes: "Updated note" });
    });

    it("expands notes by default when notes already have a value", () => {
        render(
            <ManageBookingModalView {...defaultProps} form={{ ...form, notes: "Existing note" }} />
        );

        expect(screen.getByRole("checkbox", { name: "Notes" })).toBeChecked();
        expect(screen.getByPlaceholderText(/Internal notes/i)).toHaveValue("Existing note");
    });

    it("shows success toast and dismisses it", () => {
        const onDismissSuccess = vi.fn();
        render(
            <ManageBookingModalView
                {...defaultProps}
                updateSuccess={true}
                onDismissSuccess={onDismissSuccess}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Booking updated successfully");
    });

    it("shows cancel confirmation dialog when showCancelConfirm is true", () => {
        const onConfirmCancel = vi.fn();
        const onDismissCancelConfirm = vi.fn();
        render(
            <ManageBookingModalView
                {...defaultProps}
                showCancelConfirm={true}
                onConfirmCancel={onConfirmCancel}
                onDismissCancelConfirm={onDismissCancelConfirm}
            />
        );

        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
        expect(onConfirmCancel).toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: "Keep" }));
        expect(onDismissCancelConfirm).toHaveBeenCalled();
    });

    it("shows players section when booking has players", () => {
        const bookingWithPlayer = {
            ...booking,
            players: [
                {
                    id: "p1",
                    full_name: "Alex Doe",
                    role: "player",
                    payment_status: "paid",
                    amount_due: 0,
                },
            ],
        };
        render(<ManageBookingModalView {...defaultProps} booking={bookingWithPlayer as never} />);

        fireEvent.click(screen.getByRole("button", { name: /Players/i }));
        expect(screen.getByText("Alex Doe")).toBeInTheDocument();
    });

    it("date picker has min set to today", () => {
        render(<ManageBookingModalView {...defaultProps} />);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const datePicker = screen.getByLabelText("Pick a date");

        expect(datePicker).toHaveAttribute("min", todayStr);
    });
});
