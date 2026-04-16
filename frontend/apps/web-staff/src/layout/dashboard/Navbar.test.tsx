import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.hoisted(() => vi.fn());
const mockClearAuth = vi.hoisted(() => vi.fn());
let currentPath = "/dashboard";
let currentUser: {
    full_name: string;
    email: string;
    role: string;
    photo_url?: string | null;
} | null = {
    full_name: "Alice Admin",
    email: "alice@test.com",
    role: "admin",
};

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>();
    return {
        ...actual,
        useLocation: () => ({ pathname: currentPath }),
        useNavigate: () => mockNavigate,
        Link: ({ children, to }: { children: ReactNode; to: string }) => (
            <a href={to}>{children}</a>
        ),
    };
});

let currentActiveClubName: string | null = "Alpha Club";

vi.mock("@repo/auth", () => {
    const makeStore = (): {
        user: {
            full_name: string;
            email: string;
            role: string;
            photo_url?: string | null;
        } | null;
        clearAuth: ReturnType<typeof vi.fn>;
        accessToken: string | null;
        setActiveClubId: ReturnType<typeof vi.fn>;
    } => ({
        user: currentUser,
        clearAuth: mockClearAuth,
        accessToken: "test-token",
        setActiveClubId: vi.fn(),
    });
    const useAuthStore = vi.fn((selector?: (s: ReturnType<typeof makeStore>) => unknown) => {
        const store = makeStore();
        return selector ? selector(store) : store;
    });
    (useAuthStore as unknown as { getState: () => ReturnType<typeof makeStore> }).getState = vi.fn(
        () => makeStore()
    );
    return {
        useAuthStore,
        useAuth: () => ({
            user: currentUser,
            role: currentUser?.role ?? null,
            isAuthenticated: currentUser !== null,
            activeClubName: currentActiveClubName,
            setActiveClubId: vi.fn(),
        }),
    };
});

vi.mock("./ProfileEditModal", () => ({
    default: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="profile-modal">Profile modal</div> : null,
}));

vi.mock("./SwitchClubModal", () => ({
    default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
        isOpen ? (
            <div data-testid="switch-club-modal">
                <button onClick={onClose}>close-modal</button>
            </div>
        ) : null,
}));

import Navbar from "./Navbar";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Navbar — brand", () => {
    beforeEach(() => {
        currentPath = "/dashboard";
        currentUser = { full_name: "Alice Admin", email: "alice@test.com", role: "admin" };
    });

    it("renders the search input", () => {
        render(<Navbar />);
        expect(screen.getByRole("textbox", { name: /search modules/i })).toBeInTheDocument();
    });

    it("calls onOpenMobile when mobile menu button is clicked", () => {
        const mockOpen = vi.fn();
        render(<Navbar mobileOpen={false} onOpenMobile={mockOpen} />);
        fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
        expect(mockOpen).toHaveBeenCalled();
    });
});

