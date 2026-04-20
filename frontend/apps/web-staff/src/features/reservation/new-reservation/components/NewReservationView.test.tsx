import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewReservationView from "./NewReservationView";
import type { NewReservationFormState } from "./NewReservationView";
import type { Court } from "../../types";

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
}));

const defaultForm: NewReservationFormState = {
    title: "Morning Block",
    reservationType: "private_hire",
    courtId: "court-1",
    date: "2026-04-20",
    startTime: "09:00",
    endTime: "10:00",
    anchorSkillLevel: "",
    skillRangeAbove: "",
    skillRangeBelow: "",
    allowedBookingTypes: [],
    isRecurring: false,
    recurrenceRule: "",
    recurrenceEndDate: "",
};

const courts: Court[] = [
    {
        id: "court-1",
        club_id: "club-1",
        name: "Court 1",
        surface_type: "artificial_grass",
        has_lighting: true,
        lighting_surcharge: 5,
        is_active: true,
    },
];

const defaultProps = {
    courts,
    form: defaultForm,
    titleError: "",
    timeError: "",
    apiError: "",
    isPending: false,
    onFormChange: vi.fn(),
    onSubmit: vi.fn((event: React.FormEvent) => event.preventDefault()),
    onCancel: vi.fn(),
    onDismissError: vi.fn(),
};

describe("NewReservationView", () => {
    it("renders heading and form sections", () => {
        render(<NewReservationView {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "New Reservation" })).toBeInTheDocument();
        expect(screen.getByText("Core Details")).toBeInTheDocument();
        expect(screen.getByText("Allowed Booking Types")).toBeInTheDocument();
    });

    it("calls onFormChange for title and booking type toggles", () => {
        const onFormChange = vi.fn();
        render(<NewReservationView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Evening Block" } });
        fireEvent.click(screen.getByText("Regular"));

        expect(onFormChange).toHaveBeenCalledWith({ title: "Evening Block" });
        expect(onFormChange).toHaveBeenCalledWith({ allowedBookingTypes: ["regular"] });
    });

    it("renders recurrence fields when recurring is enabled", () => {
        render(
            <NewReservationView {...defaultProps} form={{ ...defaultForm, isRecurring: true }} />
        );

        expect(screen.getByLabelText(/recurrence rule/i)).toBeInTheDocument();
        expect(screen.getAllByLabelText("Pick a date").length).toBeGreaterThan(0);
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <NewReservationView
                {...defaultProps}
                apiError="Create failed"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Create failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalled();
    });

    it("handles cancel and submit actions", () => {
        const onCancel = vi.fn();
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        render(<NewReservationView {...defaultProps} onCancel={onCancel} onSubmit={onSubmit} />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: "Create Reservation" }));

        expect(onCancel).toHaveBeenCalled();
        expect(onSubmit).toHaveBeenCalled();
    });

    it("disables submit while pending", () => {
        render(<NewReservationView {...defaultProps} isPending={true} />);

        expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    });
});
