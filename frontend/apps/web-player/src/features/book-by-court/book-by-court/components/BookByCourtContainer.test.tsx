import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BookByCourtContainer from "./BookByCourtContainer";

const mockSetActiveClubId = vi.fn();
const mockRefetchOpenGames = vi.fn();
const mockRefetchCourts = vi.fn();
const mockRefetchAvailability = vi.fn();
const mockJoinMutate = vi.fn();
let mockClubId: string | null = "club-1";
let mockInnerWidth = 1024;
let mockProfile: { id?: string; skill_level?: number | null } | undefined = {
    id: "user-1",
    skill_level: 3.5,
};
let mockProfileLoading = false;
let mockProfileError: Error | null = null;

const clubsFixture = [
    { club_id: "club-1", club_name: "Club One", role: "member" },
    { club_id: "club-2", club_name: "Club Two", role: "owner" },
];
const openGamesFixture = [{ id: "game-1", court_name: "Court One" }];
const courtsFixture = [{ id: "court-1", name: "Court One" }];
const availabilityFixture = { court_id: "court-1", date: "2026-05-20", slots: [] };

vi.mock("@repo/auth", () => ({
    useAuth: () => ({
        clubs: clubsFixture,
        clubId: mockClubId,
        setActiveClubId: mockSetActiveClubId,
    }),
}));

vi.mock("../../hooks", () => ({
    useMyProfile: () => ({
        data: mockProfile,
        isLoading: mockProfileLoading,
        error: mockProfileError,
    }),
    useListOpenGames: vi.fn(() => ({
        data: openGamesFixture,
        isLoading: false,
        error: null,
        refetch: mockRefetchOpenGames,
    })),
    useListCourts: vi.fn(() => ({
        data: courtsFixture,
        isLoading: false,
        error: null,
        refetch: mockRefetchCourts,
    })),
    useGetCourtAvailability: vi.fn(() => ({
        data: availabilityFixture,
        isLoading: false,
        error: null,
        refetch: mockRefetchAvailability,
    })),
    useJoinBooking: vi.fn(() => ({
        mutate: mockJoinMutate,
        isPending: false,
    })),
}));

vi.mock("./BookByCourtView", () => ({
    default: (props: {
        club: { selectedId: string; selectedName: string; onChange: (id: string) => void };
        joinSection: {
            filterDate: string;
            onFilterDateChange: (v: string) => void;
            onRefresh: () => void;
            onJoinGame: (id: string) => void;
        };
        bookSection: {
            filterDate: string;
            onFilterDateChange: (v: string) => void;
            onRefresh: () => void;
            onCheckAvailability: (id: string) => void;
        };
        availability: {
            onOpenBooking: (courtId: string, courtName: string, startTime: string) => void;
        };
        bookingModal: unknown;
        onBookingSuccess: () => void;
        feedback: {
            joinError: string;
            successMessage: string;
            warningMessage: string;
            onDismissJoinError: () => void;
            onDismissSuccess: () => void;
            onDismissWarning: () => void;
        };
    }) => (
        <div>
            <span>desktop view</span>
            <span>selected:{props.club.selectedId}</span>
            <span>club:{props.club.selectedName}</span>
            <span>joinError:{props.feedback.joinError}</span>
            <span>success:{props.feedback.successMessage}</span>
            <span>warning:{props.feedback.warningMessage}</span>
            <span>modal:{props.bookingModal ? "open" : "closed"}</span>
            <button onClick={() => props.club.onChange("club-2")}>Change club</button>
            <button onClick={() => props.joinSection.onFilterDateChange("2026-05-21")}>
                Join date
            </button>
            <button onClick={() => props.bookSection.onFilterDateChange("2026-05-22")}>
                Book date
            </button>
            <button onClick={() => props.bookSection.onCheckAvailability("court-1")}>
                Check availability
            </button>
            <button onClick={() => props.joinSection.onRefresh()}>Refresh open games</button>
            <button onClick={() => props.bookSection.onRefresh()}>Refresh courts</button>
            <button onClick={() => props.joinSection.onJoinGame("game-1")}>Join game</button>
            <button
                onClick={() => props.availability.onOpenBooking("court-1", "Court One", "10:00")}
            >
                Open booking
            </button>
            <button onClick={() => props.onBookingSuccess()}>Booking success</button>
            <button onClick={() => props.feedback.onDismissJoinError()}>Dismiss join error</button>
            <button onClick={() => props.feedback.onDismissSuccess()}>Dismiss success</button>
        </div>
    ),
}));

vi.mock("./BookByCourtViewMobile", () => ({
    default: () => <div>mobile view</div>,
}));

import { useListOpenGames, useListCourts, useGetCourtAvailability } from "../../hooks";

