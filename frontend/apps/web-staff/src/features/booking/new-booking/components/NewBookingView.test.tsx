import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewBookingView from "./NewBookingView";
import type { NewBookingFormState } from "./NewBookingView";

vi.mock("@repo/ui", () => ({
    formatCurrency: (amount: number | null | undefined) =>
        amount == null ? "—" : `£${amount.toFixed(2)}`,
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
        disabled,
        className,
        minDate,
    }: {
        value: string;
        onChange: (v: string) => void;
        placeholder?: string;
        disabled?: boolean;
        className?: string;
        minDate?: string;
    }) => (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={placeholder ?? "Pick a date"}
            disabled={disabled}
            className={className}
            min={minDate}
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
        clearLabel,
        disabled,
        className,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string; disabled?: boolean }[];
        placeholder?: string;
        clearLabel?: string;
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
            {clearLabel !== undefined ? <option value="">{clearLabel}</option> : null}
            {options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
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
    RecurrencePicker: ({
        value,
        onChange,
    }: {
        value?: string;
        onChange: (rule: string) => void;
    }) => (
        <div>
            <input
                type="text"
                aria-label="recurrence rule"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    ),
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
    courts: [{ id: "court-1", name: "Court 1" }],
    trainers: [{ id: "trainer-1" }],
    slots: [
        {
            start_time: "10:00",
            end_time: "11:30",
            is_available: true,
            price: 20,
            price_label: "EUR 20",
        },
    ],
    slotsLoading: false,
    form: defaultForm,
    courtError: "",
    startError: "",
    apiError: "",
    isPending: false,
    onFormChange: vi.fn(),
    onSubmit: vi.fn((event: React.FormEvent) => event.preventDefault()),
    onCancel: vi.fn(),
    onDismissError: vi.fn(),
    onRefreshSlots: vi.fn(),
    selectedPrice: 20,
};

describe("NewBookingView", () => {
    it("renders heading and breadcrumb", () => {
        render(<NewBookingView {...defaultProps} />);

        expect(screen.getByText("Bookings")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "New Booking" })).toBeInTheDocument();
        expect(screen.getByText("Core Details")).toBeInTheDocument();
    });

    it("calls onFormChange for number field", () => {
        const onFormChange = vi.fn();
        render(<NewBookingView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.change(screen.getByLabelText(/max players/i), { target: { value: "6" } });

        expect(onFormChange).toHaveBeenCalledWith({ maxPlayers: "6" });
    });

    it("shows Open Game & Skill Level section for regular booking type", () => {
        render(<NewBookingView {...defaultProps} />);

        expect(screen.getByText("Open Game & Skill Level")).toBeInTheDocument();
        expect(screen.getByLabelText(/mark as open game/i)).toBeInTheDocument();
    });

    it("calls onFormChange with isOpenGame when open game checkbox is toggled", () => {
        const onFormChange = vi.fn();
        render(<NewBookingView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.click(screen.getByLabelText(/mark as open game/i));
        expect(onFormChange).toHaveBeenCalledWith({ isOpenGame: true });
    });

    it("does not show Open Game & Skill Level section for non-regular booking types", () => {
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...defaultForm, bookingType: "lesson_individual" }}
            />,
        );

        expect(screen.queryByText("Open Game & Skill Level")).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/mark as open game/i)).not.toBeInTheDocument();
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <NewBookingView
                {...defaultProps}
                apiError="Create failed"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Create failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalled();
    });

    it("submits and cancels via the action buttons", () => {
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        const onCancel = vi.fn();
        render(<NewBookingView {...defaultProps} onSubmit={onSubmit} onCancel={onCancel} />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(onCancel).toHaveBeenCalled();
        expect(onSubmit).toHaveBeenCalled();
    });

    it("disables submit while pending", () => {
        render(<NewBookingView {...defaultProps} isPending={true} />);

        expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    });

    it("shows price field with amount when start time is selected", () => {
        render(<NewBookingView {...defaultProps} selectedPrice={18} />);

        expect(screen.getByText("Price")).toBeInTheDocument();
        expect(screen.getByText("£18.00")).toBeInTheDocument();
    });

    it("shows price field with dash when no start time is selected", () => {
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...defaultForm, startTime: "" }}
                selectedPrice={null}
            />
        );

        expect(screen.getByText("Price")).toBeInTheDocument();
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("shows dash when selected price is null", () => {
        render(<NewBookingView {...defaultProps} selectedPrice={null} />);

        expect(screen.getByText("Price")).toBeInTheDocument();
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("date picker has min set to today to prevent past date selection", () => {
        render(<NewBookingView {...defaultProps} />);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const datePicker = screen.getByLabelText(/pick a date/i);

        expect(datePicker).toHaveAttribute("min", todayStr);
    });
});

