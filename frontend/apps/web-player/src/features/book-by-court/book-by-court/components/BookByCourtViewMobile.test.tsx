import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookByCourtViewMobile from "./BookByCourtViewMobile";
import type { Court, CourtAvailability, OpenGame } from "../../types";

vi.mock("../../../booking/new-booking/components/NewBookingModal", () => ({
    NewBookingModal: ({
        courtId,
        onClose,
        onSuccess,
    }: {
        courtId: string;
        onClose: () => void;
        onSuccess: () => void;
    }) => (
        <div>
            <span>Booking modal {courtId}</span>
            <button onClick={onClose}>Close booking modal</button>
            <button onClick={onSuccess}>Booking success</button>
        </div>
    ),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({
        title,
        description,
        onClose,
    }: {
        title: string;
        description?: string;
        onClose: () => void;
    }) => (
        <div role="alert">
            <span>{title}</span>
            {description ? <span>{description}</span> : null}
            <button onClick={onClose}>Dismiss {title}</button>
        </div>
    ),
    DatePicker: ({
        value,
        onChange,
        placeholder,
    }: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
    }) => (
        <input
            type="date"
            aria-label={placeholder ?? "date"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
        />
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
    TimeInput: ({
        value,
        onChange,
    }: {
        value: string;
        onChange: (event: { target: { value: string } }) => void;
    }) => (
        <input type="time" aria-label="time" value={value} onChange={(event) => onChange(event)} />
    ),
    formatCurrency: (value: number | string | null) => (value == null ? "—" : `£${value}`),
    formatUTCDate: (value: string) => value.slice(0, 10),
    formatUTCTime: (value: string) => value.slice(11, 16),
}));

const openGame: OpenGame = {
    id: "game-1",
    court_id: "court-1",
    court_name: "Court One",
    start_datetime: "2026-05-20T10:00:00Z",
    end_datetime: "2026-05-20T11:00:00Z",
    min_skill_level: 2,
    max_skill_level: 5,
    slots_available: 2,
    total_price: 24,
    players: [],
};

const court: Court = {
    id: "court-1",
    club_id: "club-1",
    name: "Court One",
    surface_type: "indoor",
    has_lighting: true,
    lighting_surcharge: 5,
    is_active: true,
};

const availability: CourtAvailability = {
    court_id: "court-1",
    date: "2026-05-20",
    slots: [
        {
            start_time: "10:00",
            end_time: "11:00",
            is_available: true,
            price: 24,
            price_label: "Peak",
        },
    ],
};

const defaultProps = {
    currentUserId: "user-1",
    club: {
        clubs: [{ id: "club-1", name: "Club One", role: "member" }],
        selectedId: "club-1",
        selectedName: "Club One",
        onChange: vi.fn(),
    },
    joinSection: {
        filterDate: "",
        filterStatus: "all" as const,
        games: [openGame],
        isLoading: false,
        error: null,
        isJoining: false,
        joiningBookingId: "",
        onFilterDateChange: vi.fn(),
        onFilterStatusChange: vi.fn(),
        onRefresh: vi.fn(),
        onJoinGame: vi.fn(),
    },
    bookSection: {
        filterDate: "2026-05-20",
        filterSurface: "" as const,
        filterTimeFrom: "",
        filterTimeTo: "",
        courts: [court],
        isLoading: false,
        error: null,
        onFilterDateChange: vi.fn(),
        onFilterSurfaceChange: vi.fn(),
        onFilterTimeFromChange: vi.fn(),
        onFilterTimeToChange: vi.fn(),
        onRefresh: vi.fn(),
        onCheckAvailability: vi.fn(),
    },
    availability: {
        courtId: "court-1",
        data: availability,
        isLoading: false,
        error: null,
        onOpenBooking: vi.fn(),
    },
    bookingModal: null,
    onCloseBooking: vi.fn(),
    onBookingSuccess: vi.fn(),
    onBookingPaid: vi.fn(),
    feedback: {
        joinError: "",
        successMessage: "",
        warningMessage: "",
        onDismissJoinError: vi.fn(),
        onDismissSuccess: vi.fn(),
        onDismissWarning: vi.fn(),
    },
};

function getAt<T>(items: T[], index: number): T {
    const item = items[index];
    if (!item) throw new Error(`Expected element at index ${index}`);
    return item;
}

describe("BookByCourtViewMobile", () => {
    it("renders join tab and handles join/filter actions", () => {
        const onJoinGame = vi.fn();
        const onFilterDateChange = vi.fn();
        const onRefresh = vi.fn();
        render(
            <BookByCourtViewMobile
                {...defaultProps}
                joinSection={{
                    ...defaultProps.joinSection,
                    onJoinGame,
                    onFilterDateChange,
                    onRefresh,
                }}
            />
        );

        expect(onRefresh).toHaveBeenCalled();
        expect(screen.getByText("Court One")).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("All dates"), {
            target: { value: "2026-05-21" },
        });
        fireEvent.click(screen.getAllByRole("button", { name: /join/i }).at(-1)!);

        expect(onFilterDateChange).toHaveBeenCalledWith("2026-05-21");
        expect(onJoinGame).toHaveBeenCalledWith("game-1");
    });

    it("switches to book tab, auto-checks the first court, and books a slot", () => {
        const onCheckAvailability = vi.fn();
        const onRefresh = vi.fn();
        render(
            <BookByCourtViewMobile
                {...defaultProps}
                availability={{ ...defaultProps.availability, courtId: "" }}
                bookSection={{ ...defaultProps.bookSection, onCheckAvailability, onRefresh }}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Book" }));

        expect(onRefresh).toHaveBeenCalled();
        expect(onCheckAvailability).toHaveBeenCalledWith("court-1");
    });

    it("emits book filters and court/slot actions", () => {
        const onFilterDateChange = vi.fn();
        const onFilterSurfaceChange = vi.fn();
        const onFilterTimeFromChange = vi.fn();
        const onFilterTimeToChange = vi.fn();
        const onCheckAvailability = vi.fn();
        const onOpenBooking = vi.fn();
        render(
            <BookByCourtViewMobile
                {...defaultProps}
                bookSection={{
                    ...defaultProps.bookSection,
                    onFilterDateChange,
                    onFilterSurfaceChange,
                    onFilterTimeFromChange,
                    onFilterTimeToChange,
                    onCheckAvailability,
                }}
                availability={{ ...defaultProps.availability, onOpenBooking }}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Book" }));
        fireEvent.change(screen.getByLabelText("date"), { target: { value: "2026-05-21" } });
        fireEvent.change(screen.getByLabelText("Any"), { target: { value: "outdoor" } });
        const timeInputs = screen.getAllByLabelText("time");
        fireEvent.change(getAt(timeInputs, 0), { target: { value: "09:00" } });
        fireEvent.change(getAt(timeInputs, 1), { target: { value: "12:00" } });
        fireEvent.click(screen.getByRole("button", { name: "Court One" }));
        fireEvent.click(screen.getByRole("button", { name: /10:00/i }));

        expect(onFilterDateChange).toHaveBeenCalledWith("2026-05-21");
        expect(onFilterSurfaceChange).toHaveBeenCalledWith("outdoor");
        expect(onFilterTimeFromChange).toHaveBeenCalledWith("09:00");
        expect(onFilterTimeToChange).toHaveBeenCalledWith("12:00");
        expect(onCheckAvailability).toHaveBeenCalledWith("court-1");
        expect(onOpenBooking).toHaveBeenCalledWith("court-1", "Court One", "10:00");
    });

    it("renders errors, empty states, loading states, and modal callbacks", () => {
        const onDismissJoinError = vi.fn();
        const onDismissSuccess = vi.fn();
        const onCloseBooking = vi.fn();
        const onBookingSuccess = vi.fn();
        const { rerender } = render(
            <BookByCourtViewMobile
                {...defaultProps}
                joinSection={{
                    ...defaultProps.joinSection,
                    error: new Error("Open failed"),
                }}
                feedback={{
                    joinError: "Join failed",
                    successMessage: "Done",
                    warningMessage: "",
                    onDismissJoinError,
                    onDismissSuccess,
                    onDismissWarning: vi.fn(),
                }}
                bookingModal={{
                    courtId: "court-1",
                    courtName: "Court One",
                    date: "2026-05-20",
                    startTime: "10:00",
                }}
                onCloseBooking={onCloseBooking}
                onBookingSuccess={onBookingSuccess}
            />
        );

        expect(screen.getByText("Open failed")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Dismiss Unable to join game" }));
        fireEvent.click(screen.getByRole("button", { name: "Dismiss Done" }));
        fireEvent.click(screen.getByRole("button", { name: "Close booking modal" }));
        fireEvent.click(screen.getByRole("button", { name: "Booking success" }));
        expect(onDismissJoinError).toHaveBeenCalledOnce();
        expect(onDismissSuccess).toHaveBeenCalledOnce();
        expect(onCloseBooking).toHaveBeenCalledOnce();
        expect(onBookingSuccess).toHaveBeenCalledOnce();

        rerender(
            <BookByCourtViewMobile
                {...defaultProps}
                joinSection={{ ...defaultProps.joinSection, games: [] }}
                bookSection={{ ...defaultProps.bookSection, courts: [] }}
                availability={{ ...defaultProps.availability, courtId: "", data: null }}
            />
        );
        expect(screen.getByText("No open games yet")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Book" }));
        expect(screen.getByText("No courts available for this club.")).toBeInTheDocument();

        rerender(
            <BookByCourtViewMobile
                {...defaultProps}
                joinSection={{ ...defaultProps.joinSection, isLoading: true }}
                bookSection={{ ...defaultProps.bookSection, isLoading: true }}
                availability={{ ...defaultProps.availability, isLoading: true }}
            />
        );
        expect(screen.getByText("Loading courts")).toBeInTheDocument();
    });
});
