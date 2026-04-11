import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubsView from "./ClubsView";
import type { Club } from "../../types";

const mockClubs: Club[] = [
    { id: "1", name: "Club Alpha", address: "123 Main St", currency: "GBP" } as Club,
    { id: "2", name: "Club Beta", address: null, currency: "EUR" } as Club,
];

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
}));

describe("ClubsView — loading state", () => {
    it("shows loading spinner", () => {
        render(
            <ClubsView
                clubs={[]}
                search=""
                isLoading={true}
                error={null}
                onSearchChange={vi.fn()}
                onCreateClick={vi.fn()}
                onManageClub={vi.fn()}
            />
        );
        expect(screen.getByText("Loading clubs…")).toBeInTheDocument();
    });
});

describe("ClubsView — error state", () => {
    it("shows error message", () => {
        render(
            <ClubsView
                clubs={[]}
                search=""
                isLoading={false}
                error={new Error("Network error")}
                onSearchChange={vi.fn()}
                onCreateClick={vi.fn()}
                onManageClub={vi.fn()}
            />
        );
        expect(screen.getByText("Network error")).toBeInTheDocument();
    });
});

describe("ClubsView — empty state", () => {
    it("shows empty state with create button when no clubs and no search", () => {
        render(
            <ClubsView
                clubs={[]}
                search=""
                isLoading={false}
                error={null}
                onSearchChange={vi.fn()}
                onCreateClick={vi.fn()}
                onManageClub={vi.fn()}
            />
        );
        expect(screen.getByText("No clubs yet")).toBeInTheDocument();
        expect(screen.getAllByText("+ Create Club").length).toBeGreaterThan(0);
    });

    it("shows no-match message when search has no results", () => {
        render(
            <ClubsView
                clubs={[]}
                search="xyz"
                isLoading={false}
                error={null}
                onSearchChange={vi.fn()}
                onCreateClick={vi.fn()}
                onManageClub={vi.fn()}
            />
        );
        expect(screen.getByText("No clubs match your search")).toBeInTheDocument();
    });
});

describe("ClubsView — club list", () => {
    it("renders club names", () => {
        render(
            <ClubsView
                clubs={mockClubs}
                search=""
                isLoading={false}
                error={null}
                onSearchChange={vi.fn()}
                onCreateClick={vi.fn()}
                onManageClub={vi.fn()}
            />
        );
        expect(screen.getByText("Club Alpha")).toBeInTheDocument();
        expect(screen.getByText("Club Beta")).toBeInTheDocument();
    });

    it("calls onManageClub with correct club id when Manage is clicked", () => {
        const handleManage = vi.fn();
        render(
            <ClubsView
                clubs={mockClubs}
                search=""
                isLoading={false}
                error={null}
                onSearchChange={vi.fn()}
                onCreateClick={vi.fn()}
                onManageClub={handleManage}
            />
        );
        const manageButtons = screen.getAllByText("Manage");
        fireEvent.click(manageButtons[0]!);
        expect(handleManage).toHaveBeenCalledWith("1");
    });

    it("calls onCreateClick when Create Club is clicked", () => {
        const handleCreate = vi.fn();
        render(
            <ClubsView
                clubs={mockClubs}
                search=""
                isLoading={false}
                error={null}
                onSearchChange={vi.fn()}
                onCreateClick={handleCreate}
                onManageClub={vi.fn()}
            />
        );
        fireEvent.click(screen.getByText("+ Create Club"));
        expect(handleCreate).toHaveBeenCalled();
    });
});

describe("ClubsView — search", () => {
    it("calls onSearchChange when input changes", () => {
        const handleSearch = vi.fn();
        render(
            <ClubsView
                clubs={mockClubs}
                search=""
                isLoading={false}
                error={null}
                onSearchChange={handleSearch}
                onCreateClick={vi.fn()}
                onManageClub={vi.fn()}
            />
        );
        const input = screen.getByPlaceholderText("Search clubs…");
        fireEvent.change(input, { target: { value: "alpha" } });
        expect(handleSearch).toHaveBeenCalledWith("alpha");
    });

    it("shows clear button and calls onSearchChange with empty string", () => {
        const handleSearch = vi.fn();
        render(
            <ClubsView
                clubs={mockClubs}
                search="alpha"
                isLoading={false}
                error={null}
                onSearchChange={handleSearch}
                onCreateClick={vi.fn()}
                onManageClub={vi.fn()}
            />
        );
        fireEvent.click(screen.getByLabelText("Clear search"));
        expect(handleSearch).toHaveBeenCalledWith("");
    });
});
