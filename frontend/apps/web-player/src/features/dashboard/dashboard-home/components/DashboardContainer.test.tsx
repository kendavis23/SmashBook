import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardContainer from "./DashboardContainer";

const mockSetActiveClubId = vi.fn();
const mockRefetchOpenGames = vi.fn();
const mockRefetchCourts = vi.fn();
const mockRefetchAvailability = vi.fn();
const mockJoinMutate = vi.fn();
let mockClubId: string | null = "club-1";
let mockInnerWidth = 1024;
let mockProfile: { skill_level?: number | null } | undefined = { skill_level: 3.5 };
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

vi.mock("./DashboardView", () => ({
    default: (props: Record<string, unknown>) => (
        <div>
            <span>desktop view</span>
            <span>selected:{String(props.selectedClubId)}</span>
            <span>club:{String(props.selectedClubName)}</span>
            <span>joinError:{String(props.joinError)}</span>
            <span>success:{String(props.successMessage)}</span>
            <span>modal:{props.bookingModal ? "open" : "closed"}</span>
            <button onClick={() => (props.onClubChange as (id: string) => void)("club-2")}>
                Change club
            </button>
            <button
                onClick={() => (props.onJoinFilterDateChange as (v: string) => void)("2026-05-21")}
            >
                Join date
            </button>
            <button
                onClick={() => (props.onBookFilterDateChange as (v: string) => void)("2026-05-22")}
            >
                Book date
            </button>
            <button onClick={() => (props.onCheckAvailability as (id: string) => void)("court-1")}>
                Check availability
            </button>
            <button onClick={() => (props.onRefreshOpenGames as () => void)()}>
                Refresh open games
            </button>
            <button onClick={() => (props.onRefreshCourts as () => void)()}>Refresh courts</button>
            <button onClick={() => (props.onJoinGame as (id: string) => void)("game-1")}>
                Join game
            </button>
            <button
                onClick={() =>
                    (
                        props.onOpenBooking as (
                            courtId: string,
                            courtName: string,
                            startTime: string
                        ) => void
                    )("court-1", "Court One", "10:00")
                }
            >
                Open booking
            </button>
            <button onClick={() => (props.onBookingSuccess as () => void)()}>
                Booking success
            </button>
            <button onClick={() => (props.onDismissJoinError as () => void)()}>
                Dismiss join error
            </button>
            <button onClick={() => (props.onDismissSuccess as () => void)()}>
                Dismiss success
            </button>
        </div>
    ),
}));

vi.mock("./DashboardViewMobile", () => ({
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

describe("DashboardContainer", () => {
    beforeEach(() => {
        mockClubId = "club-1";
        mockInnerWidth = 1024;
        mockProfile = { skill_level: 3.5 };
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
        render(<DashboardContainer />);

        expect(screen.getByText("desktop view")).toBeInTheDocument();
        expect(screen.getByText("selected:club-1")).toBeInTheDocument();
        expect(screen.getByText("club:Club One")).toBeInTheDocument();
    });

    it("renders mobile view when viewport is mobile", () => {
        mockInnerWidth = 375;
        setupMatchMedia();

        render(<DashboardContainer />);

        expect(screen.getByText("mobile view")).toBeInTheDocument();
    });

    it("selects the first club when no club is active", () => {
        mockClubId = null;

        render(<DashboardContainer />);

        expect(mockSetActiveClubId).toHaveBeenCalledWith("club-1", "Club One", "member");
    });

    it("passes skill-level open-game filters and court filters to hooks", () => {
        render(<DashboardContainer />);

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
        render(<DashboardContainer />);

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
        mockJoinMutate.mockImplementation((_payload, options) => options.onSuccess());
        render(<DashboardContainer />);

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
        render(<DashboardContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Join game" }));

        await waitFor(() => expect(screen.getByText("joinError:Join failed")).toBeInTheDocument());
        fireEvent.click(screen.getByRole("button", { name: "Dismiss join error" }));
        expect(screen.getByText("joinError:")).toBeInTheDocument();
    });

    it("opens booking modal state and refreshes after booking success", () => {
        render(<DashboardContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Check availability" }));
        fireEvent.click(screen.getByRole("button", { name: "Open booking" }));
        expect(screen.getByText("modal:open")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Booking success" }));
        expect(screen.getByText("success:Booking created successfully.")).toBeInTheDocument();
        expect(mockRefetchCourts).toHaveBeenCalled();
        expect(mockRefetchAvailability).toHaveBeenCalled();
        expect(mockRefetchOpenGames).toHaveBeenCalled();
    });
});
