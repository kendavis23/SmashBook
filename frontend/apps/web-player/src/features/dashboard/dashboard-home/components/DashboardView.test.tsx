import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardView from "./DashboardView";
import type { Court, CourtAvailability, OpenGame } from "../../types";

vi.mock("../../../booking/new-booking/components/NewBookingModal", () => ({
    NewBookingModal: ({
        courtId,
        courtName,
        date,
        startTime,
        onClose,
        onSuccess,
    }: {
        courtId: string;
        courtName: string;
        date: string;
        startTime: string;
        onClose: () => void;
        onSuccess: () => void;
    }) => (
        <div>
            <span>Booking modal {courtId}</span>
            <span>{courtName}</span>
            <span>{date}</span>
            <span>{startTime}</span>
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

const openGame = (overrides: Partial<OpenGame> = {}): OpenGame =>
    ({
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
        ...overrides,
    }) as OpenGame;

const court = (overrides: Partial<Court> = {}): Court =>
    ({
        id: "court-1",
        club_id: "club-1",
        name: "Court One",
        surface_type: "indoor",
        has_lighting: true,
        lighting_surcharge: 5,
        is_active: true,
        ...overrides,
    }) as Court;

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
        {
            start_time: "11:00",
            end_time: "12:00",
            is_available: false,
            price: 24,
            price_label: null,
        },
    ],
};

const defaultProps = {
    clubs: [{ id: "club-1", name: "Club One", role: "member" }],
    selectedClubId: "club-1",
    selectedClubName: "Club One",
    currentUserId: "user-1",
    joinFilterDate: "",
    joinFilterStatus: "all" as const,
    bookFilterDate: "2026-05-20",
    bookFilterSurfaceType: "" as const,
    bookFilterTimeFrom: "",
    bookFilterTimeTo: "",
    openGames: [openGame()],
    courts: [court()],
    availability,
    availabilityCourtId: "court-1",
    bookingModal: null,
    isOpenGamesLoading: false,
    isCourtsLoading: false,
    isAvailabilityLoading: false,
    isJoining: false,
    joiningBookingId: "",
    openGamesError: null,
    courtsError: null,
    availabilityError: null,
    joinError: "",
    successMessage: "",
    onClubChange: vi.fn(),
    onJoinFilterDateChange: vi.fn(),
    onJoinFilterStatusChange: vi.fn(),
    onBookFilterDateChange: vi.fn(),
    onBookFilterSurfaceTypeChange: vi.fn(),
    onBookFilterTimeFromChange: vi.fn(),
    onBookFilterTimeToChange: vi.fn(),
    onCheckAvailability: vi.fn(),
    onRefreshOpenGames: vi.fn(),
    onRefreshCourts: vi.fn(),
    onJoinGame: vi.fn(),
    onOpenBooking: vi.fn(),
    onCloseBooking: vi.fn(),
    onBookingSuccess: vi.fn(),
    onDismissJoinError: vi.fn(),
    onDismissSuccess: vi.fn(),
};

function getAt<T>(items: T[], index: number): T {
    const item = items[index];
    if (!item) throw new Error(`Expected element at index ${index}`);
    return item;
}

describe("DashboardView", () => {
    it("renders open games, courts, availability, and handles primary actions", () => {
        const onJoinGame = vi.fn();
        const onCheckAvailability = vi.fn();
        const onOpenBooking = vi.fn();
        render(
            <DashboardView
                {...defaultProps}
                onJoinGame={onJoinGame}
                onCheckAvailability={onCheckAvailability}
                onOpenBooking={onOpenBooking}
            />
        );

        expect(
            screen.getByRole("heading", { name: /book a court or join a game/i })
        ).toBeInTheDocument();
        expect(screen.getAllByText("Court One")).not.toHaveLength(0);
        expect(screen.getByText("Peak · £24")).toBeInTheDocument();
        expect(screen.getByText("Booked")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /join/i }));
        fireEvent.click(screen.getByRole("button", { name: /availability/i }));
        fireEvent.click(screen.getByRole("button", { name: /10:00/i }));

        expect(onJoinGame).toHaveBeenCalledWith("game-1");
        expect(onCheckAvailability).toHaveBeenCalledWith("court-1");
        expect(onOpenBooking).toHaveBeenCalledWith("court-1", "Court One", "10:00");
    });

    it("emits filter and refresh changes", () => {
        const onClubChange = vi.fn();
        const onJoinFilterDateChange = vi.fn();
        const onBookFilterDateChange = vi.fn();
        const onBookFilterSurfaceTypeChange = vi.fn();
        const onBookFilterTimeFromChange = vi.fn();
        const onBookFilterTimeToChange = vi.fn();
        const onRefreshOpenGames = vi.fn();
        const onRefreshCourts = vi.fn();
        render(
            <DashboardView
                {...defaultProps}
                onClubChange={onClubChange}
                onJoinFilterDateChange={onJoinFilterDateChange}
                onBookFilterDateChange={onBookFilterDateChange}
                onBookFilterSurfaceTypeChange={onBookFilterSurfaceTypeChange}
                onBookFilterTimeFromChange={onBookFilterTimeFromChange}
                onBookFilterTimeToChange={onBookFilterTimeToChange}
                onRefreshOpenGames={onRefreshOpenGames}
                onRefreshCourts={onRefreshCourts}
            />
        );

        fireEvent.change(screen.getByLabelText("Select club"), { target: { value: "club-1" } });
        fireEvent.change(screen.getByLabelText("All dates"), { target: { value: "2026-05-21" } });
        fireEvent.change(getAt(screen.getAllByLabelText("date"), 0), {
            target: { value: "2026-05-22" },
        });
        fireEvent.change(screen.getByLabelText("Any"), { target: { value: "outdoor" } });
        const timeInputs = screen.getAllByLabelText("time");
        fireEvent.change(getAt(timeInputs, 0), { target: { value: "09:00" } });
        fireEvent.change(getAt(timeInputs, 1), { target: { value: "12:00" } });
        fireEvent.click(getAt(screen.getAllByRole("button", { name: /refresh/i }), 0));
        fireEvent.click(getAt(screen.getAllByRole("button", { name: /refresh/i }), 1));

        expect(onClubChange).toHaveBeenCalledWith("club-1");
        expect(onJoinFilterDateChange).toHaveBeenCalledWith("2026-05-21");
        expect(onBookFilterDateChange).toHaveBeenCalledWith("2026-05-22");
        expect(onBookFilterSurfaceTypeChange).toHaveBeenCalledWith("outdoor");
        expect(onBookFilterTimeFromChange).toHaveBeenCalledWith("09:00");
        expect(onBookFilterTimeToChange).toHaveBeenCalledWith("12:00");
        expect(onRefreshOpenGames).toHaveBeenCalledOnce();
        expect(onRefreshCourts).toHaveBeenCalledOnce();
    });

    it("renders loading, error, empty, and toast states", () => {
        const onDismissJoinError = vi.fn();
        const onDismissSuccess = vi.fn();
        const { rerender } = render(
            <DashboardView
                {...defaultProps}
                openGamesError={new Error("Open games failed")}
                courtsError={new Error("Courts failed")}
                availabilityError={new Error("Availability failed")}
                joinError="Join failed"
                successMessage="Done"
                onDismissJoinError={onDismissJoinError}
                onDismissSuccess={onDismissSuccess}
            />
        );

        expect(screen.getByText("Open games failed")).toBeInTheDocument();
        expect(screen.getByText("Courts failed")).toBeInTheDocument();
        expect(screen.getByText("Availability failed")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Dismiss Unable to join game" }));
        fireEvent.click(screen.getByRole("button", { name: "Dismiss Done" }));
        expect(onDismissJoinError).toHaveBeenCalledOnce();
        expect(onDismissSuccess).toHaveBeenCalledOnce();

        rerender(
            <DashboardView
                {...defaultProps}
                openGames={[]}
                courts={[]}
                availability={null}
                availabilityCourtId=""
            />
        );
        expect(screen.getByText("No open games yet")).toBeInTheDocument();
        expect(screen.getByText("No courts are available for this club.")).toBeInTheDocument();
        expect(screen.getByText("Select Check Availability on a court.")).toBeInTheDocument();

        rerender(
            <DashboardView
                {...defaultProps}
                isOpenGamesLoading
                isCourtsLoading
                isAvailabilityLoading
            />
        );
        expect(screen.getByText("Loading open games")).toBeInTheDocument();
        expect(screen.getByText("Loading courts")).toBeInTheDocument();
        expect(screen.getByText("Checking availability")).toBeInTheDocument();
    });

    it("shows pagination summaries for long open game and court lists", () => {
        const openGames = Array.from({ length: 4 }, (_, index) =>
            openGame({ id: `game-${index + 1}`, court_name: `Game Court ${index + 1}` })
        );
        const courts = Array.from({ length: 5 }, (_, index) =>
            court({ id: `court-${index + 1}`, name: `Court ${index + 1}` })
        );
        render(<DashboardView {...defaultProps} openGames={openGames} courts={courts} />);

        expect(screen.getAllByText("Page 1 of 2")).toHaveLength(2);
        expect(screen.queryByText("Game Court 4")).not.toBeInTheDocument();
        expect(screen.queryByText("Court 5")).not.toBeInTheDocument();
    });

    it("renders booking modal and forwards modal callbacks", () => {
        const onCloseBooking = vi.fn();
        const onBookingSuccess = vi.fn();
        render(
            <DashboardView
                {...defaultProps}
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

        expect(screen.getByText("Booking modal court-1")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Close booking modal" }));
        fireEvent.click(screen.getByRole("button", { name: "Booking success" }));
        expect(onCloseBooking).toHaveBeenCalledOnce();
        expect(onBookingSuccess).toHaveBeenCalledOnce();
    });
});