describe("Navbar — user info", () => {
    beforeEach(() => {
        currentPath = "/dashboard";
        currentUser = { full_name: "Alice Admin", email: "alice@test.com", role: "admin" };
    });

    it("renders user initials in avatar", () => {
        render(<Navbar />);
        expect(screen.getByText("AA")).toBeInTheDocument();
    });

    it("does not render user details in the navbar trigger", () => {
        render(<Navbar />);
        expect(screen.queryByText("alice@test.com")).not.toBeInTheDocument();
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    it("renders the user photo when photo_url is available", () => {
        currentUser = {
            full_name: "Alice Admin",
            email: "alice@test.com",
            role: "admin",
            photo_url: "https://example.com/avatar.png",
        };

        render(<Navbar />);
        expect(screen.getByAltText("Alice Admin")).toBeInTheDocument();
    });

    it("returns null when no user is available", () => {
        currentUser = null;

        const { container } = render(<Navbar />);
        expect(container).toBeEmptyDOMElement();
    });
});

describe("Navbar — dropdown actions", () => {
    beforeEach(() => {
        currentPath = "/dashboard";
        currentUser = { full_name: "Alice Admin", email: "alice@test.com", role: "admin" };
        mockNavigate.mockClear();
        mockClearAuth.mockClear();
    });

    it("opens dropdown with user details when avatar button clicked", () => {
        render(<Navbar />);
        fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
        expect(screen.getAllByText("Alice Admin").length).toBeGreaterThan(0);
        expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("opens ProfileEditModal when Edit Profile clicked", () => {
        render(<Navbar />);
        fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
        fireEvent.click(screen.getByText("Edit Profile"));
        expect(screen.getByTestId("profile-modal")).toBeInTheDocument();
    });

    it("renders the dropdown avatar image when the user has a photo", () => {
        currentUser = {
            full_name: "Alice Admin",
            email: "alice@test.com",
            role: "admin",
            photo_url: "https://example.com/avatar.png",
        };

        render(<Navbar />);
        fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));

        expect(screen.getAllByAltText("Alice Admin")).toHaveLength(2);
    });

    it("calls clearAuth and navigates to /login when Sign Out clicked", () => {
        render(<Navbar />);
        fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
        fireEvent.click(screen.getByText("Sign Out"));
        expect(mockClearAuth).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" });
    });

    it("closes the dropdown when clicking outside", () => {
        render(<Navbar />);
        fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();

        fireEvent.mouseDown(document.body);

        expect(screen.queryByText("Edit Profile")).not.toBeInTheDocument();
    });
});

describe("Navbar — module search", () => {
    beforeEach(() => {
        currentPath = "/dashboard";
        currentUser = { full_name: "Alice Admin", email: "alice@test.com", role: "admin" };
        mockNavigate.mockClear();
    });

    it("shows matching authorized modules in search results", () => {
        render(<Navbar />);
        fireEvent.change(screen.getByLabelText("Search modules"), { target: { value: "fin" } });
        expect(screen.getByRole("button", { name: /finance/i })).toBeInTheDocument();
    });

    it("does not show restricted modules for staff role", () => {
        currentUser = { full_name: "Sarah Staff", email: "sarah@test.com", role: "staff" };
        render(<Navbar />);
        fireEvent.change(screen.getByLabelText("Search modules"), { target: { value: "fin" } });
        expect(screen.queryByRole("button", { name: /finance/i })).not.toBeInTheDocument();
    });

    it("navigates to the selected search result", () => {
        render(<Navbar />);
        fireEvent.change(screen.getByLabelText("Search modules"), {
            target: { value: "finance" },
        });
        fireEvent.click(screen.getByRole("button", { name: /finance/i }));
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/finance" });
    });

    it("supports keyboard navigation for search results", () => {
        render(<Navbar />);

        const searchInput = screen.getByLabelText("Search modules");
        fireEvent.change(searchInput, { target: { value: "finance" } });
        fireEvent.keyDown(searchInput, { key: "ArrowDown" });
        fireEvent.keyDown(searchInput, { key: "Enter" });

        expect(mockNavigate).toHaveBeenCalledWith({ to: "/finance" });
    });

    it("wraps to the last search result on ArrowUp from the first result", () => {
        render(<Navbar />);

        const searchInput = screen.getByLabelText("Search modules");
        fireEvent.change(searchInput, { target: { value: "staff" } });
        fireEvent.keyDown(searchInput, { key: "ArrowUp" });
        fireEvent.keyDown(searchInput, { key: "Enter" });

        expect(mockNavigate).toHaveBeenCalledWith({ to: "/staff" });
    });

    it("renders inactive search results and updates the active item on hover", () => {
        render(<Navbar />);

        fireEvent.change(screen.getByLabelText("Search modules"), {
            target: { value: "s" },
        });

        const bookingsResult = screen.getByRole("button", { name: /bookings/i });
        const supportResult = screen.getByRole("button", { name: /support/i });

        expect(bookingsResult.className).toContain("text-foreground/60");
        fireEvent.mouseEnter(supportResult);
        expect(supportResult.className).toContain("bg-accent");
    });

    it("closes search results on escape and outside click", () => {
        render(<Navbar />);

        const searchInput = screen.getByLabelText("Search modules");
        fireEvent.change(searchInput, { target: { value: "finance" } });

        fireEvent.keyDown(searchInput, { key: "Escape" });
        expect(screen.queryByRole("button", { name: /finance/i })).not.toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: "finance" } });

        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole("button", { name: /finance/i })).not.toBeInTheDocument();
    });

    it("handles escape when the current search has no results", () => {
        render(<Navbar />);

        const searchInput = screen.getByLabelText("Search modules");
        fireEvent.change(searchInput, { target: { value: "zzzz" } });
        fireEvent.keyDown(searchInput, { key: "Escape" });

        expect(screen.queryByRole("button", { name: /zzzz/i })).not.toBeInTheDocument();
    });

    it("shows the search keyboard shortcut hint", () => {
        render(<Navbar />);
        expect(screen.getByText("Ctrl + K")).toBeInTheDocument();
    });

    it("focuses the search input on Ctrl+K", () => {
        render(<Navbar />);

        fireEvent.keyDown(window, { key: "k", ctrlKey: true });

        expect(screen.getByLabelText("Search modules")).toHaveFocus();
    });

    it("focuses the search input on Cmd+K", () => {
        render(<Navbar />);

        fireEvent.keyDown(window, { key: "k", metaKey: true });

        expect(screen.getByLabelText("Search modules")).toHaveFocus();
    });
});

describe("Navbar — active club pill", () => {
    beforeEach(() => {
        currentPath = "/dashboard";
        currentUser = { full_name: "Alice Admin", email: "alice@test.com", role: "admin" };
        currentActiveClubName = "Alpha Club";
    });

    it("shows active club name when activeClubName is set", () => {
        // activeClubName comes from useAuth() mock (currentActiveClubName = "Alpha Club")
        render(<Navbar />);
        expect(screen.getByText("Alpha Club")).toBeInTheDocument();
    });

    it("does not render the club pill when activeClubName is null", () => {
        currentActiveClubName = null;
        render(<Navbar />);
        expect(screen.queryByText("Active Club")).not.toBeInTheDocument();
    });
});

describe("Navbar — Switch Club", () => {
    beforeEach(() => {
        currentPath = "/dashboard";
        currentUser = { full_name: "Alice Admin", email: "alice@test.com", role: "admin" };
        currentActiveClubName = "Alpha Club";
    });

    it("opens SwitchClubModal when Switch Club is clicked in dropdown", () => {
        render(<Navbar clubs={[{ id: "c1", name: "Alpha Club" }]} />);
        fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
        fireEvent.click(screen.getByText("Switch Club"));
        expect(screen.getByTestId("switch-club-modal")).toBeInTheDocument();
    });

    it("closes SwitchClubModal when modal calls onClose", () => {
        render(<Navbar clubs={[{ id: "c1", name: "Alpha Club" }]} />);
        fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
        fireEvent.click(screen.getByText("Switch Club"));
        fireEvent.click(screen.getByText("close-modal"));
        expect(screen.queryByTestId("switch-club-modal")).not.toBeInTheDocument();
    });
});