const nonRegularForm: NewBookingFormState = { ...defaultForm, bookingType: "lesson_individual" };

describe("NewBookingView — recurring (page mode)", () => {
    it("does not render Recurrence section for regular booking type", () => {
        render(<NewBookingView {...defaultProps} />);
        expect(screen.queryByText("Recurrence")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Enable recurring booking")).not.toBeInTheDocument();
    });

    it("renders Recurrence section heading for non-regular booking type", () => {
        render(<NewBookingView {...defaultProps} form={nonRegularForm} />);
        expect(screen.getByText("Recurrence")).toBeInTheDocument();
    });

    it("shows 'Repeat this booking' checkbox unchecked by default", () => {
        render(<NewBookingView {...defaultProps} form={nonRegularForm} />);
        const toggle = screen.getByLabelText("Enable recurring booking");
        expect(toggle).not.toBeChecked();
    });

    it("calls onFormChange with isRecurring true when toggle is checked", () => {
        const onFormChange = vi.fn();
        render(<NewBookingView {...defaultProps} form={nonRegularForm} onFormChange={onFormChange} />);
        fireEvent.click(screen.getByLabelText("Enable recurring booking"));
        expect(onFormChange).toHaveBeenCalledWith({ isRecurring: true });
    });

    it("does not render RecurrencePicker when isRecurring is false", () => {
        render(<NewBookingView {...defaultProps} form={nonRegularForm} />);
        expect(screen.queryByLabelText("recurrence rule")).not.toBeInTheDocument();
    });

    it("renders RecurrencePicker and skip-conflicts checkbox when isRecurring is true", () => {
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...nonRegularForm, isRecurring: true }}
            />
        );
        expect(screen.getByLabelText("recurrence rule")).toBeInTheDocument();
        expect(screen.getByLabelText("Skip conflicting slots")).toBeInTheDocument();
    });

    it("calls onFormChange with recurrenceRule when RecurrencePicker changes", () => {
        const onFormChange = vi.fn();
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...nonRegularForm, isRecurring: true }}
                onFormChange={onFormChange}
            />
        );
        fireEvent.change(screen.getByLabelText("recurrence rule"), {
            target: { value: "FREQ=WEEKLY;BYDAY=MO;COUNT=4" },
        });
        expect(onFormChange).toHaveBeenCalledWith({
            recurrenceRule: "FREQ=WEEKLY;BYDAY=MO;COUNT=4",
        });
    });

    it("calls onFormChange with skipConflicts when skip-conflicts checkbox changes", () => {
        const onFormChange = vi.fn();
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...nonRegularForm, isRecurring: true }}
                onFormChange={onFormChange}
            />
        );
        fireEvent.click(screen.getByLabelText("Skip conflicting slots"));
        expect(onFormChange).toHaveBeenCalledWith({ skipConflicts: true });
    });

    it("shows 'Create Series' submit label when isRecurring is true", () => {
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...nonRegularForm, isRecurring: true }}
            />
        );
        expect(screen.getByRole("button", { name: "Create Series" })).toBeInTheDocument();
    });

    it("shows 'Creating series…' submit label when isRecurring and isPending", () => {
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...nonRegularForm, isRecurring: true }}
                isPending={true}
            />
        );
        expect(screen.getByRole("button", { name: /creating series/i })).toBeDisabled();
    });

    it("shows 'Create Booking' when not recurring", () => {
        render(<NewBookingView {...defaultProps} />);
        expect(screen.getByRole("button", { name: "Create Booking" })).toBeInTheDocument();
    });

    it("does not render Recurrence section in modal mode", () => {
        render(<NewBookingView {...defaultProps} mode="modal" courtName="Court 1" />);
        expect(screen.queryByLabelText("Enable recurring booking")).not.toBeInTheDocument();
    });
});

