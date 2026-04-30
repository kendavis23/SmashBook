import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewBookingContainer from "./NewBookingContainer";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockReset = vi.fn();
const mockRecurringMutate = vi.fn();
const mockRecurringReset = vi.fn();

function getBookingTypeSelect(): HTMLElement {
    const select = screen.getAllByRole("combobox")[1];
    if (!select) {
        throw new Error("Booking type select was not rendered.");
    }
    return select;
}

function selectTrainer(): void {
    fireEvent.change(screen.getByRole("combobox", { name: /select trainer/i }), {
        target: { value: "trainer-1" },
    });
}

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
    useSearch: vi.fn(() => ({})),
}));

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

vi.mock("../../hooks", () => ({
    useCreateBooking: vi.fn(),
    useCreateRecurringBooking: vi.fn(),
    useListCourts: vi.fn(),
    useGetCourtAvailability: vi.fn(),
    useListAvailableTrainers: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
}));

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
    }: {
        value: string;
        onChange: (v: string) => void;
        placeholder?: string;
        disabled?: boolean;
        className?: string;
    }) => (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={placeholder ?? "Pick a date"}
            disabled={disabled}
            className={className}
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
    datetimeLocalToUTC: (value: string) => value,
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
}));

import {
    useCreateBooking,
    useCreateRecurringBooking,
    useGetCourtAvailability,
    useListCourts,
    useListAvailableTrainers,
} from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseCreateBooking = useCreateBooking as ReturnType<typeof vi.fn>;
const mockUseCreateRecurringBooking = useCreateRecurringBooking as ReturnType<typeof vi.fn>;
const mockUseListCourts = useListCourts as ReturnType<typeof vi.fn>;
const mockUseGetCourtAvailability = useGetCourtAvailability as ReturnType<typeof vi.fn>;
const mockUseListAvailableTrainers = useListAvailableTrainers as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

function setupMocks(overrides?: {
    courts?: unknown[];
    error?: Error | null;
    recurringError?: Error | null;
    isPending?: boolean;
}) {
    mockUseClubAccess.mockReturnValue({ clubId: "club-1" });
    mockUseListCourts.mockReturnValue({
        data: overrides?.courts ?? [{ id: "court-1", name: "Court 1" }],
    });
    mockUseListAvailableTrainers.mockReturnValue({
        data: [{ staff_profile_id: "trainer-1", full_name: "Jane Trainer" }],
        isLoading: false,
        isError: false,
    });
    mockUseGetCourtAvailability.mockReturnValue({
        data: {
            slots: [{ start_time: "10:00", is_available: true, price: 20, price_label: "EUR 20" }],
        },
        isLoading: false,
    });
    mockUseCreateBooking.mockReturnValue({
        mutate: mockMutate,
        reset: mockReset,
        isPending: overrides?.isPending ?? false,
        error: overrides?.error ?? null,
    });
    mockUseCreateRecurringBooking.mockReturnValue({
        mutate: mockRecurringMutate,
        reset: mockRecurringReset,
        isPending: overrides?.isPending ?? false,
        error: overrides?.recurringError ?? null,
    });
}

