import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewBookingView from "./NewBookingView";
import type { NewBookingFormState } from "./NewBookingView";
import { DEFAULT_RECURRENCE_RULE } from "./newBookingRules";

vi.mock("../../components/PlayerAutocomplete", () => ({
    PlayerAutocomplete: ({
        label,
        value,
        onChange,
        onSelect,
    }: {
        label: string;
        value: string;
        onChange: (value: string) => void;
        onSelect?: (player: { id: string; full_name: string }) => void;
    }) => (
        <div>
            <input
                type="text"
                aria-label={label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {onSelect ? (
                <button
                    type="button"
                    onClick={() =>
                        onSelect({ id: value || "uid-selected", full_name: "Selected Player" })
                    }
                >
                    Select player
                </button>
            ) : null}
        </div>
    ),
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
    playerUserIds: [],
    staffProfileId: "",
    isRecurring: false,
    recurrenceRule: "",
    skipConflicts: false,
};

const defaultProps = {
    courts: [{ id: "court-1", name: "Court 1" }],
    trainers: [{ staff_profile_id: "trainer-1", full_name: "Jane Trainer" }],
    trainersLoading: false,
    trainersError: false,
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
    onBehalfOfError: "",
    staffProfileError: "",
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

    it("locks max players to one for individual lessons", () => {
        const onFormChange = vi.fn();
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...defaultForm, bookingType: "lesson_individual", maxPlayers: "4" }}
                onFormChange={onFormChange}
            />
        );

        const maxPlayersInput = screen.getByLabelText(/max players/i);
        expect(maxPlayersInput).toHaveValue(1);
        expect(maxPlayersInput).toBeDisabled();

        fireEvent.change(maxPlayersInput, { target: { value: "6" } });
        expect(onFormChange).not.toHaveBeenCalledWith({ maxPlayers: "6" });
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
        expect(onFormChange).toHaveBeenCalledWith({
            isOpenGame: true,
            anchorSkill: "4",
            skillMin: "1",
            skillMax: "7",
        });
    });

    it("does not show Open Game & Skill Level section for non-regular booking types", () => {
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...defaultForm, bookingType: "lesson_individual" }}
            />
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

    it("renders invite player autocomplete", () => {
        render(<NewBookingView {...defaultProps} />);
        expect(screen.getByLabelText("Invite player")).toBeInTheDocument();
    });

    it("hides On behalf and Add Players when booking is an open game", () => {
        render(<NewBookingView {...defaultProps} form={{ ...defaultForm, isOpenGame: true }} />);

        expect(screen.queryByLabelText(/on behalf of/i)).not.toBeInTheDocument();
        expect(screen.queryByText("Add Players (user IDs)")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Invite player")).not.toBeInTheDocument();
    });

    it("calls onFormChange with selected player when an invite player is selected", () => {
        const onFormChange = vi.fn();
        render(<NewBookingView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.change(screen.getByLabelText("Invite player"), {
            target: { value: "uid-selected" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Select player" }));
        expect(onFormChange).toHaveBeenCalledWith({ playerUserIds: ["uid-selected"] });
    });

    it("renders existing invited player chips", () => {
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...defaultForm, playerUserIds: ["uid-1", "uid-2"] }}
            />
        );

        expect(screen.getByText("Player 1")).toBeInTheDocument();
        expect(screen.getByText("Player 2")).toBeInTheDocument();
    });

    it("does not add a duplicate invited player", () => {
        const onFormChange = vi.fn();
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...defaultForm, playerUserIds: ["uid-1"] }}
                onFormChange={onFormChange}
            />
        );

        fireEvent.change(screen.getByLabelText("Invite player"), {
            target: { value: "uid-1" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Select player" }));
        expect(onFormChange).not.toHaveBeenCalled();
    });

    it("calls onFormChange with entry removed when remove button is clicked", () => {
        const onFormChange = vi.fn();
        render(
            <NewBookingView
                {...defaultProps}
                form={{ ...defaultForm, playerUserIds: ["uid-1", "uid-2"] }}
                onFormChange={onFormChange}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Remove player 1" }));
        expect(onFormChange).toHaveBeenCalledWith({ playerUserIds: ["uid-2"] });
    });

    it("shows price field with amount when start time is selected", () => {
        render(<NewBookingView {...defaultProps} selectedPrice={18} />);

        expect(screen.getByText("Price")).toBeInTheDocument();
        expect(screen.getAllByText("£18.00").length).toBeGreaterThan(0);
    });

    it("shows actual selected price in the page header total", () => {
        render(<NewBookingView {...defaultProps} selectedPrice={18} />);

        expect(screen.getByText("Total price")).toBeInTheDocument();
        expect(screen.getAllByText("£18.00").length).toBeGreaterThan(1);
        expect(screen.queryByText(/build a polished court reservation/i)).not.toBeInTheDocument();
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
        expect(screen.getAllByText("—").length).toBeGreaterThan(0);
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
        render(
            <NewBookingView {...defaultProps} form={nonRegularForm} onFormChange={onFormChange} />
        );
        fireEvent.click(screen.getByLabelText("Enable recurring booking"));
        expect(onFormChange).toHaveBeenCalledWith({
            isRecurring: true,
            recurrenceRule: DEFAULT_RECURRENCE_RULE,
        });
    });

    it("does not render RecurrencePicker when isRecurring is false", () => {
        render(<NewBookingView {...defaultProps} form={nonRegularForm} />);
        expect(screen.queryByLabelText("recurrence rule")).not.toBeInTheDocument();
    });

    it("renders RecurrencePicker and skip-conflicts checkbox when isRecurring is true", () => {
        render(
            <NewBookingView {...defaultProps} form={{ ...nonRegularForm, isRecurring: true }} />
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
            <NewBookingView {...defaultProps} form={{ ...nonRegularForm, isRecurring: true }} />
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

    it("renders Open Game & Skill Level fields in modal mode", () => {
        render(<NewBookingView {...defaultProps} mode="modal" courtName="Court 1" />);

        expect(screen.getByLabelText("Mark as open game")).toBeInTheDocument();
        expect(screen.getByLabelText(/Anchor/i)).toBeInTheDocument();
    });

    it("shows Event & Contact fields for regular booking type in modal mode", () => {
        render(<NewBookingView {...defaultProps} mode="modal" courtName="Court 1" />);

        expect(screen.getByLabelText("Event name")).toBeInTheDocument();
    });

    it("shows Event & Contact fields for corporate_event in modal mode", () => {
        render(
            <NewBookingView
                {...defaultProps}
                mode="modal"
                courtName="Court 1"
                form={{ ...defaultForm, bookingType: "corporate_event" }}
            />
        );

        expect(screen.getByLabelText("Event name")).toBeInTheDocument();
    });

    it("updates Open Game & Skill Level fields in modal mode", () => {
        const onFormChange = vi.fn();
        render(
            <NewBookingView
                {...defaultProps}
                mode="modal"
                courtName="Court 1"
                onFormChange={onFormChange}
            />
        );

        fireEvent.change(screen.getByLabelText(/Anchor/i), { target: { value: "3.5" } });
        expect(onFormChange).toHaveBeenCalledWith({ anchorSkill: "3.5" });
    });

    it("updates Event & Contact fields for corporate_event", () => {
        const onFormChange = vi.fn();
        render(
            <NewBookingView
                {...defaultProps}
                mode="modal"
                courtName="Court 1"
                form={{ ...defaultForm, bookingType: "corporate_event" }}
                onFormChange={onFormChange}
            />
        );

        fireEvent.change(screen.getByLabelText("Event name"), { target: { value: "Cup" } });
        expect(onFormChange).toHaveBeenCalledWith({ eventName: "Cup" });
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
