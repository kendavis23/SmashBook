import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManageBookingView from "./ManageBookingView";
import type { ManageBookingFormState } from "./ManageBookingView";

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

vi.mock("./ManageBookingModalView", () => ({
    ManageBookingModalView: ({
        booking,
        onClose,
        onBack,
    }: {
        booking: { court_name: string };
        onClose: () => void;
        onBack: () => void;
    }) => (
        <div data-testid="modal-view">
            <span>{booking.court_name}</span>
            <button onClick={onClose}>Close modal</button>
            <button onClick={onBack}>Close</button>
        </div>
    ),
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
            {options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
    formatUTCDate: (value: string) => `date:${value}`,
    formatUTCTime: (value: string) => `time:${value}`,
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
    is_open_game: true,
    total_price: 20,
    max_players: 4,
    slots_available: 2,
    min_skill_level: null,
    max_skill_level: null,
    players: [
        {
            id: "player-1",
            full_name: "Alex Doe",
            role: "player",
            invite_status: "accepted",
            payment_status: "paid",
            amount_due: 0,
        },
    ],
};

const form: ManageBookingFormState = {
    courtId: "court-1",
    bookingDate: "2026-04-20",
    startTime: "10:00",
    notes: "Remember balls",
    eventName: "Cup",
    contactName: "Taylor",
    contactEmail: "taylor@example.com",
    contactPhone: "123",
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
    onSubmit: vi.fn((event: React.FormEvent) => event.preventDefault()),
    onCancelBooking: vi.fn(),
    onConfirmCancel: vi.fn(),
    onDismissCancelConfirm: vi.fn(),
    onDismissError: vi.fn(),
    onBack: vi.fn(),
    onRefresh: vi.fn(),
    onRefreshSlots: vi.fn(),
    selectedPrice: null,
};

describe("ManageBookingView", () => {
    it("renders booking overview and player list", () => {
        render(<ManageBookingView {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "Court 1" })).toBeInTheDocument();
        expect(screen.getByText("date:2026-04-20T10:00:00Z")).toBeInTheDocument();
        expect(
            screen.getByText("time:2026-04-20T10:00:00Z - time:2026-04-20T11:30:00Z")
        ).toBeInTheDocument();
        expect(screen.getByText("£20.00")).toBeInTheDocument();
        expect(screen.getByText("Alex Doe")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cancel Booking" })).toBeInTheDocument();
        expect(screen.queryByText("Created")).not.toBeInTheDocument();
        expect(screen.queryByText("End")).not.toBeInTheDocument();
    });

    it("calls edit and navigation callbacks", () => {
        const onFormChange = vi.fn();
        const onBack = vi.fn();
        const onCancelBooking = vi.fn();
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

        render(
            <ManageBookingView
                {...defaultProps}
                onFormChange={onFormChange}
                onBack={onBack}
                onCancelBooking={onCancelBooking}
                onSubmit={onSubmit}
            />
        );

        fireEvent.change(screen.getByLabelText(/event name/i), { target: { value: "League" } });
        fireEvent.click(screen.getByRole("button", { name: "Back" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel Booking" }));
        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(onFormChange).toHaveBeenCalledWith({ eventName: "League" });
        expect(onBack).toHaveBeenCalled();
        expect(onCancelBooking).toHaveBeenCalled();
        expect(onSubmit).toHaveBeenCalled();
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <ManageBookingView
                {...defaultProps}
                apiError="Update failed"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Update failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalled();
    });

    it("invites a player for open game bookings", () => {
        const onInvitePlayer = vi.fn();
        render(
            <ManageBookingView
                {...defaultProps}
                booking={{ ...booking, status: "pending" } as never}
                onInvitePlayer={onInvitePlayer}
            />
        );

        fireEvent.change(screen.getByLabelText("Player"), { target: { value: "user-123" } });
        fireEvent.click(screen.getByRole("button", { name: "Invite" }));

        expect(onInvitePlayer).toHaveBeenCalledWith("user-123");
    });

    it("hides invite section for non-open game bookings", () => {
        render(
            <ManageBookingView
                {...defaultProps}
                booking={{ ...booking, status: "pending", is_open_game: false } as never}
            />
        );

        expect(screen.queryByRole("heading", { name: "Invite Player" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Invite" })).not.toBeInTheDocument();
    });

    it("disables save when form is not dirty", () => {
        render(<ManageBookingView {...defaultProps} isDirty={false} />);

        expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    });

    it("shows cancel confirmation when requested", () => {
        const onConfirmCancel = vi.fn();
        const onDismissCancelConfirm = vi.fn();
        render(
            <ManageBookingView
                {...defaultProps}
                showCancelConfirm={true}
                onConfirmCancel={onConfirmCancel}
                onDismissCancelConfirm={onDismissCancelConfirm}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
        fireEvent.click(screen.getByRole("button", { name: "Keep" }));

        expect(onConfirmCancel).toHaveBeenCalled();
        expect(onDismissCancelConfirm).toHaveBeenCalled();
    });

    it("hides edit actions for cancelled bookings", () => {
        render(
            <ManageBookingView
                {...defaultProps}
                booking={{ ...booking, status: "cancelled" } as never}
            />
        );

        expect(screen.queryByRole("button", { name: "Cancel Booking" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    });

    it("date picker has min set to today to prevent past date selection", () => {
        render(<ManageBookingView {...defaultProps} />);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const datePicker = screen.getByLabelText("Pick a date");

        expect(datePicker).toHaveAttribute("min", todayStr);
    });
});

describe("ManageBookingView — modal mode", () => {
    const modalProps = { ...defaultProps, mode: "modal" as const, onClose: vi.fn() };

    it("renders modal view instead of page layout", () => {
        render(<ManageBookingView {...modalProps} />);

        expect(screen.getByTestId("modal-view")).toBeInTheDocument();
        expect(screen.queryByText("Bookings")).not.toBeInTheDocument();
    });

    it("does not render breadcrumb in modal mode", () => {
        render(<ManageBookingView {...modalProps} />);

        expect(screen.queryByText("Manage Booking")).not.toBeInTheDocument();
    });

    it("passes booking to modal view", () => {
        render(<ManageBookingView {...modalProps} />);

        expect(screen.getByText("Court 1")).toBeInTheDocument();
    });

    it("calls onClose when close button in modal is clicked", () => {
        const onClose = vi.fn();
        render(<ManageBookingView {...modalProps} onClose={onClose} />);

        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        expect(onClose).toHaveBeenCalled();
    });
});
