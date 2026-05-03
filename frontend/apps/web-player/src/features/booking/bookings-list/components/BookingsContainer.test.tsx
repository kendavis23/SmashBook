import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookingsContainer from "./BookingsContainer";

const mockRefetch = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks", () => ({
    useMyBookings: vi.fn(() => ({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
    })),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-query")>();
    return {
        ...actual,
        useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
        useMutation: vi.fn(() => ({
            mutateAsync: vi.fn().mockResolvedValue(undefined),
            isPending: false,
        })),
    };
});

vi.mock("./BookingsView", () => ({
    default: (props: {
        upcoming: unknown[];
        past: unknown[];
        activeTab: string;
        isLoading: boolean;
        error: Error | null;
        onRefresh: () => void;
        onTabChange: (tab: string) => void;
    }) => (
        <div>
            <span data-testid="loading">{props.isLoading ? "loading" : "ready"}</span>
            <span data-testid="tab">{props.activeTab}</span>
            <button onClick={props.onRefresh}>Refresh</button>
            <button onClick={() => props.onTabChange("past")}>Past</button>
        </div>
    ),
}));

import { useMyBookings } from "../../hooks";

describe("BookingsContainer — loading state", () => {
    it("passes isLoading=true to view while loading", () => {
        render(<BookingsContainer />);
        expect(screen.getByTestId("loading")).toHaveTextContent("loading");
    });
});

describe("BookingsContainer — data state", () => {
    it("passes upcoming and past arrays from hook data", () => {
        const upcoming = [{ booking_id: "b1" }];
        const past = [{ booking_id: "b2" }];
        vi.mocked(useMyBookings).mockReturnValueOnce({
            data: { upcoming, past } as never,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
        } as never);
        render(<BookingsContainer />);
        expect(screen.getByTestId("loading")).toHaveTextContent("ready");
    });
});

describe("BookingsContainer — refresh", () => {
    it("calls refetch when Refresh clicked", () => {
        render(<BookingsContainer />);
        fireEvent.click(screen.getByText("Refresh"));
        expect(mockRefetch).toHaveBeenCalled();
    });
});

describe("BookingsContainer — tab change", () => {
    it("defaults to upcoming tab", () => {
        render(<BookingsContainer />);
        expect(screen.getByTestId("tab")).toHaveTextContent("upcoming");
    });

    it("switches to past tab when onTabChange called", () => {
        render(<BookingsContainer />);
        fireEvent.click(screen.getByText("Past"));
        expect(screen.getByTestId("tab")).toHaveTextContent("past");
    });
});
