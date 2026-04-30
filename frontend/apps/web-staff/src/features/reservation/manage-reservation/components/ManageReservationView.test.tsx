import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManageReservationView from "./ManageReservationView";
import type { ManageReservationFormState } from "./ManageReservationView";

vi.mock("./ManageReservationModalView", () => ({
    ManageReservationModalView: ({
        reservation,
        isDirty,
        canEdit,
        apiError,
        onClose,
        onBack,
        onSubmit,
        onDelete,
        onDismissError,
    }: {
        reservation: { title: string };
        isDirty: boolean;
        canEdit: boolean;
        apiError: string;
        onClose: () => void;
        onBack: () => void;
        onSubmit: (e: React.FormEvent) => void;
        onDelete: () => void;
        onDismissError: () => void;
    }) => (
        <div data-testid="modal-view">
            <h2>{reservation.title}</h2>
            {apiError ? (
                <div role="alert">
                    <span>{apiError}</span>
                    <button onClick={onDismissError}>Dismiss</button>
                </div>
            ) : null}
            {canEdit ? (
                <>
                    <button onClick={onDelete}>Delete Reservation</button>
                    <button
                        onClick={(e) => onSubmit(e as unknown as React.FormEvent)}
                        disabled={!isDirty}
                    >
                        Save Changes
                    </button>
                </>
            ) : null}
            <button onClick={onBack}>Close</button>
            <button onClick={onClose} aria-label="Close modal">
                X
            </button>
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
    DatePicker: ({
        value,
        onChange,
        placeholder,
        className,
        minDate,
    }: {
        value: string;
        onChange: (v: string) => void;
        placeholder?: string;
        className?: string;
        minDate?: string;
    }) => (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={placeholder ?? "Pick a date"}
            className={className}
            min={minDate}
        />
    ),
    RecurrencePicker: ({
        value,
        onChange,
    }: {
        value?: string;
        onChange: (v: string) => void;
    }) => (
        <button type="button" onClick={() => onChange("FREQ=WEEKLY;BYDAY=MO;COUNT=12")}>
            RecurrencePicker {value}
        </button>
    ),
    TimeInput: ({
        className,
        ...props
    }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
        <input type="time" className={className} {...props} />
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
            {clearLabel !== undefined ? <option value="">{clearLabel}</option> : null}
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
    formatUTCDate: (value: string) => `date:${value}`,
    formatUTCTime: (value: string) => `time:${value}`,
}));

vi.mock("lucide-react", () => ({
    X: () => <span data-testid="x-icon">X</span>,
    Calendar: () => <span />,
    CalendarDays: () => <span />,
    Clock: () => <span />,
    Clock3: () => <span />,
    Repeat: () => <span />,
    ShieldCheck: () => <span />,
    Trash2: () => <span />,
}));

const reservation = {
    id: "reservation-1",
    club_id: "club-1",
    title: "Morning Block",
    reservation_type: "private_hire",
    court_id: "court-1",
    start_datetime: "2026-04-20T09:00:00Z",
    end_datetime: "2026-04-20T10:00:00Z",
    allowed_booking_types: ["regular"],
    is_recurring: false,
    recurrence_rule: null,
    recurrence_end_date: null,
};

const form: ManageReservationFormState = {
    title: "Morning Block",
    reservationType: "private_hire",
    courtId: "court-1",
    date: "2026-04-20",
    startTime: "09:00",
    endTime: "10:00",
    allowedBookingTypes: ["regular"],
    isRecurring: false,
    recurrenceRule: "",
    recurrenceEndDate: "",
};

const defaultProps = {
    reservation: reservation as never,
    courts: [{ id: "court-1", name: "Court 1" }],
    form,
    isDirty: true,
    canEdit: true,
    apiError: "",
    updateSuccess: false,
    isUpdating: false,
    isDeleting: false,
    onFormChange: vi.fn(),
    onSubmit: vi.fn((event: React.FormEvent) => event.preventDefault()),
    onDelete: vi.fn(),
    onDismissError: vi.fn(),
    onBack: vi.fn(),
};

describe("ManageReservationView — page mode", () => {
    it("renders heading and delete action for editable reservations", () => {
        render(<ManageReservationView {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "Morning Block" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Delete Reservation" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    it("calls change, delete, back, and submit callbacks", () => {
        const onFormChange = vi.fn();
        const onDelete = vi.fn();
        const onBack = vi.fn();
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

        render(
            <ManageReservationView
                {...defaultProps}
                onFormChange={onFormChange}
                onDelete={onDelete}
                onBack={onBack}
                onSubmit={onSubmit}
            />
        );

        fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Evening Block" } });
        fireEvent.click(screen.getByRole("button", { name: "Delete Reservation" }));
        fireEvent.click(screen.getByRole("button", { name: "Back" }));
        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(onFormChange).toHaveBeenCalledWith({ title: "Evening Block" });
        expect(onDelete).toHaveBeenCalled();
        expect(onBack).toHaveBeenCalled();
        expect(onSubmit).toHaveBeenCalled();
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <ManageReservationView
                {...defaultProps}
                apiError="Update failed"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Update failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalled();
    });

    it("disables submit when not dirty", () => {
        render(<ManageReservationView {...defaultProps} isDirty={false} />);

        expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    });

    it("renders read-only back action when user cannot edit", () => {
        render(<ManageReservationView {...defaultProps} canEdit={false} />);

        expect(
            screen.queryByRole("button", { name: "Delete Reservation" })
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    });

    it("date picker has min set to today to prevent past date selection", () => {
        render(<ManageReservationView {...defaultProps} />);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const datePicker = screen.getByLabelText("Pick a date");

        expect(datePicker).toHaveAttribute("min", todayStr);
    });

    it("renders breadcrumb in page mode", () => {
        render(<ManageReservationView {...defaultProps} />);

        expect(screen.getByText("Reservations")).toBeInTheDocument();
        expect(screen.getAllByText("Morning Block").length).toBeGreaterThan(0);
    });

    it("renders overview schedule as date and time range", () => {
        render(<ManageReservationView {...defaultProps} canEdit={false} />);

        expect(screen.getByText("Date")).toBeInTheDocument();
        expect(screen.getByText("date:2026-04-20T09:00:00Z")).toBeInTheDocument();
        expect(screen.getByText("Time")).toBeInTheDocument();
        expect(
            screen.getByText("time:2026-04-20T09:00:00Z - time:2026-04-20T10:00:00Z")
        ).toBeInTheDocument();
        expect(screen.queryByText("Start")).not.toBeInTheDocument();
        expect(screen.queryByText("End")).not.toBeInTheDocument();
    });
});

describe("ManageReservationView — modal mode", () => {
    const modalProps = { ...defaultProps, mode: "modal" as const, onClose: vi.fn() };

    it("renders h2 title with inline status badge instead of h1", () => {
        render(<ManageReservationView {...modalProps} />);

        expect(
            screen.getByRole("heading", { level: 2, name: /morning block/i })
        ).toBeInTheDocument();
        expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    });

    it("does not render breadcrumb in modal mode", () => {
        render(<ManageReservationView {...modalProps} />);

        expect(screen.queryByText("Reservations")).not.toBeInTheDocument();
        expect(screen.queryByText("Manage Reservation")).not.toBeInTheDocument();
    });

    it("renders X close button and calls onClose when clicked", () => {
        const onClose = vi.fn();
        render(<ManageReservationView {...modalProps} onClose={onClose} />);

        const closeBtn = screen.getByRole("button", { name: "Close modal" });
        expect(closeBtn).toBeInTheDocument();
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });

    it("shows Close label instead of Back on the cancel button", () => {
        render(<ManageReservationView {...modalProps} />);

        expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    });

    it("renders Save Changes button and calls onSubmit", () => {
        const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
        render(<ManageReservationView {...modalProps} onSubmit={onSubmit} />);

        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
        expect(onSubmit).toHaveBeenCalled();
    });

    it("disables Save Changes when not dirty in modal mode", () => {
        render(<ManageReservationView {...modalProps} isDirty={false} />);

        expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    });

    it("shows api error in modal mode", () => {
        render(<ManageReservationView {...modalProps} apiError="Server error" />);

        expect(screen.getByRole("alert")).toHaveTextContent("Server error");
    });

    it("renders read-only close button when canEdit is false in modal mode", () => {
        render(<ManageReservationView {...modalProps} canEdit={false} />);

        expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });
});
