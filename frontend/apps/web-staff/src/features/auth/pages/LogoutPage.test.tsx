import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { JSX, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockClearAuth = vi.hoisted(() => vi.fn());
const mockCancelQueries = vi.fn();
const mockClear = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock("../store", () => {
    const store = { clearAuth: mockClearAuth, accessToken: "tok", user: null };
    const useAuthStore = vi.fn((selector?: (s: typeof store) => unknown) =>
        selector ? selector(store) : store
    );
    (useAuthStore as unknown as { getState: () => typeof store }).getState = vi.fn(() => store);
    return { useAuthStore };
});

import LogoutPage from "./LogoutPage";

function wrapper({ children }: { children: ReactNode }): JSX.Element {
    const client = new QueryClient();
    client.cancelQueries = mockCancelQueries;
    client.clear = mockClear;
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("LogoutPage", () => {
    it("renders the logging out message", () => {
        render(<LogoutPage />, { wrapper });
        expect(screen.getByText(/logging out/i)).toBeInTheDocument();
    });

    it("calls clearAuth on mount", () => {
        render(<LogoutPage />, { wrapper });
        expect(mockClearAuth).toHaveBeenCalled();
    });

    it("clears query cache on mount", () => {
        render(<LogoutPage />, { wrapper });
        expect(mockCancelQueries).toHaveBeenCalled();
        expect(mockClear).toHaveBeenCalled();
    });

    it("removes auth keys from localStorage on mount", () => {
        localStorage.setItem("access_token", "tok");
        localStorage.setItem("refresh_token", "ref");
        render(<LogoutPage />, { wrapper });
        expect(localStorage.getItem("access_token")).toBeNull();
        expect(localStorage.getItem("refresh_token")).toBeNull();
    });
});
