import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManageReservationView from "./ManageReservationView";
import type { ManageReservationFormState } from "./ManageReservationView";

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
    }: {
        value: string;
        onChange: (v: string) => void;
        placeholder?: string;
        className?: string;
    }) => (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={placeholder ?? "Pick a date"}
            className={className}
        />
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
    formatUTCDateTime: (value: string) => value,
}));

const reservation = {
    id: "reservation-1",
    club_id: "club-1",
    title: "Morning Block",
    reservation_type: "private_hire",
    court_id: "court-1",
    start_datetime: "2026-04-20T09:00:00Z",
    end_datetime: "2026-04-20T10:00:00Z",
    anchor_skill_level: null,
    skill_range_above: null,
    skill_range_below: null,
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
    anchorSkillLevel: "",
    skillRangeAbove: "",
    skillRangeBelow: "",
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

describe("ManageReservationView", () => {
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
});
