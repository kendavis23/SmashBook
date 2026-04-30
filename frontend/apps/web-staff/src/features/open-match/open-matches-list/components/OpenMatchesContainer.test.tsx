import { fireEvent, render, screen } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenGame } from "../../types";
import OpenMatchesContainer from "./OpenMatchesContainer";

const mockNavigate = vi.fn();
const mockUseSearch = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(() => mockNavigate),
    useSearch: vi.fn(() => mockUseSearch()),
}));

vi.mock("../../hooks", () => ({
    useListOpenGames: vi.fn(() => ({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
    })),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(() => ({ clubId: "club-1", role: "admin", isOwner: false })),
}));

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((item) => (
                <span key={item.label}>{item.label}</span>
            ))}
        </nav>
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
            aria-label={placeholder ?? "Pick a date"}
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
        />
    ),
    NumberInput: ({
        value,
        onChange,
        placeholder,
    }: {
        value?: number;
        onChange: (event: ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
    }) => (
        <input
            aria-label={placeholder ?? "number"}
            type="number"
            value={value ?? ""}
            onChange={onChange}
        />
    ),
    formatCurrency: (amount: number | null | undefined) =>
        amount == null ? "—" : `£${amount.toFixed(2)}`,
    formatUTCDateTime: (iso: string) => iso,
    formatUTCTime: (iso: string) => iso,
}));

import * as hooks from "../../hooks";
import * as store from "../../store";

const mockOpenGame: OpenGame = {
    id: "game-1",
    court_id: "court-1",
    court_name: "Court A",
    start_datetime: "2026-04-11T10:00:00Z",
    end_datetime: "2026-04-11T11:30:00Z",
    min_skill_level: 2,
    max_skill_level: 5,
    slots_available: 2,
    total_price: 50,
};

describe("OpenMatchesContainer", () => {
    beforeEach(() => {
        mockNavigate.mockReset();
        mockUseSearch.mockReturnValue({});
        vi.useRealTimers();

        vi.mocked(store.useClubAccess).mockReturnValue({
            clubId: "club-1",
            role: "admin",
            isOwner: false,
        });
        vi.mocked(hooks.useListOpenGames).mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useListOpenGames>);
    });

    it("defaults to the full skill range when URL has no filters", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-04-25T08:00:00Z"));

        render(<OpenMatchesContainer />);

        expect(hooks.useListOpenGames).toHaveBeenCalledWith("club-1", {
            date: undefined,
            min_skill: 1,
            max_skill: 7,
        });
        expect(screen.getByLabelText("Select date")).toHaveValue("");
    });

    it("passes URL filters into the open games query", () => {
        mockUseSearch.mockReturnValue({
            date: "2026-04-11",
            minSkill: "2",
            maxSkill: "5",
        });

        render(<OpenMatchesContainer />);

        expect(hooks.useListOpenGames).toHaveBeenCalledWith("club-1", {
            date: "2026-04-11",
            min_skill: 2,
            max_skill: 5,
        });
    });

    it("renders loading, error, and data states from the hook", () => {
        vi.mocked(hooks.useListOpenGames).mockReturnValueOnce({
            data: [],
            isLoading: true,
            error: null,
            refetch: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useListOpenGames>);
        const { rerender } = render(<OpenMatchesContainer />);
        expect(screen.getByText("Loading open matches…")).toBeInTheDocument();

        vi.mocked(hooks.useListOpenGames).mockReturnValueOnce({
            data: [],
            isLoading: false,
            error: new Error("Server unavailable"),
            refetch: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useListOpenGames>);
        rerender(<OpenMatchesContainer />);
        expect(screen.getByText("Server unavailable")).toBeInTheDocument();

        vi.mocked(hooks.useListOpenGames).mockReturnValueOnce({
            data: [mockOpenGame],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useListOpenGames>);
        rerender(<OpenMatchesContainer />);
        expect(screen.getByText("Court A")).toBeInTheDocument();
    });

    it("updates URL search params when filters are applied", () => {
        render(<OpenMatchesContainer />);

        fireEvent.change(screen.getByLabelText("Select date"), {
            target: { value: "2026-04-12" },
        });
        fireEvent.change(screen.getByLabelText("1"), { target: { value: "3" } });
        fireEvent.change(screen.getByLabelText("10"), { target: { value: "7" } });
        fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/open-match",
            search: {
                date: "2026-04-12",
                minSkill: "3",
                maxSkill: "7",
            },
            replace: true,
        });
    });

    it("navigates to the manage route with current filters when Manage button is clicked", () => {
        mockUseSearch.mockReturnValue({
            date: "2026-04-11",
            minSkill: "2",
            maxSkill: "5",
        });
        vi.mocked(hooks.useListOpenGames).mockReturnValue({
            data: [mockOpenGame],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useListOpenGames>);

        render(<OpenMatchesContainer />);

        fireEvent.click(
            screen.getByRole("button", { name: `Manage open match ${mockOpenGame.id}` })
        );

        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/open-match/$bookingId",
            params: { bookingId: mockOpenGame.id },
            search: {
                date: "2026-04-11",
                minSkill: "2",
                maxSkill: "5",
            },
        });
    });

    it("calls refetch when refresh is clicked", () => {
        const refetch = vi.fn();
        vi.mocked(hooks.useListOpenGames).mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch,
        } as unknown as ReturnType<typeof hooks.useListOpenGames>);

        render(<OpenMatchesContainer />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh open matches" }));

        expect(refetch).toHaveBeenCalledTimes(1);
    });
});
