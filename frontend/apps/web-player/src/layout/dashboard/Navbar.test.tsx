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
    full_name: "Pat Player",
    email: "alice@test.com",
    role: "player",
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
    } => ({
        user: currentUser,
        clearAuth: mockClearAuth,
        accessToken: "test-token",
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
        }),
    };
});

vi.mock("./ProfileEditModal", () => ({
    default: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="profile-modal">Profile modal</div> : null,
}));

import Navbar from "./Navbar";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Navbar — brand", () => {
    beforeEach(() => {
        currentPath = "/dashboard";
        currentUser = { full_name: "Pat Player", email: "alice@test.com", role: "player" };
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
        currentUser = { full_name: "Pat Player", email: "alice@test.com", role: "player" };
    });

    it("renders user initials in avatar", () => {
        render(<Navbar />);
        expect(screen.getByText("PP")).toBeInTheDocument();
    });

    it("does not render user details in the navbar trigger", () => {
        render(<Navbar />);
        expect(screen.queryByText("alice@test.com")).not.toBeInTheDocument();
        expect(screen.queryByText("Player")).not.toBeInTheDocument();
    });

    it("renders the user photo when photo_url is available", () => {
        currentUser = {
            full_name: "Pat Player",
            email: "alice@test.com",
            role: "player",
            photo_url: "https://example.com/avatar.png",
        };

        render(<Navbar />);
        expect(screen.getByAltText("Pat Player")).toBeInTheDocument();
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
        currentUser = { full_name: "Pat Player", email: "alice@test.com", role: "player" };
        mockNavigate.mockClear();
        mockClearAuth.mockClear();
    });

    it("opens dropdown with user details when avatar button clicked", () => {
        render(<Navbar />);
        fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
        expect(screen.getAllByText("Pat Player").length).toBeGreaterThan(0);
        expect(screen.getByText("alice@test.com")).toBeInTheDocument();
        expect(screen.getByText("Player")).toBeInTheDocument();
    });

    it("opens ProfileEditModal when Edit Profile clicked", () => {
        render(<Navbar />);
        fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));
        fireEvent.click(screen.getByText("Edit Profile"));
        expect(screen.getByTestId("profile-modal")).toBeInTheDocument();
    });

    it("renders the dropdown avatar image when the user has a photo", () => {
        currentUser = {
            full_name: "Pat Player",
            email: "alice@test.com",
            role: "player",
            photo_url: "https://example.com/avatar.png",
        };

        render(<Navbar />);
        fireEvent.click(screen.getByRole("button", { name: "Open profile menu" }));

        expect(screen.getAllByAltText("Pat Player")).toHaveLength(2);
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
        currentUser = { full_name: "Pat Player", email: "alice@test.com", role: "player" };
        mockNavigate.mockClear();
    });

    it("shows matching current modules in search results", () => {
        render(<Navbar />);
        fireEvent.change(screen.getByLabelText("Search modules"), { target: { value: "supp" } });
        expect(screen.getByRole("button", { name: /support/i })).toBeInTheDocument();
    });

    it("shows unrestricted modules even for a non-player role string", () => {
        currentUser = { full_name: "Sarah Staff", email: "sarah@test.com", role: "staff" };
        render(<Navbar />);
        fireEvent.change(screen.getByLabelText("Search modules"), { target: { value: "supp" } });
        expect(screen.getByRole("button", { name: /support/i })).toBeInTheDocument();
    });

    it("navigates to the selected search result", () => {
        render(<Navbar />);
        fireEvent.change(screen.getByLabelText("Search modules"), {
            target: { value: "support" },
        });
        fireEvent.click(screen.getByRole("button", { name: /support/i }));
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/support" });
    });

    it("supports keyboard navigation for search results", () => {
        render(<Navbar />);

        const searchInput = screen.getByLabelText("Search modules");
        fireEvent.change(searchInput, { target: { value: "support" } });
        fireEvent.keyDown(searchInput, { key: "ArrowDown" });
        fireEvent.keyDown(searchInput, { key: "Enter" });

        expect(mockNavigate).toHaveBeenCalledWith({ to: "/support" });
    });

    it("wraps to the last search result on ArrowUp from the first result", () => {
        render(<Navbar />);

        const searchInput = screen.getByLabelText("Search modules");
        fireEvent.change(searchInput, { target: { value: "s" } });
        fireEvent.keyDown(searchInput, { key: "ArrowUp" });
        fireEvent.keyDown(searchInput, { key: "Enter" });

        expect(mockNavigate).toHaveBeenCalledWith({ to: "/support" });
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
        fireEvent.change(searchInput, { target: { value: "support" } });

        fireEvent.keyDown(searchInput, { key: "Escape" });
        expect(screen.queryByRole("button", { name: /support/i })).not.toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: "support" } });

        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole("button", { name: /support/i })).not.toBeInTheDocument();
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
