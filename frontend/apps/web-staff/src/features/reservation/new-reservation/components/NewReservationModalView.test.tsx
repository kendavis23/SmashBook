import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewReservationModalView } from "./NewReservationModalView";
import type { NewReservationFormState } from "./NewReservationView";

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
        </div>
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

const defaultForm: NewReservationFormState = {
    title: "",
    reservationType: "maintenance",
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
    form: defaultForm,
    titleError: "",
    timeError: "",
    apiError: "",
    isPending: false,
    lockedCourtName: "Court 1",
    lockedDate: "2026-04-20",
    lockedStartTime: "09:00",
    lockedEndTime: "10:00",
    onFormChange: vi.fn(),
    onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
    onCancel: vi.fn(),
    onClose: vi.fn(),
    onDismissError: vi.fn(),
};

describe("NewReservationModalView", () => {
    it("renders heading", () => {
        render(<NewReservationModalView {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "New Reservation" })).toBeInTheDocument();
    });

    it("renders context stat pills", () => {
        render(<NewReservationModalView {...defaultProps} />);

        expect(screen.getByText("Court")).toBeInTheDocument();
        expect(screen.getAllByText("Court 1").length).toBeGreaterThan(0);
        expect(screen.getByText("Date")).toBeInTheDocument();
        expect(screen.getByText("Time")).toBeInTheDocument();
        expect(screen.getByText("9:00 AM - 10:00 AM")).toBeInTheDocument();
    });

    it("calls onClose when X button is clicked", () => {
        const onClose = vi.fn();
        render(<NewReservationModalView {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        expect(onClose).toHaveBeenCalled();
    });

    it("calls onCancel when Cancel button is clicked", () => {
        const onCancel = vi.fn();
        render(<NewReservationModalView {...defaultProps} onCancel={onCancel} />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(onCancel).toHaveBeenCalled();
    });

    it("calls onSubmit when Create Reservation is clicked", () => {
        const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
        render(<NewReservationModalView {...defaultProps} onSubmit={onSubmit} />);

        fireEvent.click(screen.getByRole("button", { name: "Create Reservation" }));
        expect(onSubmit).toHaveBeenCalled();
    });

    it("disables submit while pending", () => {
        render(<NewReservationModalView {...defaultProps} isPending={true} />);

        expect(screen.getByRole("button", { name: /Creating/i })).toBeDisabled();
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <NewReservationModalView
                {...defaultProps}
                apiError="Create failed"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Create failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalled();
    });

    it("calls onFormChange when title is changed", () => {
        const onFormChange = vi.fn();
        render(<NewReservationModalView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Evening Block" } });
        expect(onFormChange).toHaveBeenCalledWith({ title: "Evening Block" });
    });

    it("shows title error when titleError is provided", () => {
        render(<NewReservationModalView {...defaultProps} titleError="Title is required." />);

        expect(screen.getByText("Title is required.")).toBeInTheDocument();
    });

    it("shows time error when timeError is provided", () => {
        render(
            <NewReservationModalView
                {...defaultProps}
                timeError="End time must be after start time."
            />
        );

        expect(screen.getByText("End time must be after start time.")).toBeInTheDocument();
    });

    it("renders Allowed Booking Types checkboxes", () => {
        render(<NewReservationModalView {...defaultProps} />);

        expect(screen.getByText("Allowed Booking Types")).toBeInTheDocument();
        expect(screen.getByText("Regular")).toBeInTheDocument();
        expect(screen.getByText("Training")).toBeInTheDocument();
    });

    it("toggles booking type selection on click", () => {
        const onFormChange = vi.fn();
        render(<NewReservationModalView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.click(screen.getByText("Regular"));
        expect(onFormChange).toHaveBeenCalledWith({ allowedBookingTypes: ["regular"] });
    });

    it("renders recurring checkbox and does not show rrule input by default", () => {
        render(<NewReservationModalView {...defaultProps} />);

        expect(screen.getByLabelText("Enable recurring schedule")).toBeInTheDocument();
        expect(screen.queryByLabelText(/recurrence rule/i)).not.toBeInTheDocument();
    });

    it("shows rrule input when isRecurring is true", () => {
        render(
            <NewReservationModalView
                {...defaultProps}
                form={{ ...defaultForm, isRecurring: true }}
            />
        );

        expect(screen.getByLabelText(/recurrence rule/i)).toBeInTheDocument();
    });

    it("formats locked date for display", () => {
        render(<NewReservationModalView {...defaultProps} lockedDate="2026-05-10" />);

        expect(screen.getByText("May 10, 2026")).toBeInTheDocument();
    });

    it("shows dash for date when no lockedDate provided", () => {
        render(<NewReservationModalView {...defaultProps} lockedDate={undefined} />);

        expect(screen.getByText("Date")).toBeInTheDocument();
    });
});
