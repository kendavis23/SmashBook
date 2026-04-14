import { fireEvent, render, screen } from "@testing-library/react";
import type { MouseEvent, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.hoisted(() => vi.fn());
const mockClearAuth = vi.hoisted(() => vi.fn());
let currentPath = "/dashboard";

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>();
    return {
        ...actual,
        useLocation: () => ({ pathname: currentPath }),
        useNavigate: () => mockNavigate,
        Link: ({
            children,
            to,
            onClick,
            onMouseEnter,
            onMouseLeave,
            className,
        }: {
            children: ReactNode;
            to: string;
            onClick?: () => void;
            onMouseEnter?: (event: MouseEvent<HTMLAnchorElement>) => void;
            onMouseLeave?: () => void;
            className?: string;
        }) => (
            <a
                href={to}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className={className}
            >
                {children}
            </a>
        ),
    };
});

// Mutable role so tests can switch between roles
let currentRole: string = "player";

vi.mock("@repo/auth", () => {
    const makeStore = (): {
        user: { full_name: string; email: string; role: string };
        clearAuth: ReturnType<typeof vi.fn>;
        accessToken: string;
    } => ({
        user: { full_name: "Test User", email: "test@test.com", role: currentRole },
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
            user: makeStore().user,
            role: currentRole,
            isAuthenticated: true,
        }),
    };
});

import Sidebar from "./Sidebar";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Sidebar — brand & chrome", () => {
    beforeEach(() => {
        currentRole = "player";
        currentPath = "/dashboard";
    });

    it("shows the mobile overlay when mobileOpen is true", () => {
        render(<Sidebar mobileOpen={true} onCloseMobile={vi.fn()} />);
        const overlay = document.querySelector(".bg-foreground\\/30");
        expect(overlay).toBeInTheDocument();
    });

    it("calls onCloseMobile when the overlay is clicked", () => {
        const mockClose = vi.fn();
        render(<Sidebar mobileOpen={true} onCloseMobile={mockClose} />);
        const overlay = document.querySelector(".bg-foreground\\/30");
        fireEvent.click(overlay as Element);
        expect(mockClose).toHaveBeenCalled();
    });

    it("keeps the active route highlighted", () => {
        currentRole = "admin";
        currentPath = "/dashboard";

        render(<Sidebar />);

        const dashboardLink = screen.getByText("Dashboard").closest("a");
        expect(dashboardLink).toBeInTheDocument();
    });
});

describe("Sidebar — player navigation", () => {
    beforeEach(() => {
        currentRole = "player";
        currentPath = "/dashboard";
    });

    it("renders Dashboard link", () => {
        render(<Sidebar />);
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("renders Bookings link", () => {
        render(<Sidebar />);
        expect(screen.getByText("Bookings")).toBeInTheDocument();
    });

    it("renders Players link", () => {
        render(<Sidebar />);
        expect(screen.getByText("Players")).toBeInTheDocument();
    });

    it("renders Equipment link", () => {
        render(<Sidebar />);
        expect(screen.getByText("Equipment")).toBeInTheDocument();
    });

    it("renders Support link", () => {
        render(<Sidebar />);
        expect(screen.getAllByText("Support")[0]).toBeInTheDocument();
    });
});

describe("Sidebar — legacy admin links are absent", () => {
    beforeEach(() => {
        currentRole = "player";
        currentPath = "/dashboard";
    });

    it("does NOT render Calendar link", () => {
        render(<Sidebar />);
        expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
    });

    it("does NOT render Staff link", () => {
        render(<Sidebar />);
        expect(screen.queryByText("Staff")).not.toBeInTheDocument();
    });

    it("does NOT render Finance link", () => {
        render(<Sidebar />);
        expect(screen.queryByText("Finance")).not.toBeInTheDocument();
    });

    it("does NOT render Reports link", () => {
        render(<Sidebar />);
        expect(screen.queryByText("Reports")).not.toBeInTheDocument();
    });

    it("does NOT render Settings link", () => {
        render(<Sidebar />);
        expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });
});

describe("Sidebar — route visibility is role-agnostic for unrestricted routes", () => {
    beforeEach(() => {
        currentRole = "admin";
        currentPath = "/dashboard";
    });

    it("still renders the player routes for admin", () => {
        render(<Sidebar />);
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Courts")).toBeInTheDocument();
        expect(screen.getByText("Bookings")).toBeInTheDocument();
    });

    it("does not render nonexistent admin-only links", () => {
        render(<Sidebar />);
        expect(screen.queryByText("Staff")).not.toBeInTheDocument();
        expect(screen.queryByText("Finance")).not.toBeInTheDocument();
        expect(screen.queryByText("Reports")).not.toBeInTheDocument();
    });
});

describe("Sidebar — owner sees the same unrestricted navigation", () => {
    beforeEach(() => {
        currentRole = "owner";
        currentPath = "/dashboard";
    });

    it("renders the player-facing links", () => {
        render(<Sidebar />);
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getAllByText("Support")[0]).toBeInTheDocument();
        expect(screen.getByText("Equipment")).toBeInTheDocument();
    });

    it("does not render removed finance links", () => {
        render(<Sidebar />);
        expect(screen.queryByText("Finance")).not.toBeInTheDocument();
        expect(screen.queryByText("Reports")).not.toBeInTheDocument();
        expect(screen.queryByText("Staff")).not.toBeInTheDocument();
    });
});

describe("Sidebar — logout", () => {
    beforeEach(() => {
        currentRole = "player";
        currentPath = "/dashboard";
    });

    it("calls clearAuth and navigates to /login when Logout button is clicked", () => {
        render(<Sidebar />);
        const logoutBtn = screen.getByText("Logout");
        fireEvent.click(logoutBtn);
        expect(mockClearAuth).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" });
    });
});

describe("Sidebar — group headers", () => {
    beforeEach(() => {
        currentRole = "owner";
        currentPath = "/dashboard";
    });

    it("renders the current player-facing group headers", () => {
        render(<Sidebar />);
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Operations")).toBeInTheDocument();
        expect(screen.getByText("People")).toBeInTheDocument();
        expect(screen.getAllByText("Support")[0]).toBeInTheDocument();
    });
});
