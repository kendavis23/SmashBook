import { useLogin } from "../hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { JSX, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginForm from "./LoginForm";

const mockMutate = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../hooks", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../hooks")>();
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

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

function wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("LoginForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useLogin).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: false,
            error: null,
        } as unknown as ReturnType<typeof useLogin>);
    });

    it("renders club, email and password inputs", () => {
        render(<LoginForm />, { wrapper });
        expect(screen.getByPlaceholderText("your-company")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    });

    it("renders the submit button", () => {
        render(<LoginForm />, { wrapper });
        expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("shows validation errors when submitting empty form", () => {
        render(<LoginForm />, { wrapper });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        expect(screen.getAllByText("Required")).toHaveLength(3);
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("calls mutate with form data on valid submit", () => {
        render(<LoginForm />, { wrapper });
        fireEvent.change(screen.getByPlaceholderText("your-company"), {
            target: { value: "myclub" },
        });
        fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
            target: { value: "admin@test.com" },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter password"), {
            target: { value: "secret123" },
        });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        expect(mockMutate).toHaveBeenCalledWith(
            { tenant_subdomain: "myclub", email: "admin@test.com", password: "secret123" },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("shows error alert when isError is true", () => {
        vi.mocked(useLogin).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: true,
            error: new Error("Invalid credentials"),
        } as unknown as ReturnType<typeof useLogin>);
        render(<LoginForm />, { wrapper });
        expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    });

    it("disables submit button while pending", () => {
        vi.mocked(useLogin).mockReturnValue({
            mutate: mockMutate,
            isPending: true,
            isError: false,
            error: null,
        } as unknown as ReturnType<typeof useLogin>);
        render(<LoginForm />, { wrapper });
        expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    });

    it("navigates to /dashboard on successful login", () => {
        mockMutate.mockImplementation((_data: unknown, options: { onSuccess: () => void }) => {
            options.onSuccess();
        });
        render(<LoginForm />, { wrapper });
        fireEvent.change(screen.getByPlaceholderText("your-company"), {
            target: { value: "myclub" },
        });
        fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
            target: { value: "admin@test.com" },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter password"), {
            target: { value: "secret123" },
        });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
});