describe("NewBookingView — modal mode", () => {
    it("renders compact heading without court name subtitle", () => {
        render(<NewBookingView {...defaultProps} mode="modal" courtName="Court 1" />);

        expect(screen.getByRole("heading", { name: "New Booking" })).toBeInTheDocument();
        // court shown as read-only field, not as a subtitle paragraph
        expect(screen.getAllByText("Court 1").length).toBeGreaterThan(0);
    });

    it("does not render breadcrumb in modal mode", () => {
        render(<NewBookingView {...defaultProps} mode="modal" courtName="Court 1" />);

        expect(screen.queryByText("Bookings")).not.toBeInTheDocument();
    });

    it("renders X close button and calls onClose when clicked", () => {
        const onClose = vi.fn();
        render(
            <NewBookingView {...defaultProps} mode="modal" courtName="Court 1" onClose={onClose} />
        );

        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        expect(onClose).toHaveBeenCalled();
    });

    it("renders collapsible Open Game & Skill Level section collapsed by default", () => {
        render(<NewBookingView {...defaultProps} mode="modal" courtName="Court 1" />);

        expect(
            screen.getByRole("button", { name: /Open Game.*Skill Level/i }),
        ).toBeInTheDocument();
        // Anchor input not visible until expanded
        expect(screen.queryByLabelText("Anchor")).not.toBeInTheDocument();
    });

    it("does not show Event & Contact section for regular booking type in modal mode", () => {
        render(<NewBookingView {...defaultProps} mode="modal" courtName="Court 1" />);

        expect(screen.queryByRole("button", { name: /Event.*Contact/i })).not.toBeInTheDocument();
    });

    it("shows Event & Contact section for corporate_event in modal mode", () => {
        render(
            <NewBookingView
                {...defaultProps}
                mode="modal"
                courtName="Court 1"
                form={{ ...defaultForm, bookingType: "corporate_event" }}
            />,
        );

        expect(screen.getByRole("button", { name: /Event.*Contact/i })).toBeInTheDocument();
    });

    it("expands Open Game & Skill Level section when toggled", () => {
        render(<NewBookingView {...defaultProps} mode="modal" courtName="Court 1" />);

        fireEvent.click(screen.getByRole("button", { name: /Open Game.*Skill Level/i }));
        expect(screen.getByLabelText("Anchor")).toBeInTheDocument();
    });

    it("expands Event & Contact section when toggled for corporate_event", () => {
        render(
            <NewBookingView
                {...defaultProps}
                mode="modal"
                courtName="Court 1"
                form={{ ...defaultForm, bookingType: "corporate_event" }}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /Event.*Contact/i }));
        expect(screen.getByLabelText("Event name")).toBeInTheDocument();
    });

    it("submit and cancel buttons work in modal mode", () => {
        const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
        const onCancel = vi.fn();
        render(
            <NewBookingView
                {...defaultProps}
                mode="modal"
                courtName="Court 1"
                onSubmit={onSubmit}
                onCancel={onCancel}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(onCancel).toHaveBeenCalled();
        expect(onSubmit).toHaveBeenCalled();
    });

    it("shows api error in modal mode", () => {
        const onDismissError = vi.fn();
        render(
            <NewBookingView
                {...defaultProps}
                mode="modal"
                courtName="Court 1"
                apiError="Slot unavailable"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Slot unavailable");
    });
});
