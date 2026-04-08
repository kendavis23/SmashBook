import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { JSX, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMutate = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-router")>();
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../hooks", () => ({
    usePasswordResetConfirm: vi.fn(() => ({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        isSuccess: false,
    })),
}));

import { usePasswordResetConfirm } from "../hooks";

import ResetPasswordPage from "./ResetPasswordPage";

function wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("ResetPasswordPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(usePasswordResetConfirm).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: false,
            error: null,
            isSuccess: false,
        } as unknown as ReturnType<typeof usePasswordResetConfirm>);
    });

    it("renders token, new password and confirm password fields", () => {
        render(<ResetPasswordPage />, { wrapper });
        expect(screen.getByLabelText("Reset token")).toBeInTheDocument();
        expect(screen.getByLabelText("New password")).toBeInTheDocument();
        expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
    });

    it("shows validation errors when submitting empty form", () => {
        render(<ResetPasswordPage />, { wrapper });
        fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
        expect(screen.getAllByText("Required")).toHaveLength(3);
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("shows error when password is too short", () => {
        render(<ResetPasswordPage />, { wrapper });
        fireEvent.change(screen.getByLabelText("Reset token"), { target: { value: "tok" } });
        fireEvent.change(screen.getByLabelText("New password"), { target: { value: "short" } });
        fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "short" } });
        fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
        expect(screen.getByText("Must be at least 8 characters")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("shows error when passwords do not match", () => {
        render(<ResetPasswordPage />, { wrapper });
        fireEvent.change(screen.getByLabelText("Reset token"), { target: { value: "tok" } });
        fireEvent.change(screen.getByLabelText("New password"), {
            target: { value: "password123" },
        });
        fireEvent.change(screen.getByLabelText("Confirm password"), {
            target: { value: "different123" },
        });
        fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
        expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("calls mutate with token and new_password on valid submit", () => {
        render(<ResetPasswordPage />, { wrapper });
        fireEvent.change(screen.getByLabelText("Reset token"), {
            target: { value: "reset-token-abc" },
        });
        fireEvent.change(screen.getByLabelText("New password"), {
            target: { value: "newpass123" },
        });
        fireEvent.change(screen.getByLabelText("Confirm password"), {
            target: { value: "newpass123" },
        });
        fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
        expect(mockMutate).toHaveBeenCalledWith({
            token: "reset-token-abc",
            new_password: "newpass123",
        });
    });

    it("shows success state after password reset", () => {
        vi.mocked(usePasswordResetConfirm).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: false,
            error: null,
            isSuccess: true,
        } as unknown as ReturnType<typeof usePasswordResetConfirm>);
        render(<ResetPasswordPage />, { wrapper });
        expect(screen.getByText(/password updated/i)).toBeInTheDocument();
        expect(screen.getByText(/you can now sign in/i)).toBeInTheDocument();
    });

    it("navigates to /login on 'Back to sign in' button click", () => {
        render(<ResetPasswordPage />, { wrapper });
        fireEvent.click(screen.getByRole("button", { name: /back to sign in/i }));
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" });
    });

    it("shows error alert when reset fails", () => {
        vi.mocked(usePasswordResetConfirm).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
            isError: true,
            error: new Error("Invalid or expired token"),
            isSuccess: false,
        } as unknown as ReturnType<typeof usePasswordResetConfirm>);
        render(<ResetPasswordPage />, { wrapper });
        expect(screen.getByRole("alert")).toHaveTextContent("Invalid or expired token");
    });

    it("disables submit button while pending", () => {
        vi.mocked(usePasswordResetConfirm).mockReturnValue({
            mutate: mockMutate,
            isPending: true,
            isError: false,
            error: null,
            isSuccess: false,
        } as unknown as ReturnType<typeof usePasswordResetConfirm>);
        render(<ResetPasswordPage />, { wrapper });
        expect(screen.getByRole("button", { name: /resetting/i })).toBeDisabled();
    });
});
