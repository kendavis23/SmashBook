import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MyGamesView from "./MyGamesView";
import type { PlayerBookingItem } from "../../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title }: { title: string }) => <div role="alert">{title}</div>,
    formatUTCDate: (v: string) => v,
    formatUTCTime: (v: string) => v,
    formatCurrency: (v: number) => `£${v.toFixed(2)}`,
}));

const makeGame = (overrides: Partial<PlayerBookingItem> = {}): PlayerBookingItem => ({
    booking_id: "g1",
    club_id: "c1",
    court_id: "ct1",
    court_name: "Court Alpha",
    booking_type: "regular",
    status: "completed",
    start_datetime: "2026-04-01T10:00:00Z",
    end_datetime: "2026-04-01T11:00:00Z",
    role: "organiser",
    invite_status: "accepted",
    payment_status: "paid",
    amount_due: 50,
    ...overrides,
});

const defaultProps = {
    games: [],
    isLoading: false,
    error: null,
    onRefresh: vi.fn(),
};

describe("MyGamesView — loading state", () => {
    it("shows loading spinner", () => {
        render(<MyGamesView {...defaultProps} isLoading />);
        expect(screen.getByText("Loading match history…")).toBeInTheDocument();
    });
});

describe("MyGamesView — error state", () => {
    it("renders error alert with message", () => {
        const error = new Error("Network failure");
        render(<MyGamesView {...defaultProps} error={error} />);
        expect(screen.getByRole("alert")).toHaveTextContent("Network failure");
    });

    it("renders fallback message when error has no message", () => {
        const error = new Error("");
        render(<MyGamesView {...defaultProps} error={error} />);
        expect(screen.getByRole("alert")).toHaveTextContent("Failed to load match history.");
    });
});

describe("MyGamesView — empty state", () => {
    it("shows empty message when no games", () => {
        render(<MyGamesView {...defaultProps} />);
        expect(screen.getByText("No match history found.")).toBeInTheDocument();
    });
});

describe("MyGamesView — data state", () => {
    it("renders game row with court name", () => {
        render(<MyGamesView {...defaultProps} games={[makeGame({ court_name: "Court Alpha" })]} />);
        expect(screen.getByText("Court Alpha")).toBeInTheDocument();
    });

    it("renders formatted amount", () => {
        render(<MyGamesView {...defaultProps} games={[makeGame({ amount_due: 50 })]} />);
        expect(screen.getByText("£50.00")).toBeInTheDocument();
    });

    it("renders status badge", () => {
        render(<MyGamesView {...defaultProps} games={[makeGame({ status: "completed" })]} />);
        expect(screen.getByText("completed")).toBeInTheDocument();
    });

    it("renders payment status badge", () => {
        render(<MyGamesView {...defaultProps} games={[makeGame({ payment_status: "paid" })]} />);
        expect(screen.getByText("paid")).toBeInTheDocument();
    });

    it("renders role column", () => {
        render(<MyGamesView {...defaultProps} games={[makeGame({ role: "organiser" })]} />);
        expect(screen.getByText("organiser")).toBeInTheDocument();
    });

    it("renders multiple rows", () => {
        const games = [
            makeGame({ booking_id: "g1", court_name: "Court A" }),
            makeGame({ booking_id: "g2", court_name: "Court B" }),
        ];
        render(<MyGamesView {...defaultProps} games={games} />);
        expect(screen.getByText("Court A")).toBeInTheDocument();
        expect(screen.getByText("Court B")).toBeInTheDocument();
    });
});

describe("MyGamesView — header", () => {
    it("renders page heading", () => {
        render(<MyGamesView {...defaultProps} />);
        expect(screen.getByRole("heading", { name: /my games/i })).toBeInTheDocument();
    });

    it("renders Refresh button and calls onRefresh", () => {
        const onRefresh = vi.fn();
        render(<MyGamesView {...defaultProps} onRefresh={onRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: /refresh my games/i }));
        expect(onRefresh).toHaveBeenCalledOnce();
    });

    it("shows total count badge when games exist", () => {
        const games = [makeGame(), makeGame({ booking_id: "g2" })];
        render(<MyGamesView {...defaultProps} games={games} />);
        expect(screen.getByText("2 total")).toBeInTheDocument();
    });

    it("hides count badge when no games", () => {
        render(<MyGamesView {...defaultProps} games={[]} />);
        expect(screen.queryByText(/total/)).not.toBeInTheDocument();
    });
});
