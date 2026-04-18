import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubsContainer from "./ClubsContainer";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
    useSearch: () => ({}),
}));

vi.mock("../../hooks", () => ({
    useListClubs: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
    canViewClubList: vi.fn(),
    canCreateClub: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
}));

import { useListClubs } from "../../hooks";
import { useClubAccess, canViewClubList, canCreateClub } from "../../store";

const mockUseListClubs = useListClubs as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;
const mockCanViewClubList = canViewClubList as ReturnType<typeof vi.fn>;
const mockCanCreateClub = canCreateClub as ReturnType<typeof vi.fn>;

const mockClubs = [
    { id: "club-1", name: "Alpha Club", address: "1 Main St", currency: "GBP" },
    { id: "club-2", name: "Beta Club", address: null, currency: "EUR" },
];

describe("ClubsContainer — loading state", () => {
    it("renders loading indicator", () => {
        mockUseListClubs.mockReturnValue({
            data: [],
            isLoading: true,
            error: null,
            refetch: vi.fn(),
        });
        mockUseClubAccess.mockReturnValue({ role: "owner", clubId: undefined });
        mockCanViewClubList.mockReturnValue(true);
        mockCanCreateClub.mockReturnValue(true);
        render(<ClubsContainer />);
        expect(screen.getByText("Loading clubs…")).toBeInTheDocument();
    });
});

describe("ClubsContainer — error state", () => {
    it("renders error message", () => {
        mockUseListClubs.mockReturnValue({
            data: [],
            isLoading: false,
            error: new Error("Network error"),
            refetch: vi.fn(),
        });
        mockUseClubAccess.mockReturnValue({ role: "owner", clubId: undefined });
        mockCanViewClubList.mockReturnValue(true);
        mockCanCreateClub.mockReturnValue(true);
        render(<ClubsContainer />);
        expect(screen.getByText("Network error")).toBeInTheDocument();
    });
});

describe("ClubsContainer — club list", () => {
    it("renders all clubs", () => {
        mockUseListClubs.mockReturnValue({
            data: mockClubs,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });
        mockUseClubAccess.mockReturnValue({ role: "owner", clubId: undefined });
        mockCanViewClubList.mockReturnValue(true);
        mockCanCreateClub.mockReturnValue(true);
        render(<ClubsContainer />);
        expect(screen.getByText("Alpha Club")).toBeInTheDocument();
        expect(screen.getByText("Beta Club")).toBeInTheDocument();
    });

    it("filters clubs by search", () => {
        mockUseListClubs.mockReturnValue({
            data: mockClubs,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });
        mockUseClubAccess.mockReturnValue({ role: "owner", clubId: undefined });
        mockCanViewClubList.mockReturnValue(true);
        mockCanCreateClub.mockReturnValue(true);
        render(<ClubsContainer />);
        fireEvent.change(screen.getByPlaceholderText("Search clubs…"), {
            target: { value: "alpha" },
        });
        expect(screen.getByText("Alpha Club")).toBeInTheDocument();
        expect(screen.queryByText("Beta Club")).not.toBeInTheDocument();
    });

    it("navigates to club on Manage click", () => {
        mockUseListClubs.mockReturnValue({
            data: mockClubs,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });
        mockUseClubAccess.mockReturnValue({ role: "owner", clubId: undefined });
        mockCanViewClubList.mockReturnValue(true);
        mockCanCreateClub.mockReturnValue(true);
        render(<ClubsContainer />);
        fireEvent.click(screen.getAllByText("Manage")[0]!);
        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/clubs/$clubId",
            params: { clubId: "club-1" },
        });
    });
});

describe("ClubsContainer — create club navigation", () => {
    it("navigates to /clubs/new when New Club is clicked", () => {
        mockUseListClubs.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });
        mockUseClubAccess.mockReturnValue({ role: "owner", clubId: undefined });
        mockCanViewClubList.mockReturnValue(true);
        mockCanCreateClub.mockReturnValue(true);
        render(<ClubsContainer />);
        fireEvent.click(screen.getAllByText("New Club")[0]!);
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/clubs/new" });
    });

    it("hides New Club button for non-owner roles", () => {
        mockUseListClubs.mockReturnValue({
            data: mockClubs,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });
        mockUseClubAccess.mockReturnValue({ role: "admin", clubId: "club-1" });
        mockCanViewClubList.mockReturnValue(false);
        mockCanCreateClub.mockReturnValue(false);
        render(<ClubsContainer />);
        expect(screen.queryByText("New Club")).not.toBeInTheDocument();
    });
});

describe("ClubsContainer — non-owner redirect", () => {
    it("redirects to club detail when canViewClubList is false and clubId is set", () => {
        mockUseListClubs.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });
        mockUseClubAccess.mockReturnValue({ role: "staff", clubId: "club-99" });
        mockCanViewClubList.mockReturnValue(false);
        mockCanCreateClub.mockReturnValue(false);
        render(<ClubsContainer />);
        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/clubs/$clubId",
            params: { clubId: "club-99" },
        });
    });
});