describe("NewBookingContainer", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
        mockReset.mockReset();
        mockRecurringMutate.mockReset();
        mockRecurringReset.mockReset();
    });

    it("shows validation errors and does not submit without required fields", async () => {
        setupMocks({ courts: [] });
        render(<NewBookingContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(screen.getByText("Court is required.")).toBeInTheDocument();
        expect(screen.getByText("Date and start time are required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("submits a valid payload and navigates on success", async () => {
        mockMutate.mockImplementation((payload, options) => {
            options.onSuccess();
        });

        render(<NewBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /select court/i })).toHaveValue("court-1");
        });

        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select time" })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Select time" }), {
            target: { value: "10:00" },
        });
        fireEvent.change(screen.getByLabelText(/max players/i), { target: { value: "6" } });
        fireEvent.change(screen.getByRole("combobox", { name: "select" }), {
            target: { value: "corporate_event" },
        });
        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });
        fireEvent.change(screen.getByLabelText(/event name/i), {
            target: { value: " Spring Cup " },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                club_id: "club-1",
                court_id: "court-1",
                booking_type: "corporate_event",
                start_datetime: "2026-04-20T10:00",
                max_players: 6,
                event_name: "Spring Cup",
                on_behalf_of_user_id: "player-owner-1",
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "/bookings",
                search: expect.objectContaining({ created: true }),
            })
        );
    });

    it("includes player_user_ids in payload when invite player inputs are filled", async () => {
        mockMutate.mockImplementation((_payload: unknown, options: { onSuccess: () => void }) => {
            options.onSuccess();
        });

        render(<NewBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /select court/i })).toHaveValue("court-1");
        });

        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select time" })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Select time" }), {
            target: { value: "10:00" },
        });
        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });

        fireEvent.change(screen.getByLabelText("Invite player"), {
            target: { value: "player-uid-1" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Select player" }));
        fireEvent.change(screen.getByLabelText("Invite player"), {
            target: { value: "player-uid-2" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Select player" }));

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                player_user_ids: ["player-uid-1", "player-uid-2"],
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("omits player_user_ids from payload when no players are invited", async () => {
        mockMutate.mockImplementation((_payload: unknown, options: { onSuccess: () => void }) => {
            options.onSuccess();
        });

        render(<NewBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /select court/i })).toHaveValue("court-1");
        });

        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select time" })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Select time" }), {
            target: { value: "10:00" },
        });
        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({ player_user_ids: undefined }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("requires on behalf of user ID when booking is not an open game", async () => {
        render(<NewBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /select court/i })).toHaveValue("court-1");
        });

        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select time" })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Select time" }), {
            target: { value: "10:00" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(screen.getByText("Player user ID is required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("requires staff trainer for individual lesson bookings", async () => {
        render(<NewBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /select court/i })).toHaveValue("court-1");
        });

        fireEvent.change(getBookingTypeSelect(), {
            target: { value: "lesson_individual" },
        });
        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select time" })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Select time" }), {
            target: { value: "10:00" },
        });
        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(screen.getByText("Staff (Trainer) is required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("submits individual lesson bookings with max players fixed to one", async () => {
        mockMutate.mockImplementation((_payload: unknown, options: { onSuccess: () => void }) => {
            options.onSuccess();
        });

        render(<NewBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /select court/i })).toHaveValue("court-1");
        });

        fireEvent.change(screen.getByLabelText(/max players/i), { target: { value: "6" } });
        fireEvent.change(getBookingTypeSelect(), {
            target: { value: "lesson_individual" },
        });
        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select time" })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Select time" }), {
            target: { value: "10:00" },
        });
        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });
        selectTrainer();

        expect(screen.getByLabelText(/max players/i)).toHaveValue(1);
        expect(screen.getByLabelText(/max players/i)).toBeDisabled();

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                booking_type: "lesson_individual",
                max_players: 1,
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("allows missing on behalf of user ID when booking is an open game", async () => {
        mockMutate.mockImplementation((_payload: unknown, options: { onSuccess: () => void }) => {
            options.onSuccess();
        });

        render(<NewBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /select court/i })).toHaveValue("court-1");
        });

        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select time" })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Select time" }), {
            target: { value: "10:00" },
        });
        fireEvent.click(screen.getByLabelText("Mark as open game"));

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                is_open_game: true,
                on_behalf_of_user_id: null,
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("unchecks open game when booking type changes", async () => {
        render(<NewBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /select court/i })).toHaveValue("court-1");
        });

        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select time" })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Select time" }), {
            target: { value: "10:00" },
        });

        fireEvent.click(screen.getByLabelText("Mark as open game"));
        expect(screen.queryByLabelText(/on behalf of/i)).not.toBeInTheDocument();

        fireEvent.change(getBookingTypeSelect(), {
            target: { value: "corporate_event" },
        });

        expect(screen.getByLabelText(/on behalf of/i)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                booking_type: "corporate_event",
                is_open_game: false,
                on_behalf_of_user_id: "player-owner-1",
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("navigates back on cancel", () => {
        render(<NewBookingContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "/bookings",
                search: expect.objectContaining({ created: undefined }),
            })
        );
    });

    it("shows api error and resets it when dismissed", () => {
        setupMocks({ error: new Error("Create failed") });
        render(<NewBookingContainer />);

        expect(screen.getByRole("alert")).toHaveTextContent("Create failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(mockReset).toHaveBeenCalled();
    });
});

