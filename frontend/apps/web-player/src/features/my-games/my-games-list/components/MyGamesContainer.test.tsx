import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MyGamesContainer from "./MyGamesContainer";

const mockRefetch = vi.fn();

vi.mock("../../hooks", () => ({
    useMyMatchHistory: vi.fn(() => ({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
    })),
}));

vi.mock("./MyGamesView", () => ({
    default: (props: {
        games: unknown[];
        isLoading: boolean;
        error: Error | null;
        onRefresh: () => void;
    }) => (
        <div>
            <span data-testid="loading">{props.isLoading ? "loading" : "ready"}</span>
            <span data-testid="count">{props.games.length}</span>
            <button onClick={props.onRefresh}>Refresh</button>
        </div>
    ),
}));

import { useMyMatchHistory } from "../../hooks";

describe("MyGamesContainer — loading state", () => {
    it("passes isLoading=true to view while loading", () => {
        render(<MyGamesContainer />);
        expect(screen.getByTestId("loading")).toHaveTextContent("loading");
    });
});

describe("MyGamesContainer — data state", () => {
    it("passes games array from hook data", () => {
        vi.mocked(useMyMatchHistory).mockReturnValueOnce({
            data: [{ booking_id: "g1" }, { booking_id: "g2" }] as never,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
        } as never);
        render(<MyGamesContainer />);
        expect(screen.getByTestId("loading")).toHaveTextContent("ready");
        expect(screen.getByTestId("count")).toHaveTextContent("2");
    });

    it("passes empty array when data is undefined", () => {
        vi.mocked(useMyMatchHistory).mockReturnValueOnce({
            data: undefined,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
        } as never);
        render(<MyGamesContainer />);
        expect(screen.getByTestId("count")).toHaveTextContent("0");
    });
});

describe("MyGamesContainer — refresh", () => {
    it("calls refetch when Refresh clicked", () => {
        render(<MyGamesContainer />);
        fireEvent.click(screen.getByText("Refresh"));
        expect(mockRefetch).toHaveBeenCalled();
    });
});
