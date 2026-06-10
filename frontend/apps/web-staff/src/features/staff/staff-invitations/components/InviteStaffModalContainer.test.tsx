import type { SelectHTMLAttributes } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InviteStaffModalContainer from "./InviteStaffModalContainer";

const mockMutate = vi.fn();
const mockReset = vi.fn();

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title }: { title: string }) => <div role="alert">{title}</div>,
    SelectInput: ({
        value,
        onValueChange,
        options,
        ...props
    }: SelectHTMLAttributes<HTMLSelectElement> & {
        value: string;
        onValueChange: (value: string) => void;
        options: { value: string; label: string }[];
    }) => (
        <select {...props} value={value} onChange={(event) => onValueChange(event.target.value)}>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
}));

vi.mock("../../hooks", () => ({
    useCreateStaffInvitation: vi.fn(() => ({
        mutate: mockMutate,
        reset: mockReset,
        isPending: false,
        error: null,
    })),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(() => ({
        clubId: "club-1",
        role: "admin",
        isOwner: false,
    })),
    useActiveClubName: vi.fn(() => "Ace Padel North"),
}));

describe("InviteStaffModalContainer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("validates that an email address is provided", () => {
        render(<InviteStaffModalContainer onClose={vi.fn()} onSuccess={vi.fn()} />);

        fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

        expect(screen.getByText("Email address is required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("creates an invitation for the active club", () => {
        const onSuccess = vi.fn();
        render(<InviteStaffModalContainer onClose={vi.fn()} onSuccess={onSuccess} />);

        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: "alex@example.com" },
        });
        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "trainer" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Send Invitation" }));

        expect(mockMutate).toHaveBeenCalledWith(
            {
                club_id: "club-1",
                email: "alex@example.com",
                role: "trainer",
            },
            { onSuccess }
        );
    });
});
