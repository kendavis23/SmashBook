import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import NewMembershipPlanContainer from "./NewMembershipPlanContainer";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockReset = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(() => mockNavigate),
}));

vi.mock("../../hooks", () => ({
    useCreateMembershipPlan: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
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
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={placeholder ?? "select"}
        >
            {(options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

import { useCreateMembershipPlan } from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseCreate = useCreateMembershipPlan as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

function setupMocks(overrides: Record<string, unknown> = {}) {
    mockUseCreate.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
        reset: mockReset,
        ...overrides,
    });
    mockUseClubAccess.mockReturnValue({ clubId: "club-1" });
}

describe("NewMembershipPlanContainer — rendering", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
    });

    it("renders the New Membership Plan heading", () => {
        render(<NewMembershipPlanContainer />);
        expect(screen.getByRole("heading", { name: "New Membership Plan" })).toBeInTheDocument();
    });

    it("renders Create Plan submit button", () => {
        render(<NewMembershipPlanContainer />);
        expect(screen.getByRole("button", { name: "Create Plan" })).toBeInTheDocument();
    });
});

describe("NewMembershipPlanContainer — validation", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
    });

    it("shows name error when submitting with empty name", () => {
        render(<NewMembershipPlanContainer />);
        fireEvent.submit(screen.getByRole("button", { name: "Create Plan" }).closest("form")!);
        expect(screen.getByText("Plan name is required.")).toBeInTheDocument();
    });

    it("shows price error when submitting with empty price", () => {
        render(<NewMembershipPlanContainer />);
        fireEvent.change(screen.getByLabelText(/plan name/i), { target: { value: "Gold" } });
        fireEvent.submit(screen.getByRole("button", { name: "Create Plan" }).closest("form")!);
        expect(screen.getByText("A valid price is required.")).toBeInTheDocument();
    });

    it("does not call mutate when validation fails", () => {
        render(<NewMembershipPlanContainer />);
        fireEvent.submit(screen.getByRole("button", { name: "Create Plan" }).closest("form")!);
        expect(mockMutate).not.toHaveBeenCalled();
    });
});

describe("NewMembershipPlanContainer — submit", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
    });

    it("calls mutate with correct payload on valid submit", () => {
        render(<NewMembershipPlanContainer />);
        fireEvent.change(screen.getByLabelText(/plan name/i), {
            target: { value: "Gold Member" },
        });
        fireEvent.change(screen.getByLabelText(/price/i), { target: { value: "49.99" } });
        fireEvent.submit(screen.getByRole("button", { name: "Create Plan" }).closest("form")!);
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                club_id: "club-1",
                name: "Gold Member",
                price: 49.99,
                billing_period: "monthly",
                is_active: true,
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("shows Creating… and disables button when isPending", () => {
        setupMocks({ isPending: true });
        render(<NewMembershipPlanContainer />);
        expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    });
});

describe("NewMembershipPlanContainer — cancel", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
    });

    it("navigates to /membership-plans when Cancel is clicked", () => {
        render(<NewMembershipPlanContainer />);
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ to: "/membership-plans" })
        );
    });
});

describe("NewMembershipPlanContainer — API error", () => {
    it("shows API error alert", () => {
        setupMocks({ error: new Error("Server failed") });
        render(<NewMembershipPlanContainer />);
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Server failed")).toBeInTheDocument();
    });

    it("calls reset when error is dismissed", () => {
        setupMocks({ error: new Error("Server failed") });
        render(<NewMembershipPlanContainer />);
        fireEvent.click(screen.getByText("Dismiss"));
        expect(mockReset).toHaveBeenCalled();
    });
});
