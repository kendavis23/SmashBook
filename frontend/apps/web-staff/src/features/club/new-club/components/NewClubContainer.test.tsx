import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewClubContainer from "./NewClubContainer";

const mockNavigate = vi.fn();
const mockReset = vi.fn();
const mockMutate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks", () => ({
    useCreateClub: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    SelectInput: ({
        name,
        value,
        onValueChange,
        options,
    }: {
        name?: string;
        value: string;
        onValueChange: (v: string) => void;
        options: Array<{ value: string; label: string }>;
    }) => (
        <select
            name={name}
            id={name}
            aria-label="Currency"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

import { useCreateClub } from "../../hooks";

const mockUseCreateClub = useCreateClub as ReturnType<typeof vi.fn>;

const defaultMutation = {
    mutate: mockMutate,
    isPending: false,
    error: null,
    reset: mockReset,
};

describe("NewClubContainer — rendering", () => {
    it("renders the new club form", () => {
        mockUseCreateClub.mockReturnValue(defaultMutation);
        render(<NewClubContainer />);
        expect(screen.getByRole("heading", { name: "New Club" })).toBeInTheDocument();
        expect(screen.getByText("Create Club")).toBeInTheDocument();
    });
});

describe("NewClubContainer — validation", () => {
    it("shows name error when submitting with empty name", () => {
        mockUseCreateClub.mockReturnValue(defaultMutation);
        render(<NewClubContainer />);
        fireEvent.click(screen.getByText("Create Club"));
        expect(screen.getByText("Club name is required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });
});

describe("NewClubContainer — submission", () => {
    it("calls mutate with trimmed form data on valid submit", () => {
        const mutate = vi.fn();
        mockUseCreateClub.mockReturnValue({ ...defaultMutation, mutate });
        render(<NewClubContainer />);
        fireEvent.change(screen.getByLabelText(/Club Name/), {
            target: { value: "  Test Club  " },
        });
        fireEvent.change(screen.getByLabelText("Address"), {
            target: { value: "123 Main St" },
        });
        fireEvent.click(screen.getByText("Create Club"));
        expect(mutate).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Test Club",
                address: "123 Main St",
                currency: "GBP",
            }),
            expect.any(Object)
        );
    });

    it("omits address when left empty", () => {
        const mutate = vi.fn();
        mockUseCreateClub.mockReturnValue({ ...defaultMutation, mutate });
        render(<NewClubContainer />);
        fireEvent.change(screen.getByLabelText(/Club Name/), {
            target: { value: "My Club" },
        });
        fireEvent.click(screen.getByText("Create Club"));
        expect(mutate).toHaveBeenCalledWith(
            expect.objectContaining({ name: "My Club", address: undefined }),
            expect.any(Object)
        );
    });
});

describe("NewClubContainer — cancel", () => {
    it("navigates to /clubs when Cancel is clicked", () => {
        mockUseCreateClub.mockReturnValue(defaultMutation);
        render(<NewClubContainer />);
        fireEvent.click(screen.getByText("Cancel"));
        expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/clubs" }));
    });
});

describe("NewClubContainer — api error", () => {
    it("shows api error from mutation", () => {
        mockUseCreateClub.mockReturnValue({
            ...defaultMutation,
            error: new Error("Server error"),
        });
        render(<NewClubContainer />);
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    it("calls reset when error alert is dismissed", () => {
        const reset = vi.fn();
        mockUseCreateClub.mockReturnValue({
            ...defaultMutation,
            error: new Error("Server error"),
            reset,
        });
        render(<NewClubContainer />);
        fireEvent.click(screen.getByText("Dismiss"));
        expect(reset).toHaveBeenCalled();
    });
});
