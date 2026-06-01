import { fireEvent, render, screen } from "@testing-library/react";
import type { MouseEvent, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.hoisted(() => vi.fn());
const mockClearAuth = vi.hoisted(() => vi.fn());
const mockLogoutMutate = vi.hoisted(() => vi.fn());
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
let currentRole: string = "staff";

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
        useLogout: () => ({
            mutate: mockLogoutMutate,
        }),
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
        currentRole = "staff";
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

describe("Sidebar — unrestricted routes (staff role)", () => {
    beforeEach(() => {
        currentRole = "staff";
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
        expect(screen.getByRole("link", { name: /^players$/i })).toBeInTheDocument();
    });

    it("renders Equipment link", () => {
        render(<Sidebar />);
        expect(screen.getByText("Equipment")).toBeInTheDocument();
    });
});

describe("Sidebar — role-restricted routes hidden from staff", () => {
    beforeEach(() => {
        currentRole = "staff";
        currentPath = "/dashboard";
    });

    it("renders Calendar link for staff role", () => {
        render(<Sidebar />);
        expect(screen.getByText("Calendar")).toBeInTheDocument();
    });

    it("does NOT render Staff link for staff role", () => {
        render(<Sidebar />);
        expect(screen.queryByText("Staff")).not.toBeInTheDocument();
    });

    it("does NOT render the Analytics section for staff role", () => {
        render(<Sidebar />);
        expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
        expect(screen.queryByText("Club Utilisation")).not.toBeInTheDocument();
    });

    it("does NOT render the Settings section for staff role", () => {
        render(<Sidebar />);
        expect(screen.queryByText("Settings")).not.toBeInTheDocument();
        expect(screen.queryByText("My Plan")).not.toBeInTheDocument();
    });
});

describe("Sidebar — role-restricted routes visible to admin", () => {
    beforeEach(() => {
        currentRole = "admin";
        currentPath = "/dashboard";
    });

    it("renders Calendar link for admin", () => {
        render(<Sidebar />);
        expect(screen.getByText("Calendar")).toBeInTheDocument();
    });

    it("renders Staff link for admin", () => {
        render(<Sidebar />);
        expect(screen.getByText("Staff")).toBeInTheDocument();
    });

    it("renders the Analytics section for admin", () => {
        render(<Sidebar />);
        expect(screen.getByText("Analytics")).toBeInTheDocument();
        expect(screen.getByText("Club Utilisation")).toBeInTheDocument();
    });

    it("does NOT render the Settings section for admin (owner only)", () => {
        render(<Sidebar />);
        expect(screen.queryByText("My Plan")).not.toBeInTheDocument();
    });
});

describe("Sidebar — all routes visible to owner", () => {
    beforeEach(() => {
        currentRole = "owner";
        currentPath = "/dashboard";
    });

    it("renders Staff link for owner", () => {
        render(<Sidebar />);
        expect(screen.getByText("Staff")).toBeInTheDocument();
    });

    it("renders the Settings section for owner", () => {
        render(<Sidebar />);
        expect(screen.getByText("Settings")).toBeInTheDocument();
        expect(screen.getByText("My Plan")).toBeInTheDocument();
        expect(screen.getByText("Cards")).toBeInTheDocument();
    });

    it("renders the Analytics section for owner", () => {
        render(<Sidebar />);
        expect(screen.getByText("Analytics")).toBeInTheDocument();
    });
});

describe("Sidebar — logout", () => {
    beforeEach(() => {
        currentRole = "staff";
        currentPath = "/dashboard";
        mockLogoutMutate.mockImplementation((_vars, options?: { onSettled?: () => void }) => {
            options?.onSettled?.();
        });
    });

    it("logs out and navigates to /login when Logout button is clicked", () => {
        render(<Sidebar />);
        const logoutBtn = screen.getByText("Logout");
        fireEvent.click(logoutBtn);
        expect(mockLogoutMutate).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" });
    });
});

describe("Sidebar — group headers", () => {
    beforeEach(() => {
        currentRole = "owner";
        currentPath = "/dashboard";
    });

    it("does not render section headers for role-gated sections when role lacks access", () => {
        currentRole = "staff";
        render(<Sidebar />);
        // Settings is gated to owner — staff should not see it
        expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    it("keeps sibling sections open when another section is toggled", () => {
        render(<Sidebar />);

        const operationsButton = screen.getByRole("button", { name: /operations/i });
        const analyticsButton = screen.getByRole("button", { name: /analytics/i });

        fireEvent.click(operationsButton);
        expect(operationsButton.nextElementSibling).toHaveClass("max-h-[40rem]");

        fireEvent.click(analyticsButton);
        expect(operationsButton.nextElementSibling).toHaveClass("max-h-[40rem]");
        expect(analyticsButton.nextElementSibling).toHaveClass("max-h-[40rem]");
    });

    it("keeps sibling subgroups open when another subgroup is toggled", () => {
        render(<Sidebar />);

        fireEvent.click(screen.getByRole("button", { name: /operations/i }));

        const bookingButton = screen.getByRole("button", { name: /^booking$/i });
        const playersButton = screen.getByRole("button", { name: /^players$/i });

        fireEvent.click(bookingButton);
        expect(bookingButton.nextElementSibling).toHaveClass("max-h-[40rem]");

        fireEvent.click(playersButton);
        expect(bookingButton.nextElementSibling).toHaveClass("max-h-[40rem]");
        expect(playersButton.nextElementSibling).toHaveClass("max-h-[40rem]");
    });
});
