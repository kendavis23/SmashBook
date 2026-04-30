import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewBookingModalView } from "./NewBookingModalView";
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
    playerUserIds: [],
    staffProfileId: "",
    isRecurring: false,
    recurrenceRule: "",
    skipConflicts: false,
};

const defaultProps = {
    courtName: "Court 1",
    trainers: [{ staff_profile_id: "trainer-1", full_name: "Jane Trainer" }],
    trainersLoading: false,
    trainersError: false,
    form: defaultForm,
    apiError: "",
    onBehalfOfError: "",
    staffProfileError: "",
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

    it("renders Open Game and Skill Level fields for regular bookings", () => {
        render(<NewBookingModalView {...defaultProps} />);

        expect(screen.getByLabelText("Mark as open game")).toBeInTheDocument();
        expect(screen.getByLabelText(/Anchor/i)).toBeInTheDocument();
    });

    it("keeps open game checkbox available with skill level fields", () => {
        const onFormChange = vi.fn();
        render(<NewBookingModalView {...defaultProps} onFormChange={onFormChange} />);

        expect(screen.getByLabelText("Mark as open game")).toBeInTheDocument();
        expect(screen.getByLabelText(/Anchor/i)).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText("Mark as open game"));
        expect(onFormChange).toHaveBeenCalledWith({
            isOpenGame: true,
            anchorSkill: "4",
            skillMin: "1",
            skillMax: "7",
        });
    });

    it("does not render Open Game or Skill Level section for non-regular booking types", () => {
        render(
            <NewBookingModalView
                {...defaultProps}
                form={{ ...defaultForm, bookingType: "lesson_individual" }}
            />
        );

        expect(screen.queryByLabelText("Mark as open game")).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Anchor/i)).not.toBeInTheDocument();
    });

    it("sets the default recurrence rule when recurring is enabled", () => {
        const onFormChange = vi.fn();
        render(
            <NewBookingModalView
                {...defaultProps}
                form={{ ...defaultForm, bookingType: "lesson_individual" }}
                onFormChange={onFormChange}
            />
        );

        fireEvent.click(screen.getByLabelText("Repeat this booking"));

        expect(onFormChange).toHaveBeenCalledWith({
            isRecurring: true,
            recurrenceRule: DEFAULT_RECURRENCE_RULE,
        });
    });

    it("locks max players to one for individual lessons", () => {
        render(
            <NewBookingModalView
                {...defaultProps}
                form={{ ...defaultForm, bookingType: "lesson_individual", maxPlayers: "4" }}
            />
        );

        const maxPlayersInput = screen.getByLabelText(/max players/i);
        expect(maxPlayersInput).toHaveValue(1);
        expect(maxPlayersInput).toBeDisabled();
    });

    it("renders Event & Contact fields for regular booking type", () => {
        render(<NewBookingModalView {...defaultProps} />);

        expect(screen.getByLabelText("Event name")).toBeInTheDocument();
    });

    it("renders Event & Contact fields for corporate_event", () => {
        render(
            <NewBookingModalView
                {...defaultProps}
                form={{ ...defaultForm, bookingType: "corporate_event" }}
            />
        );

        expect(screen.getByLabelText("Event name")).toBeInTheDocument();
    });

    it("updates Event & Contact fields for corporate_event", () => {
        const onFormChange = vi.fn();
        render(
            <NewBookingModalView
                {...defaultProps}
                form={{ ...defaultForm, bookingType: "corporate_event" }}
                onFormChange={onFormChange}
            />
        );

        fireEvent.change(screen.getByLabelText("Event name"), { target: { value: "Cup" } });
        expect(onFormChange).toHaveBeenCalledWith({ eventName: "Cup" });
    });

    it("renders On behalf of field outside Event & Contact", () => {
        render(<NewBookingModalView {...defaultProps} />);

        expect(screen.getByLabelText(/on behalf of/i)).toBeInTheDocument();
    });

    it("renders notes field by default", () => {
        render(<NewBookingModalView {...defaultProps} />);

        expect(screen.getByPlaceholderText(/Internal notes/i)).toBeInTheDocument();
    });

    it("renders invite player autocomplete", () => {
        render(<NewBookingModalView {...defaultProps} />);
        expect(screen.getByLabelText("Invite player")).toBeInTheDocument();
    });

    it("hides On behalf and Add Players when booking is an open game", () => {
        render(
            <NewBookingModalView {...defaultProps} form={{ ...defaultForm, isOpenGame: true }} />
        );

        expect(screen.queryByLabelText(/on behalf of/i)).not.toBeInTheDocument();
        expect(screen.queryByText("Add Players (user IDs)")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Invite player")).not.toBeInTheDocument();
    });

    it("calls onFormChange with selected player when an invite player is selected", () => {
        const onFormChange = vi.fn();
        render(<NewBookingModalView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.change(screen.getByLabelText("Invite player"), {
            target: { value: "uid-selected" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Select player" }));
        expect(onFormChange).toHaveBeenCalledWith({ playerUserIds: ["uid-selected"] });
    });

    it("renders existing invited player chips", () => {
        render(
            <NewBookingModalView
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
            <NewBookingModalView
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
            <NewBookingModalView
                {...defaultProps}
                form={{ ...defaultForm, playerUserIds: ["uid-1", "uid-2"] }}
                onFormChange={onFormChange}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Remove player 1" }));
        expect(onFormChange).toHaveBeenCalledWith({ playerUserIds: ["uid-2"] });
    });

    it("calls onFormChange when notes field is changed", () => {
        const onFormChange = vi.fn();
        render(<NewBookingModalView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.change(screen.getByPlaceholderText(/Internal notes/i), {
            target: { value: "Staff only note" },
        });
        expect(onFormChange).toHaveBeenCalledWith({ notes: "Staff only note" });
    });

    it("shows existing notes value", () => {
        render(
            <NewBookingModalView
                {...defaultProps}
                form={{ ...defaultForm, notes: "Existing note" }}
            />
        );

        expect(screen.getByPlaceholderText(/Internal notes/i)).toHaveValue("Existing note");
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
