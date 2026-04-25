import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewBookingModalView } from "./NewBookingModalView";
import type { NewBookingFormState } from "./NewBookingView";

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
        </div>
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
    formatCurrency: (amount: number | null | undefined) =>
        amount == null ? "—" : `£${amount.toFixed(2)}`,
}));

const defaultForm: NewBookingFormState = {
    courtId: "court-1",
    bookingType: "regular",
    bookingDate: "2026-04-20",
    startTime: "10:00",
    isOpenGame: false,
    maxPlayers: "4",
    notes: "",
    anchorSkill: "",
    skillMin: "",
    skillMax: "",
    eventName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    onBehalfOf: "",
    staffProfileId: "",
    isRecurring: false,
    recurrenceRule: "",
    skipConflicts: false,
};

const defaultProps = {
    courtName: "Court 1",
    trainers: [{ id: "trainer-1" }],
    form: defaultForm,
    apiError: "",
    isPending: false,
    selectedPrice: 20,
    onFormChange: vi.fn(),
    onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
    onCancel: vi.fn(),
    onDismissError: vi.fn(),
    onClose: vi.fn(),
};

describe("NewBookingModalView", () => {
    it("renders heading and court stat pill", () => {
        render(<NewBookingModalView {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "New Booking" })).toBeInTheDocument();
        expect(screen.getByText("Court")).toBeInTheDocument();
        expect(screen.getAllByText("Court 1").length).toBeGreaterThan(0);
    });

    it("renders date, start time, and price stat pills", () => {
        render(<NewBookingModalView {...defaultProps} />);

        expect(screen.getByText("Date")).toBeInTheDocument();
        expect(screen.getByText("Start Time")).toBeInTheDocument();
        expect(screen.getByText("Price")).toBeInTheDocument();
    });

    it("calls onClose when X button is clicked", () => {
        const onClose = vi.fn();
        render(<NewBookingModalView {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        expect(onClose).toHaveBeenCalled();
    });

    it("calls onCancel when Cancel button is clicked", () => {
        const onCancel = vi.fn();
        render(<NewBookingModalView {...defaultProps} onCancel={onCancel} />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(onCancel).toHaveBeenCalled();
    });

    it("calls onSubmit when Create Booking is clicked", () => {
        const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
        render(<NewBookingModalView {...defaultProps} onSubmit={onSubmit} />);

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));
        expect(onSubmit).toHaveBeenCalled();
    });

    it("disables submit while pending", () => {
        render(<NewBookingModalView {...defaultProps} isPending={true} />);

        expect(screen.getByRole("button", { name: /Creating/i })).toBeDisabled();
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <NewBookingModalView
                {...defaultProps}
                apiError="Slot unavailable"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Slot unavailable");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalled();
    });

    it("renders Open Game & Skill Level section collapsed by default for regular bookings", () => {
        render(<NewBookingModalView {...defaultProps} />);

        expect(screen.getByRole("button", { name: /Open Game.*Skill Level/i })).toBeInTheDocument();
        expect(screen.queryByLabelText("Anchor")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Mark as open game")).not.toBeInTheDocument();
    });

    it("expands Open Game & Skill Level section and shows open game checkbox and skill fields", () => {
        const onFormChange = vi.fn();
        render(<NewBookingModalView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.click(screen.getByRole("button", { name: /Open Game.*Skill Level/i }));
        expect(screen.getByLabelText("Mark as open game")).toBeInTheDocument();
        expect(screen.getByLabelText("Anchor")).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText("Mark as open game"));
        expect(onFormChange).toHaveBeenCalledWith({ isOpenGame: true });
    });

    it("does not render Open Game & Skill Level section for non-regular booking types", () => {
        render(
            <NewBookingModalView
                {...defaultProps}
                form={{ ...defaultForm, bookingType: "lesson_individual" }}
            />
        );

        expect(
            screen.queryByRole("button", { name: /Open Game.*Skill Level/i })
        ).not.toBeInTheDocument();
    });

    it("does not render Event & Contact section for regular booking type", () => {
        render(<NewBookingModalView {...defaultProps} />);

        expect(screen.queryByRole("button", { name: /Event.*Contact/i })).not.toBeInTheDocument();
    });

    it("renders Event & Contact section collapsed by default for corporate_event", () => {
        render(
            <NewBookingModalView
                {...defaultProps}
                form={{ ...defaultForm, bookingType: "corporate_event" }}
            />
        );

        expect(screen.getByRole("button", { name: /Event.*Contact/i })).toBeInTheDocument();
        expect(screen.queryByLabelText("Event name")).not.toBeInTheDocument();
    });

    it("expands Event & Contact section on toggle for corporate_event", () => {
        render(
            <NewBookingModalView
                {...defaultProps}
                form={{ ...defaultForm, bookingType: "corporate_event" }}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Event.*Contact/i }));
        expect(screen.getByLabelText("Event name")).toBeInTheDocument();
    });

    it("renders On behalf of field outside Event & Contact", () => {
        render(<NewBookingModalView {...defaultProps} />);

        expect(screen.getByLabelText(/on behalf of/i)).toBeInTheDocument();
    });

    it("calls onFormChange when notes field is changed", () => {
        const onFormChange = vi.fn();
        render(<NewBookingModalView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.change(screen.getByPlaceholderText(/Internal notes/i), {
            target: { value: "Staff only note" },
        });
        expect(onFormChange).toHaveBeenCalledWith({ notes: "Staff only note" });
    });

    it("shows formatted price when selectedPrice is provided", () => {
        render(<NewBookingModalView {...defaultProps} selectedPrice={18} />);

        expect(screen.getByText("£18.00")).toBeInTheDocument();
    });

    it("shows dash for price when startTime is not set", () => {
        render(
            <NewBookingModalView
                {...defaultProps}
                form={{ ...defaultForm, startTime: "" }}
                selectedPrice={null}
            />
        );

        expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    });
});
