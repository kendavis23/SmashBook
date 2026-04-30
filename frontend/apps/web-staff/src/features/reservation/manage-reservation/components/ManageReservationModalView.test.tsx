import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManageReservationModalView } from "./ManageReservationModalView";
import type { ManageReservationFormState } from "./ManageReservationView";

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
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
    RecurrencePicker: ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => (
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
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
        placeholder?: string;
    }) => (
        <select
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={placeholder ?? "select"}
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>
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
    formatUTCDate: (v: string) => `date:${v}`,
    formatUTCTime: (v: string) => `time:${v}`,
}));

const reservation = {
    id: "res-1",
    club_id: "club-1",
    title: "Morning Block",
    reservation_type: "private_hire",
    court_id: "court-1",
    start_datetime: "2026-04-20T09:00:00Z",
    end_datetime: "2026-04-20T10:00:00Z",
    allowed_booking_types: [],
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
    allowedBookingTypes: [],
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
    onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
    onDelete: vi.fn(),
    onDismissError: vi.fn(),
    onBack: vi.fn(),
    onClose: vi.fn(),
};

describe("ManageReservationModalView", () => {
    it("renders reservation title in heading and type badge", () => {
        render(<ManageReservationModalView {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "Morning Block" })).toBeInTheDocument();
        expect(screen.getAllByText("Private Hire").length).toBeGreaterThan(0);
    });

    it("renders stat pills with reservation metadata", () => {
        render(<ManageReservationModalView {...defaultProps} />);

        expect(screen.getAllByText("Type").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Court").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Date").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Time").length).toBeGreaterThan(0);
        expect(screen.getByText("date:2026-04-20T09:00:00Z")).toBeInTheDocument();
        expect(
            screen.getByText("time:2026-04-20T09:00:00Z - time:2026-04-20T10:00:00Z")
        ).toBeInTheDocument();
    });

    it("calls onClose when X button is clicked", () => {
        const onClose = vi.fn();
        render(<ManageReservationModalView {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        expect(onClose).toHaveBeenCalled();
    });

    it("calls onBack when Close button in footer is clicked", () => {
        const onBack = vi.fn();
        render(<ManageReservationModalView {...defaultProps} onBack={onBack} />);

        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onBack).toHaveBeenCalled();
    });

    it("calls onSubmit when Save Changes is clicked", () => {
        const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
        render(<ManageReservationModalView {...defaultProps} onSubmit={onSubmit} />);

        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
        expect(onSubmit).toHaveBeenCalled();
    });

    it("disables Save Changes when form is not dirty", () => {
        render(<ManageReservationModalView {...defaultProps} isDirty={false} />);

        expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    });

    it("shows delete button for editable reservations", () => {
        render(<ManageReservationModalView {...defaultProps} />);

        expect(screen.getByRole("button", { name: "Delete Reservation" })).toBeInTheDocument();
    });

    it("calls onDelete when Delete Reservation is clicked", () => {
        const onDelete = vi.fn();
        render(<ManageReservationModalView {...defaultProps} onDelete={onDelete} />);

        fireEvent.click(screen.getByRole("button", { name: "Delete Reservation" }));
        expect(onDelete).toHaveBeenCalled();
    });

    it("hides delete and save buttons when canEdit is false", () => {
        render(<ManageReservationModalView {...defaultProps} canEdit={false} />);

        expect(
            screen.queryByRole("button", { name: "Delete Reservation" })
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <ManageReservationModalView
                {...defaultProps}
                apiError="Update failed"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Update failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalled();
    });

    it("shows success toast when updateSuccess is true", () => {
        render(<ManageReservationModalView {...defaultProps} updateSuccess={true} />);

        expect(screen.getByRole("alert")).toHaveTextContent("Reservation updated successfully");
    });

    it("calls onFormChange when title is changed", () => {
        const onFormChange = vi.fn();
        render(<ManageReservationModalView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Evening Block" } });
        expect(onFormChange).toHaveBeenCalledWith({ title: "Evening Block" });
    });

    it("shows Allowed Booking Types section expanded by default", () => {
        render(<ManageReservationModalView {...defaultProps} />);

        expect(screen.getByText("Allowed Booking Types")).toBeInTheDocument();
        expect(screen.getByText("Regular")).toBeInTheDocument();
        expect(screen.getByText("Training")).toBeInTheDocument();
    });

    it("shows recurring checkbox and does not show recurrence picker by default", () => {
        render(<ManageReservationModalView {...defaultProps} />);

        expect(screen.getByLabelText("Enable recurring schedule")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /RecurrencePicker/i })).not.toBeInTheDocument();
    });

    it("shows recurrence picker when isRecurring is true", () => {
        render(
            <ManageReservationModalView {...defaultProps} form={{ ...form, isRecurring: true }} />
        );

        expect(screen.getByRole("button", { name: /RecurrencePicker/i })).toBeInTheDocument();
    });

    it("date picker has min set to today", () => {
        render(<ManageReservationModalView {...defaultProps} />);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const datePicker = screen.getByLabelText("Pick a date");

        expect(datePicker).toHaveAttribute("min", todayStr);
    });
});
