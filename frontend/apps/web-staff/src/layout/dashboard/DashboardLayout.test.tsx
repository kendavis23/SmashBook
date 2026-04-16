import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { JSX, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./ProfileEditModal", () => ({
    default: () => <div data-testid="profile-edit-modal" />,
}));

vi.mock("./SwitchClubModal", () => ({
    default: () => null,
}));

vi.mock("../../providers/ThemeProvider", () => ({
    useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@repo/design-system", () => ({
    darkTheme: "dark",
    lightTheme: "light",
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>();
    return {
        ...actual,
        Outlet: () => <div data-testid="outlet-content" />,
        useLocation: () => ({ pathname: "/dashboard" }),
        useNavigate: () => vi.fn(),
        Link: ({ children, to }: { children: ReactNode; to: string }) => (
            <a href={to}>{children}</a>
        ),
    };
});

vi.mock("@repo/auth", () => {
    const store = {
        user: { full_name: "Jane Staff", email: "jane@test.com", role: "staff" as const },
        clearAuth: vi.fn(),
        accessToken: "test-token",
        setAuth: vi.fn(),
        activeClubId: null,
        activeClubName: null,
        setActiveClubId: vi.fn(),
    };
    const useAuthStore = vi.fn((selector?: (s: typeof store) => unknown) =>
        selector ? selector(store) : store
    );
    (useAuthStore as unknown as { getState: () => typeof store }).getState = vi.fn(() => store);
    return {
        useAuthStore,
        useInitAuth: () => ({ isLoading: false, isError: false }),
        useAuth: () => ({
            user: store.user,
            role: "staff",
            isAuthenticated: true,
            activeClubName: null,
            clubs: [{ club_id: "c1", club_name: "Test Club", role: "staff" }],
            setActiveClubId: vi.fn(),
        }),
    };
});

vi.mock("@repo/staff-domain/hooks", () => ({
    useListClubs: () => ({ data: [], isLoading: false }),
}));

import DashboardLayout from "./DashboardLayout";

function wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("DashboardLayout", () => {
    it("renders sidebar, navbar and outlet", () => {
        const { container } = render(<DashboardLayout />, { wrapper });
        expect(screen.getByTestId("outlet-content")).toBeInTheDocument();
        expect(container.querySelector("header")).toBeInTheDocument();
        expect(container.querySelector("main")).toBeInTheDocument();
    });

    it("renders the smashBook brand text", () => {
        render(<DashboardLayout />, { wrapper });
        expect(screen.getByText(/smash/i)).toBeInTheDocument();
    });
});
