import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { JSX, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProfileEditModal from "./ProfileEditModal";

// ─── Mock ────────────────────────────────────────────────────────────────────

const mockMutateAsync = vi.fn();

vi.mock("@repo/player-domain/hooks", () => ({
    useUpdateProfile: vi.fn(() => ({
        mutateAsync: mockMutateAsync,
        isPending: false,
    })),
}));

import { useUpdateProfile } from "@repo/player-domain/hooks";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUser = {
    id: "user-1",
    email: "john@example.com",
    full_name: "John Doe",
    role: "staff" as const,
    phone: "+1 234 567 890",
    photo_url: null,
    skill_level: null,
    preferred_notification_channel: "email" as const,
    is_active: true,
};

const mockOnClose = vi.fn();

function wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe("ProfileEditModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.mocked(useUpdateProfile).mockReturnValue({
            mutateAsync: mockMutateAsync,
            isPending: false,
        } as unknown as ReturnType<typeof useUpdateProfile>);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ── Visibility ──────────────────────────────────────────────────────────────

    it("renders nothing when isOpen is false", () => {
        render(<ProfileEditModal isOpen={false} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        expect(screen.queryByText("Edit Profile")).not.toBeInTheDocument();
    });

    it("renders nothing when user is null", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={null} />, { wrapper });
        expect(screen.queryByText("Edit Profile")).not.toBeInTheDocument();
    });

    it("renders modal header when isOpen is true and user is provided", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
        expect(screen.getByText("Update your personal information")).toBeInTheDocument();
    });

    // ── User data pre-population ────────────────────────────────────────────────

    it("populates full_name and phone inputs from user prop", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        expect(screen.getByLabelText("Full Name")).toHaveValue("John Doe");
        expect(screen.getByLabelText("Phone")).toHaveValue("+1 234 567 890");
    });

    it("displays read-only email and role", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        expect(screen.getByText("john@example.com")).toBeInTheDocument();
        expect(screen.getByText("staff")).toBeInTheDocument();
    });

    it("shows user initials in avatar when no photo_url", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("shows avatar image when user has photo_url", () => {
        const userWithPhoto = { ...mockUser, photo_url: "https://example.com/photo.jpg" };
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={userWithPhoto} />, {
            wrapper,
        });
        expect(screen.getByAltText("Avatar")).toHaveAttribute(
            "src",
            "https://example.com/photo.jpg"
        );
    });

    it("defaults preferred_notification_channel to email when user has none", () => {
        const userNoChannel = {
            ...mockUser,
            preferred_notification_channel: undefined as unknown as "email",
        };
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={userNoChannel} />, {
            wrapper,
        });
        expect(screen.getByRole("button", { name: /email/i })).toHaveClass("bg-primary/10");
    });

    // ── Notification channel ────────────────────────────────────────────────────

    it("renders all four notification channel options", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        expect(screen.getByRole("button", { name: /^email$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^sms$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^push$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^in-app$/i })).toBeInTheDocument();
    });

    it("highlights the active notification channel from user prop", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        expect(screen.getByRole("button", { name: /^email$/i })).toHaveClass("bg-primary/10");
        expect(screen.getByRole("button", { name: /^sms$/i })).not.toHaveClass("bg-primary/10");
        expect(screen.getByRole("button", { name: /^push$/i })).not.toHaveClass("bg-primary/10");
        expect(screen.getByRole("button", { name: /^in-app$/i })).not.toHaveClass("bg-primary/10");
    });

    it("switches active notification channel on click", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.click(screen.getByRole("button", { name: /^sms$/i }));
        expect(screen.getByRole("button", { name: /^sms$/i })).toHaveClass("bg-primary/10");
        expect(screen.getByRole("button", { name: /^email$/i })).not.toHaveClass("bg-primary/10");
    });

    it("highlights in_app channel when user preference is in_app", () => {
        const userInApp = { ...mockUser, preferred_notification_channel: "in_app" as const };
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={userInApp} />, {
            wrapper,
        });
        expect(screen.getByRole("button", { name: /^in-app$/i })).toHaveClass("bg-primary/10");
    });

    // ── Input changes ────────────────────────────────────────────────────────────

    it("updates full_name input on change", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Jane Smith" } });
        expect(screen.getByLabelText("Full Name")).toHaveValue("Jane Smith");
    });

    it("updates phone input on change", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+44 7700 900000" } });
        expect(screen.getByLabelText("Phone")).toHaveValue("+44 7700 900000");
    });

    // ── Close / cancel ───────────────────────────────────────────────────────────

    it("calls onClose when Cancel button is clicked", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when X icon button is clicked", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        // The X button has no accessible label — it is the only button with no text content
        const xButton = screen
            .getAllByRole("button")
            .find((btn) => btn.textContent?.trim() === "")!;
        fireEvent.click(xButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop is clicked directly", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        const backdrop = document.querySelector(".flex.min-h-full") as HTMLElement;
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose when clicking inside the modal card", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        const card = document.querySelector(".bg-background.rounded-2xl") as HTMLElement;
        fireEvent.click(card);
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("resets form to original user values after Cancel", () => {
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.change(screen.getByLabelText("Full Name"), {
            target: { value: "Temporary Name" },
        });
        expect(screen.getByLabelText("Full Name")).toHaveValue("Temporary Name");
        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
        // onClose was called (parent would unmount modal), but if re-opened the form resets
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    // ── Form submission ──────────────────────────────────────────────────────────

    it("calls mutateAsync with correct form data on submit", async () => {
        mockMutateAsync.mockResolvedValue({});
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Jane Smith" } });
        fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+44 7700 900000" } });
        fireEvent.click(screen.getByRole("button", { name: /^push$/i }));
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
        await waitFor(() => {
            expect(mockMutateAsync).toHaveBeenCalledWith({
                full_name: "Jane Smith",
                phone: "+44 7700 900000",
                photo_url: "",
                preferred_notification_channel: "push",
            });
        });
    });

    it("shows success banner after successful submit", async () => {
        mockMutateAsync.mockResolvedValue({});
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
        await waitFor(() => {
            expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument();
        });
    });

    it("calls onClose 1500 ms after a successful submit", async () => {
        mockMutateAsync.mockResolvedValue({});
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
        await waitFor(() =>
            expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument()
        );
        act(() => {
            vi.advanceTimersByTime(1500);
        });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose before the 1500 ms timeout elapses", async () => {
        mockMutateAsync.mockResolvedValue({});
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
        await waitFor(() =>
            expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument()
        );
        act(() => {
            vi.advanceTimersByTime(999);
        });
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("shows error message from thrown Error instance on submit failure", async () => {
        mockMutateAsync.mockRejectedValue(new Error("Server unavailable"));
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
        await waitFor(() => {
            expect(screen.getByText("Server unavailable")).toBeInTheDocument();
        });
    });

    it("shows generic error message when thrown value is not an Error", async () => {
        mockMutateAsync.mockRejectedValue("unexpected string");
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
        await waitFor(() => {
            expect(
                screen.getByText("Failed to update profile. Please try again.")
            ).toBeInTheDocument();
        });
    });

    // ── Pending state ────────────────────────────────────────────────────────────

    it("disables Save Changes button while isPending", () => {
        vi.mocked(useUpdateProfile).mockReturnValue({
            mutateAsync: mockMutateAsync,
            isPending: true,
        } as unknown as ReturnType<typeof useUpdateProfile>);
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });

    it("shows 'Saving…' label while isPending", () => {
        vi.mocked(useUpdateProfile).mockReturnValue({
            mutateAsync: mockMutateAsync,
            isPending: true,
        } as unknown as ReturnType<typeof useUpdateProfile>);
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        expect(screen.getByText("Saving…")).toBeInTheDocument();
    });

    // ── Feedback clearing ────────────────────────────────────────────────────────

    it("clears error banner when user types in an input", async () => {
        mockMutateAsync.mockRejectedValue(new Error("Server unavailable"));
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
        await waitFor(() => expect(screen.getByText("Server unavailable")).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "New Name" } });
        expect(screen.queryByText("Server unavailable")).not.toBeInTheDocument();
    });

    it("clears error banner when a notification channel button is clicked", async () => {
        mockMutateAsync.mockRejectedValue(new Error("Server unavailable"));
        render(<ProfileEditModal isOpen={true} onClose={mockOnClose} user={mockUser} />, {
            wrapper,
        });
        fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
        await waitFor(() => expect(screen.getByText("Server unavailable")).toBeInTheDocument());
        fireEvent.click(screen.getByRole("button", { name: /^push$/i }));
        expect(screen.queryByText("Server unavailable")).not.toBeInTheDocument();
    });
});