function setupMatchMedia() {
    Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: mockInnerWidth,
    });
    Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: vi.fn((query: string) => ({
            matches: query.includes("767") && mockInnerWidth < 768,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    });
}

describe("BookByCourtContainer", () => {
    beforeEach(() => {
        mockClubId = "club-1";
        mockInnerWidth = 1024;
        mockProfile = { id: "user-1", skill_level: 3.5 };
        mockProfileLoading = false;
        mockProfileError = null;
        mockSetActiveClubId.mockReset();
        mockRefetchOpenGames.mockReset();
        mockRefetchCourts.mockReset();
        mockRefetchAvailability.mockReset();
        mockJoinMutate.mockReset();
        setupMatchMedia();
    });

    it("renders desktop view with selected club props", () => {
        render(<BookByCourtContainer />);

        expect(screen.getByText("desktop view")).toBeInTheDocument();
        expect(screen.getByText("selected:club-1")).toBeInTheDocument();
        expect(screen.getByText("club:Club One")).toBeInTheDocument();
    });

    it("renders mobile view when viewport is mobile", () => {
        mockInnerWidth = 375;
        setupMatchMedia();

        render(<BookByCourtContainer />);

        expect(screen.getByText("mobile view")).toBeInTheDocument();
    });

    it("selects the first club when no club is active", () => {
        mockClubId = null;

        render(<BookByCourtContainer />);

        expect(mockSetActiveClubId).toHaveBeenCalledWith("club-1", "Club One", "member");
    });

    it("passes skill-level open-game filters and court filters to hooks", () => {
        render(<BookByCourtContainer />);

        expect(vi.mocked(useListOpenGames)).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ player_skill_level: 3.5 })
        );
        expect(vi.mocked(useListCourts)).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ date: expect.any(String) })
        );
    });

    it("updates club, filters, availability, and refreshes", () => {
        render(<BookByCourtContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Change club" }));
        fireEvent.click(screen.getByRole("button", { name: "Join date" }));
        fireEvent.click(screen.getByRole("button", { name: "Book date" }));
        fireEvent.click(screen.getByRole("button", { name: "Check availability" }));
        fireEvent.click(screen.getByRole("button", { name: "Refresh open games" }));
        fireEvent.click(screen.getByRole("button", { name: "Refresh courts" }));

        expect(mockSetActiveClubId).toHaveBeenCalledWith("club-2", "Club Two", "owner");
        expect(mockRefetchOpenGames).toHaveBeenCalledOnce();
        expect(mockRefetchCourts).toHaveBeenCalledOnce();
        expect(vi.mocked(useGetCourtAvailability)).toHaveBeenLastCalledWith(
            "court-1",
            "2026-05-22"
        );
    });

    it("joins a game and handles success", async () => {
        mockJoinMutate.mockImplementation((_payload, options) =>
            options.onSuccess({
                id: "game-1",
                club_id: "club-1",
                court_id: "court-1",
                court_name: "Court One",
                booking_type: "regular",
                status: "confirmed",
                start_datetime: "2026-05-20T10:00:00Z",
                end_datetime: "2026-05-20T11:00:00Z",
                players: [
                    {
                        user_id: "user-1",
                        role: "player",
                        invite_status: "accepted",
                        payment_status: "paid",
                        amount_due: 0,
                    },
                ],
            })
        );
        render(<BookByCourtContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Join game" }));

        await waitFor(() => expect(mockJoinMutate).toHaveBeenCalled());
        expect(mockRefetchOpenGames).toHaveBeenCalled();
        expect(screen.getByText("success:Joined game successfully.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Dismiss success" }));
        expect(screen.getByText("success:")).toBeInTheDocument();
    });

    it("handles join errors and dismisses them", async () => {
        mockJoinMutate.mockImplementation((_payload, options) =>
            options.onError(new Error("Join failed"))
        );
        render(<BookByCourtContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Join game" }));

        await waitFor(() => expect(screen.getByText("joinError:Join failed")).toBeInTheDocument());
        fireEvent.click(screen.getByRole("button", { name: "Dismiss join error" }));
        expect(screen.getByText("joinError:")).toBeInTheDocument();
    });

    it("opens booking modal state and refreshes after booking success", () => {
        render(<BookByCourtContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Check availability" }));
        fireEvent.click(screen.getByRole("button", { name: "Open booking" }));
        expect(screen.getByText("modal:open")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Booking success" }));
        expect(
            screen.getByText(
                "warning:Go to Bookings and complete payment before the hold expires to secure your slot."
            )
        ).toBeInTheDocument();
        expect(mockRefetchCourts).toHaveBeenCalled();
        expect(mockRefetchAvailability).toHaveBeenCalled();
        expect(mockRefetchOpenGames).toHaveBeenCalled();
    });
});
