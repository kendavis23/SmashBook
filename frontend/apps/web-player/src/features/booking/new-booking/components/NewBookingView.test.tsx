import { fireEvent, render, screen } from "@testing-library/react";
import type { FormEvent, InputHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import NewBookingView, { type NewBookingFormState } from "./NewBookingView";

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
                aria-label={label}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            <button
                type="button"
                onClick={() => onSelect?.({ id: "player-2", full_name: "Player Two" })}
            >
                Select Player Two
            </button>
        </div>
    ),
}));

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>{items.map((item) => item.label).join(" / ")}</nav>
    ),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    DatePicker: ({
        value,
        onChange,
        disabled,
    }: {
        value: string;
        onChange: (value: string) => void;
        disabled?: boolean;
    }) => (
        <input
            aria-label="Booking date"
            type="date"
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
        />
    ),
    NumberInput: (props: InputHTMLAttributes<HTMLInputElement>) => (
        <input type="number" {...props} />
    ),
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
        disabled,
    }: {
        value: string;
        onValueChange: (value: string) => void;
        options: { value: string; label: string; disabled?: boolean }[];
        placeholder?: string;
        disabled?: boolean;
    }) => (
        <select
            aria-label={placeholder ?? "select"}
            value={value}
            disabled={disabled}
            onChange={(event) => onValueChange(event.target.value)}
        >
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
    formatCurrency: (value: number | string | null) => (value == null ? "—" : `£${value}`),
    formatUTCDate: (value: string) => value.slice(0, 10),
}));

const form: NewBookingFormState = {
    courtId: "court-1",
    bookingType: "regular",
    bookingDate: "2026-05-20",
    startTime: "10:00",
    isOpenGame: false,
    maxPlayers: "4",
    anchorSkill: "",
    skillMin: "",
    skillMax: "",
    eventName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    playerUserIds: [],
    staffProfileId: "",
};

const defaultProps = {
    courts: [{ id: "court-1", name: "Court One" }],
    trainers: [],
    trainersLoading: false,
    trainersError: false,
    slots: [{ start_time: "10:00", end_time: "11:00", is_available: true, price: 24, price_label: null }],
    slotsLoading: false,
    form,
    courtError: "",
    startError: "",
    staffError: "",
    apiError: "",
    isPending: false,
    onFormChange: vi.fn(),
    onSubmit: vi.fn((event: FormEvent) => event.preventDefault()),
    onCancel: vi.fn(),
    onDismissError: vi.fn(),
    onRefreshSlots: vi.fn(),
    selectedPrice: 24,
    clubId: "club-1",
};

describe("NewBookingView", () => {
    it("renders page booking details and submits the form", () => {
        const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
        render(<NewBookingView {...defaultProps} onSubmit={onSubmit} />);

        expect(screen.getByRole("heading", { name: "New Booking" })).toBeInTheDocument();
        expect(screen.getAllByText("Court One")).not.toHaveLength(0);
        expect(screen.getAllByText("£24")).not.toHaveLength(0);

        fireEvent.click(screen.getByRole("button", { name: "Create & Pay" }));
        expect(onSubmit).toHaveBeenCalledOnce();
    });

    it("emits form changes for court, date, time, max players, and cancel", () => {
        const onFormChange = vi.fn();
        const onCancel = vi.fn();
        render(
            <NewBookingView
                {...defaultProps}
                onFormChange={onFormChange}
                onCancel={onCancel}
                courts={[
                    { id: "court-1", name: "Court One" },
                    { id: "court-2", name: "Court Two" },
                ]}
            />
        );

        fireEvent.change(screen.getByLabelText("Select court…"), {
            target: { value: "court-2" },
        });
        fireEvent.change(screen.getByLabelText("Booking date"), {
            target: { value: "2026-05-21" },
        });
        fireEvent.change(screen.getByLabelText("Select time"), {
            target: { value: "10:00" },
        });
        fireEvent.change(screen.getByLabelText("Max Players"), {
            target: { value: "6" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onFormChange).toHaveBeenCalledWith({
            courtId: "court-2",
            bookingDate: "",
            startTime: "",
        });
        expect(onFormChange).toHaveBeenCalledWith({ bookingDate: "2026-05-21", startTime: "" });
        expect(onFormChange).toHaveBeenCalledWith({ startTime: "10:00" });
        expect(onFormChange).toHaveBeenCalledWith({ maxPlayers: "6" });
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it("shows loading, empty, error, and validation states", () => {
        const { rerender } = render(
            <NewBookingView {...defaultProps} slotsLoading apiError="Create failed" />
        );

        expect(screen.getByText("Loading…")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent("Create failed");

        rerender(<NewBookingView {...defaultProps} slots={[]} />);
        expect(screen.getByText("No slots")).toBeInTheDocument();

        rerender(
            <NewBookingView
                {...defaultProps}
                form={{ ...form, bookingType: "lesson_individual" }}
                trainersError
                staffError="Staff trainer is required."
            />
        );
        expect(screen.getByText("Failed to load trainers")).toBeInTheDocument();
        expect(screen.getByText("Staff trainer is required.")).toBeInTheDocument();
    });

    it("adds and removes invited players for regular bookings", () => {
        const onFormChange = vi.fn();
        const { rerender } = render(
            <NewBookingView {...defaultProps} onFormChange={onFormChange} />
        );

        fireEvent.click(screen.getByRole("button", { name: "Select Player Two" }));
        expect(onFormChange).toHaveBeenCalledWith({ playerUserIds: ["player-2"] });

        rerender(
            <NewBookingView
                {...defaultProps}
                onFormChange={onFormChange}
                form={{ ...form, playerUserIds: ["player-2"] }}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: /remove player two/i }));
        expect(onFormChange).toHaveBeenCalledWith({ playerUserIds: [] });
    });

    it("renders modal mode through NewBookingModalView", () => {
        render(<NewBookingView {...defaultProps} mode="modal" courtName="Court Modal" />);

        expect(screen.getByText("Match Information")).toBeInTheDocument();
        expect(screen.getByText("Court Modal")).toBeInTheDocument();
    });
});
