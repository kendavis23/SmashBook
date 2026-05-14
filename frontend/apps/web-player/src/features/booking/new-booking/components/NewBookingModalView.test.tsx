import { fireEvent, render, screen } from "@testing-library/react";
import type { FormEvent, InputHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { NewBookingModalView } from "./NewBookingModalView";
import type { NewBookingFormState } from "./NewBookingView";

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
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    NumberInput: (props: InputHTMLAttributes<HTMLInputElement>) => (
        <input type="number" {...props} />
    ),
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
    }: {
        value: string;
        onValueChange: (value: string) => void;
        options: { value: string; label: string }[];
        placeholder?: string;
    }) => (
        <select
            aria-label={placeholder ?? "select"}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
        >
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((option) => (
                <option key={option.value} value={option.value}>
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
    courtName: "Court One",
    trainers: [{ staff_profile_id: "staff-1", full_name: "Alex Trainer" }],
    trainersLoading: false,
    trainersError: false,
    form,
    staffError: "",
    apiError: "",
    isPending: false,
    selectedPrice: 24,
    clubId: "club-1",
    onFormChange: vi.fn(),
    onSubmit: vi.fn((event: FormEvent) => event.preventDefault()),
    onCancel: vi.fn(),
    onDismissError: vi.fn(),
    onClose: vi.fn(),
};

describe("NewBookingModalView", () => {
    it("renders match summary and calls close/cancel/submit handlers", () => {
        const onClose = vi.fn();
        const onCancel = vi.fn();
        const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
        render(
            <NewBookingModalView
                {...defaultProps}
                onClose={onClose}
                onCancel={onCancel}
                onSubmit={onSubmit}
            />
        );

        expect(screen.getByText("Court One")).toBeInTheDocument();
        expect(screen.getByText("£24")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: /create & pay/i }));

        expect(onClose).toHaveBeenCalledOnce();
        expect(onCancel).toHaveBeenCalledOnce();
        expect(onSubmit).toHaveBeenCalledOnce();
    });

    it("shows api errors and dismisses them", () => {
        const onDismissError = vi.fn();
        render(
            <NewBookingModalView
                {...defaultProps}
                apiError="Create failed"
                onDismissError={onDismissError}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalledOnce();
    });

    it("changes booking type and max players", () => {
        const onFormChange = vi.fn();
        render(<NewBookingModalView {...defaultProps} onFormChange={onFormChange} />);

        fireEvent.change(screen.getByLabelText("select"), {
            target: { value: "lesson_individual" },
        });
        fireEvent.change(screen.getByLabelText(/max players/i), {
            target: { value: "6" },
        });

        expect(onFormChange).toHaveBeenCalledWith({
            bookingType: "lesson_individual",
            maxPlayers: "1",
        });
        expect(onFormChange).toHaveBeenCalledWith({ maxPlayers: "6" });
    });

    it("adds and removes invited players", () => {
        const onFormChange = vi.fn();
        const { rerender } = render(
            <NewBookingModalView {...defaultProps} onFormChange={onFormChange} />
        );

        fireEvent.click(screen.getByRole("button", { name: "Select Player Two" }));
        expect(onFormChange).toHaveBeenCalledWith({ playerUserIds: ["player-2"] });

        rerender(
            <NewBookingModalView
                {...defaultProps}
                onFormChange={onFormChange}
                form={{ ...form, playerUserIds: ["player-2"] }}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: /remove player two/i }));
        expect(onFormChange).toHaveBeenCalledWith({ playerUserIds: [] });
    });

    it("shows trainer states for lesson bookings", () => {
        const lessonForm = { ...form, bookingType: "lesson_individual" as const };
        const { rerender } = render(
            <NewBookingModalView {...defaultProps} form={lessonForm} trainersLoading />
        );

        expect(screen.getByText("Loading trainers…")).toBeInTheDocument();

        rerender(
            <NewBookingModalView
                {...defaultProps}
                form={lessonForm}
                trainersError
                staffError="Staff trainer is required."
            />
        );
        expect(screen.getByText("Failed to load trainers")).toBeInTheDocument();
        expect(screen.getByText("Staff trainer is required.")).toBeInTheDocument();
    });
});
