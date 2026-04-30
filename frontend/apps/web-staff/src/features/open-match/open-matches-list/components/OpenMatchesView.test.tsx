import { fireEvent, render, screen } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import type { OpenGame, OpenMatchListFilters } from "../../types";
import OpenMatchesView from "./OpenMatchesView";

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
    formatUTCDateTime: (iso: string) => {
        if (iso === "2026-04-11T10:00:00Z") return "Apr 11, 2026, 10:00 AM";
        return iso;
    },
    formatUTCTime: (iso: string) => {
        if (iso === "2026-04-11T10:00:00Z") return "10:00 AM";
        if (iso === "2026-04-11T11:30:00Z") return "11:30 AM";
        return iso;
    },
}));

const defaultFilters: OpenMatchListFilters = {
    date: "2026-04-11",
    minSkill: "",
    maxSkill: "",
};

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

function renderView(overrides: Partial<Parameters<typeof OpenMatchesView>[0]> = {}) {
    const props = {
        openGames: [],
        isLoading: false,
        error: null,
        filters: defaultFilters,
        onFiltersChange: vi.fn(),
        onSearch: vi.fn(),
        onRefresh: vi.fn(),
        onManageClick: vi.fn(),
        refreshKey: 0,
        ...overrides,
    };

    return render(<OpenMatchesView {...props} />);
}

describe("OpenMatchesView", () => {
    it("shows loading state", () => {
        renderView({ isLoading: true });
        expect(screen.getByText("Loading open matches…")).toBeInTheDocument();
    });

    it("shows error state", () => {
        renderView({ error: new Error("Open games failed") });
        expect(screen.getByText("Open games failed")).toBeInTheDocument();
    });

    it("shows empty state", () => {
        renderView();
        expect(screen.getByText("No open matches found")).toBeInTheDocument();
    });

    it("renders open match rows with formatted values", () => {
        renderView({ openGames: [mockOpenGame] });

        expect(screen.getByText("Court A")).toBeInTheDocument();
        expect(screen.getByText("Apr 11")).toBeInTheDocument();
        expect(screen.getByText("10:00 AM")).toBeInTheDocument();
        expect(screen.getByText("11:30 AM")).toBeInTheDocument();
        expect(screen.getByText("£50.00")).toBeInTheDocument();
        expect(
            screen.getAllByText((_, node) => node?.textContent === "2 – 5").length
        ).toBeGreaterThan(0);
    });

    it("shows Any skill range and Full slots labels", () => {
        renderView({
            openGames: [
                {
                    ...mockOpenGame,
                    min_skill_level: null,
                    max_skill_level: null,
                    slots_available: 0,
                    total_price: null,
                },
            ],
        });

        expect(screen.getByText("Any")).toBeInTheDocument();
        expect(screen.getByText("Full")).toBeInTheDocument();
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("calls refresh and search actions", () => {
        const onRefresh = vi.fn();
        const onSearch = vi.fn();
        renderView({ onRefresh, onSearch });

        fireEvent.click(screen.getByRole("button", { name: "Refresh open matches" }));
        fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

        expect(onRefresh).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it("calls onFiltersChange when filters change", () => {
        const onFiltersChange = vi.fn();
        renderView({ onFiltersChange });

        fireEvent.change(screen.getByLabelText("Select date"), {
            target: { value: "2026-04-12" },
        });
        fireEvent.change(screen.getByLabelText("1"), { target: { value: "3" } });
        fireEvent.change(screen.getByLabelText("10"), { target: { value: "7" } });

        expect(onFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            date: "2026-04-12",
        });
        expect(onFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            minSkill: "3",
        });
        expect(onFiltersChange).toHaveBeenCalledWith({
            ...defaultFilters,
            maxSkill: "7",
        });
    });

    it("renders Manage button for each row and calls onManageClick with game id", () => {
        const onManageClick = vi.fn();
        renderView({ openGames: [mockOpenGame], onManageClick });

        const btn = screen.getByRole("button", { name: `Manage open match ${mockOpenGame.id}` });
        fireEvent.click(btn);

        expect(onManageClick).toHaveBeenCalledWith(mockOpenGame.id);
    });

    it("paginates open matches", () => {
        const openGames = Array.from({ length: 11 }, (_, index) => ({
            ...mockOpenGame,
            id: `game-${index + 1}`,
            court_id: `court-${index + 1}`,
            court_name: `Court ${index + 1}`,
        }));

        renderView({ openGames });

        expect(screen.getByText("1–10 of 11")).toBeInTheDocument();
        expect(screen.getByText("Court 1")).toBeInTheDocument();
        expect(screen.queryByText("Court 11")).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Page 2" }));

        expect(screen.getByText("11–11 of 11")).toBeInTheDocument();
        expect(screen.getByText("Court 11")).toBeInTheDocument();
    });
});
