import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>();
    return {
        ...actual,
        Link: ({ children, to }: { children: ReactNode; to: string }) => (
            <a href={to}>{children}</a>
        ),
    };
});

vi.mock("../hooks", () => ({
    useAuth: vi.fn(() => ({
        user: { full_name: "Carol Viewer", email: "carol@test.com", role: "viewer" as const },
        isAuthenticated: true,
        role: "viewer" as const,
        accessToken: "tok",
        tenantSubdomain: null,
    })),
}));

import UnauthorizedPage from "./UnauthorizedPage";

describe("UnauthorizedPage", () => {
    it("renders 403 heading", () => {
        render(<UnauthorizedPage />);
        expect(screen.getByText("403")).toBeInTheDocument();
    });

    it("renders Access Denied heading", () => {
        render(<UnauthorizedPage />);
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
    });

    it("shows current user role when user is logged in", () => {
        render(<UnauthorizedPage />);
        expect(screen.getByText(/viewer/i)).toBeInTheDocument();
    });

    it("renders a link to go back to dashboard", () => {
        render(<UnauthorizedPage />);
        expect(screen.getByRole("link", { name: /go to dashboard/i })).toBeInTheDocument();
    });

    it("renders a link to go home", () => {
        render(<UnauthorizedPage />);
        expect(screen.getByRole("link", { name: /go home/i })).toBeInTheDocument();
    });
});
