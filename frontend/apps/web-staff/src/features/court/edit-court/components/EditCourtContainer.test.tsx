import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditCourtContainer from "./EditCourtContainer";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockReset = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ courtId: "court-1" }),
}));

vi.mock("../../hooks", () => ({
    useListCourts: vi.fn(),
    useUpdateCourt: vi.fn(),
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

import { useListCourts, useUpdateCourt } from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseListCourts = useListCourts as ReturnType<typeof vi.fn>;
const mockUseUpdateCourt = useUpdateCourt as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

function setupMocks(overrides?: { isLoading?: boolean; courts?: unknown[]; error?: Error | null }) {
    mockUseClubAccess.mockReturnValue({ clubId: "club-1" });
    mockUseListCourts.mockReturnValue({
        data: overrides?.courts ?? [
            {
                id: "court-1",
                name: "Court 1",
                surface_type: "artificial_grass",
                has_lighting: true,
                lighting_surcharge: 5,
                is_active: true,
            },
        ],
        isLoading: overrides?.isLoading ?? false,
    });
    mockUseUpdateCourt.mockReturnValue({
        mutate: mockMutate,
        reset: mockReset,
        isPending: false,
        error: overrides?.error ?? null,
    });
}

describe("EditCourtContainer", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
        mockReset.mockReset();
    });

    it("shows a loading state before the form initializes", () => {
        setupMocks({ isLoading: true, courts: [] });
        render(<EditCourtContainer />);

        expect(screen.getByText("Loading court…")).toBeInTheDocument();
    });

    it("pre-fills the form with court data", async () => {
        render(<EditCourtContainer />);

        await waitFor(() => {
            expect(screen.getByLabelText(/court name/i)).toHaveValue("Court 1");
        });
        expect(screen.getByLabelText(/lighting surcharge/i)).toHaveValue(5);
        expect(screen.getByLabelText(/^active$/i)).toBeChecked();
    });

    it("prevents submit when the name is empty", async () => {
        render(<EditCourtContainer />);

        await waitFor(() => {
            expect(screen.getByLabelText(/court name/i)).toBeInTheDocument();
        });
        fireEvent.change(screen.getByLabelText(/court name/i), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(screen.getByText("Court name is required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("submits a valid payload and navigates on success", async () => {
        mockMutate.mockImplementation((payload, options) => {
            options.onSuccess();
        });

        render(<EditCourtContainer />);

        await waitFor(() => {
            expect(screen.getByLabelText(/court name/i)).toBeInTheDocument();
        });
        fireEvent.change(screen.getByLabelText(/court name/i), {
            target: { value: " Court Prime " },
        });
        fireEvent.click(screen.getByLabelText(/^active$/i));
        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(mockMutate).toHaveBeenCalledWith(
            {
                name: "Court Prime",
                surface_type: "artificial_grass",
                has_lighting: true,
                lighting_surcharge: 5,
                is_active: false,
            },
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/courts",
            search: { created: undefined, updated: true },
        });
    });

    it("navigates back on cancel", async () => {
        render(<EditCourtContainer />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/courts",
            search: { created: undefined, updated: undefined },
        });
    });

    it("shows api error and resets it when dismissed", async () => {
        setupMocks({ error: new Error("Update failed") });
        render(<EditCourtContainer />);

        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

        expect(mockReset).toHaveBeenCalled();
    });
});
