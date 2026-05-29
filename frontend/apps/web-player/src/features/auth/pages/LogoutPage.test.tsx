import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockLogoutMutate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock("@repo/auth", () => ({
    useLogout: () => ({
        mutate: mockLogoutMutate,
    }),
}));

mockLogoutMutate.mockImplementation((_vars, options?: { onSettled?: () => void }) => {
    options?.onSettled?.();
});

import LogoutPage from "./LogoutPage";

describe("LogoutPage", () => {
    it("renders the logging out message", () => {
        render(<LogoutPage />);
        expect(screen.getByText(/logging out/i)).toBeInTheDocument();
    });

    it("logs out on mount and redirects to login", () => {
        render(<LogoutPage />);
        expect(mockLogoutMutate).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/login", replace: true });
    });
});
