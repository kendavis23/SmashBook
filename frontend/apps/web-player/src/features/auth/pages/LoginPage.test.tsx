import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { JSX, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "./LoginPage";

const mockMutate = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock("@repo/auth", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@repo/auth")>();
    return {
        ...actual,
        useLogin: vi.fn(() => ({
            mutate: mockMutate,
            isPending: false,
            isError: false,
            error: null,
        })),
    };
});

import { useLogin } from "@repo/auth";

function wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("LoginPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useLogin).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: false,
            error: null,
        } as unknown as ReturnType<typeof useLogin>);
    });

    it("renders all form fields and submit button", () => {
        render(<LoginPage />, { wrapper });
        expect(screen.getByLabelText("Club")).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("shows validation errors when submitting empty form", () => {
        render(<LoginPage />, { wrapper });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        expect(screen.getAllByText("Required")).toHaveLength(3);
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("calls mutate with form data on valid submit", () => {
        render(<LoginPage />, { wrapper });
        fireEvent.change(screen.getByLabelText("Club"), { target: { value: "myclub" } });
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@test.com" } });
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        expect(mockMutate).toHaveBeenCalledWith(
            { tenant_subdomain: "myclub", email: "admin@test.com", password: "secret123" },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("navigates to /dashboard on successful login", () => {
        mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
            options.onSuccess();
        });
        render(<LoginPage />, { wrapper });
        fireEvent.change(screen.getByLabelText("Club"), { target: { value: "myclub" } });
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@test.com" } });
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });

    it("shows error alert when login fails", () => {
        vi.mocked(useLogin).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: true,
            error: new Error("Invalid credentials"),
        } as unknown as ReturnType<typeof useLogin>);
        render(<LoginPage />, { wrapper });
        expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    });

    it("disables submit button while pending", () => {
        vi.mocked(useLogin).mockReturnValue({
            mutate: mockMutate,
            isPending: true,
            isError: false,
            error: null,
        } as unknown as ReturnType<typeof useLogin>);
        render(<LoginPage />, { wrapper });
        expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    });

    it("clears validation errors when field is filled in", () => {
        render(<LoginPage />, { wrapper });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        expect(screen.getAllByText("Required")).toHaveLength(3);
        fireEvent.change(screen.getByLabelText("Club"), { target: { value: "myclub" } });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        expect(screen.getAllByText("Required")).toHaveLength(2);
    });
});