describe("NewBookingContainer — recurring", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
        mockRecurringMutate.mockReset();
        mockRecurringReset.mockReset();
    });

    it("shows 'Create Series' button when recurring is enabled for non-regular booking type", async () => {
        render(<NewBookingContainer />);

        // Switch to non-regular booking type to reveal Recurrence section
        fireEvent.change(getBookingTypeSelect(), {
            target: { value: "lesson_individual" },
        });

        fireEvent.click(screen.getByLabelText("Enable recurring booking"));

        expect(screen.getByRole("button", { name: "Create Series" })).toBeInTheDocument();
    });

    it("calls useCreateRecurringBooking.mutate with correct payload on submit", async () => {
        mockRecurringMutate.mockImplementation(
            (_payload: unknown, options: { onSuccess: () => void }) => {
                options.onSuccess();
            }
        );

        render(<NewBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /select court/i })).toHaveValue("court-1");
        });

        // Switch to non-regular booking type to reveal Recurrence section
        fireEvent.change(getBookingTypeSelect(), {
            target: { value: "lesson_individual" },
        });

        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select time" })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Select time" }), {
            target: { value: "10:00" },
        });
        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });
        selectTrainer();

        fireEvent.click(screen.getByLabelText("Enable recurring booking"));
        fireEvent.change(screen.getByLabelText("recurrence rule"), {
            target: { value: "FREQ=WEEKLY;BYDAY=MO;COUNT=4" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Create Series" }));

        expect(mockRecurringMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                club_id: "club-1",
                court_id: "court-1",
                first_start: "2026-04-20T10:00",
                recurrence_rule: "FREQ=WEEKLY;BYDAY=MO;COUNT=4",
                staff_profile_id: "trainer-1",
                skip_conflicts: false,
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(mockMutate).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "/bookings",
                search: expect.objectContaining({ created: true }),
            })
        );
    });

    it("passes skip_conflicts true when checkbox is checked", async () => {
        mockRecurringMutate.mockImplementation(() => undefined);

        render(<NewBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /select court/i })).toHaveValue("court-1");
        });

        // Switch to non-regular booking type to reveal Recurrence section
        fireEvent.change(getBookingTypeSelect(), {
            target: { value: "lesson_individual" },
        });

        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select time" })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Select time" }), {
            target: { value: "10:00" },
        });
        fireEvent.change(screen.getByLabelText(/on behalf of/i), {
            target: { value: "player-owner-1" },
        });
        selectTrainer();

        fireEvent.click(screen.getByLabelText("Enable recurring booking"));
        fireEvent.click(screen.getByLabelText("Skip conflicting slots"));
        fireEvent.click(screen.getByRole("button", { name: "Create Series" }));

        expect(mockRecurringMutate).toHaveBeenCalledWith(
            expect.objectContaining({ skip_conflicts: true }),
            expect.any(Object)
        );
    });

    it("shows recurring api error and resets it when dismissed", () => {
        setupMocks({ recurringError: new Error("Recurring failed") });
        render(<NewBookingContainer />);

        // Switch to non-regular booking type to reveal Recurrence section
        fireEvent.change(getBookingTypeSelect(), {
            target: { value: "lesson_individual" },
        });

        fireEvent.click(screen.getByLabelText("Enable recurring booking"));

        expect(screen.getByRole("alert")).toHaveTextContent("Recurring failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(mockRecurringReset).toHaveBeenCalled();
    });
});
