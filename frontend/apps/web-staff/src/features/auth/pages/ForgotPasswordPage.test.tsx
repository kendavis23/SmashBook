import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { JSX, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMutate = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>();
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../hooks", () => ({
    usePasswordResetRequest: vi.fn(() => ({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        isSuccess: false,
    })),
}));

import { usePasswordResetRequest } from "../hooks";

import ForgotPasswordPage from "./ForgotPasswordPage";

function wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("ForgotPasswordPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(usePasswordResetRequest).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: false,
            error: null,
            isSuccess: false,
        } as unknown as ReturnType<typeof usePasswordResetRequest>);
    });

    it("renders club, email fields and submit button", () => {
        render(<ForgotPasswordPage />, { wrapper });
        expect(screen.getByLabelText("Club")).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /send reset instructions/i })
        ).toBeInTheDocument();
    });

    it("shows validation errors when submitting empty form", () => {
        render(<ForgotPasswordPage />, { wrapper });
        fireEvent.click(screen.getByRole("button", { name: /send reset instructions/i }));
        expect(screen.getAllByText("Required")).toHaveLength(2);
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("calls mutate with club and email on valid submit", () => {
        render(<ForgotPasswordPage />, { wrapper });
        fireEvent.change(screen.getByLabelText("Club"), { target: { value: "myclub" } });
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@test.com" } });
        fireEvent.click(screen.getByRole("button", { name: /send reset instructions/i }));
        expect(mockMutate).toHaveBeenCalledWith({
            tenant_subdomain: "myclub",
            email: "user@test.com",
        });
    });

    it("shows success state with countdown after request", () => {
        vi.mocked(usePasswordResetRequest).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: false,
            error: null,
            isSuccess: true,
        } as unknown as ReturnType<typeof usePasswordResetRequest>);
        render(<ForgotPasswordPage />, { wrapper });
        expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
        expect(screen.getByText(/redirecting to password reset/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /go now/i })).toBeInTheDocument();
    });

    it("navigates to /reset-password when 'Go now' is clicked", () => {
        vi.mocked(usePasswordResetRequest).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: false,
            error: null,
            isSuccess: true,
        } as unknown as ReturnType<typeof usePasswordResetRequest>);
        render(<ForgotPasswordPage />, { wrapper });
        fireEvent.click(screen.getByRole("button", { name: /go now/i }));
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/reset-password" });
    });

    it("navigates to /login when 'Back to sign in' is clicked", () => {
        render(<ForgotPasswordPage />, { wrapper });
        fireEvent.click(screen.getByRole("button", { name: /back to sign in/i }));
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" });
    });

    it("shows error alert when request fails", () => {
        vi.mocked(usePasswordResetRequest).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: true,
            error: new Error("Email not found"),
            isSuccess: false,
        } as unknown as ReturnType<typeof usePasswordResetRequest>);
        render(<ForgotPasswordPage />, { wrapper });
        expect(screen.getByRole("alert")).toHaveTextContent("Email not found");
    });

    it("disables submit button while pending", () => {
        vi.mocked(usePasswordResetRequest).mockReturnValue({
            mutate: mockMutate,
            isPending: true,
            isError: false,
            error: null,
            isSuccess: false,
        } as unknown as ReturnType<typeof usePasswordResetRequest>);
        render(<ForgotPasswordPage />, { wrapper });
        expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    });

    it("auto-navigates to /reset-password after 60s countdown", () => {
        vi.useFakeTimers();
        vi.mocked(usePasswordResetRequest).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: false,
            error: null,
            isSuccess: true,
        } as unknown as ReturnType<typeof usePasswordResetRequest>);
        render(<ForgotPasswordPage />, { wrapper });
        act(() => {
            vi.advanceTimersByTime(60_000);
        });
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/reset-password" });
        vi.useRealTimers();
    });
});
