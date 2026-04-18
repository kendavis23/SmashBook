import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewCourtContainer from "./NewCourtContainer";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockReset = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks", () => ({
    useCreateCourt: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((item) => (
                <span key={item.label}>{item.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    NumberInput: ({
        className,
        ...props
    }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
        <input type="number" className={className} {...props} />
    ),
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
        placeholder?: string;
    }) => (
        <select
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={placeholder ?? "select"}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
}));

import { useCreateCourt } from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseCreateCourt = useCreateCourt as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

function setupMocks(error: Error | null = null) {
    mockUseClubAccess.mockReturnValue({ clubId: "club-1" });
    mockUseCreateCourt.mockReturnValue({
        mutate: mockMutate,
        reset: mockReset,
        isPending: false,
        error,
    });
}

describe("NewCourtContainer", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
        mockReset.mockReset();
    });

    it("shows validation errors when court name is empty", () => {
        render(<NewCourtContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Create Court" }));

        expect(screen.getByText("Court name is required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("submits a valid payload and navigates on success", () => {
        mockMutate.mockImplementation((payload, options) => {
            options.onSuccess();
        });

        render(<NewCourtContainer />);

        fireEvent.change(screen.getByLabelText(/court name/i), { target: { value: " Court 2 " } });
        fireEvent.click(screen.getByLabelText(/has lighting/i));
        fireEvent.change(screen.getByLabelText(/lighting surcharge/i), {
            target: { value: "5.5" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create Court" }));

        expect(mockMutate).toHaveBeenCalledWith(
            {
                club_id: "club-1",
                name: "Court 2",
                surface_type: "artificial_grass",
                has_lighting: true,
                lighting_surcharge: 5.5,
            },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/courts",
            search: { created: true, updated: undefined },
        });
    });

    it("navigates back on cancel", () => {
        render(<NewCourtContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/courts",
            search: { created: undefined, updated: undefined },
        });
    });

    it("shows api error and resets it when dismissed", () => {
        setupMocks(new Error("Create failed"));
        render(<NewCourtContainer />);

        expect(screen.getByRole("alert")).toHaveTextContent("Create failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(mockReset).toHaveBeenCalled();
    });
});
