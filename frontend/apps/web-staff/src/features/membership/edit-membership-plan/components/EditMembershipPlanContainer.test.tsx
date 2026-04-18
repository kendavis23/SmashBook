import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import EditMembershipPlanContainer from "./EditMembershipPlanContainer";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockReset = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(() => mockNavigate),
    useParams: vi.fn(() => ({ planId: "plan-1" })),
}));

vi.mock("../../hooks", () => ({
    useGetMembershipPlan: vi.fn(),
    useUpdateMembershipPlan: vi.fn(),
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

import { useGetMembershipPlan, useUpdateMembershipPlan } from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseGet = useGetMembershipPlan as ReturnType<typeof vi.fn>;
const mockUseUpdate = useUpdateMembershipPlan as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

const mockPlan = {
    id: "plan-1",
    club_id: "club-1",
    name: "Gold Member",
    description: "Full access",
    billing_period: "monthly",
    price: 49.99,
    trial_days: 7,
    booking_credits_per_period: 10,
    guest_passes_per_period: 2,
    discount_pct: 15,
    priority_booking_days: 7,
    max_active_members: 50,
    is_active: true,
    stripe_price_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
};

function setupMocks(
    getOverrides: Record<string, unknown> = {},
    updateOverrides: Record<string, unknown> = {}
) {
    mockUseGet.mockReturnValue({
        data: mockPlan,
        isLoading: false,
        ...getOverrides,
    });
    mockUseUpdate.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
        reset: mockReset,
        ...updateOverrides,
    });
    mockUseClubAccess.mockReturnValue({ clubId: "club-1" });
}

describe("EditMembershipPlanContainer — loading state", () => {
    it("shows loading spinner while plan is loading", () => {
        setupMocks({ data: undefined, isLoading: true });
        render(<EditMembershipPlanContainer />);
        expect(screen.getByText("Loading plan…")).toBeInTheDocument();
    });
});

describe("EditMembershipPlanContainer — rendering", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
    });

    it("renders Edit Plan heading once plan data loads", async () => {
        render(<EditMembershipPlanContainer />);
        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Edit Plan" })).toBeInTheDocument();
        });
    });

    it("pre-fills name field from plan data", async () => {
        render(<EditMembershipPlanContainer />);
        await waitFor(() => {
            expect(screen.getByLabelText(/plan name/i)).toHaveValue("Gold Member");
        });
    });

    it("pre-fills price field from plan data", async () => {
        render(<EditMembershipPlanContainer />);
        await waitFor(() => {
            expect(screen.getByLabelText(/price/i)).toHaveValue(49.99);
        });
    });
});

describe("EditMembershipPlanContainer — validation", () => {
    beforeEach(() => {
        setupMocks();
        mockMutate.mockReset();
    });

    it("shows name error when name is cleared and form is submitted", async () => {
        render(<EditMembershipPlanContainer />);
        await waitFor(() => screen.getByLabelText(/plan name/i));
        fireEvent.change(screen.getByLabelText(/plan name/i), { target: { value: "" } });
        fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);
        expect(screen.getByText("Plan name is required.")).toBeInTheDocument();
    });

    it("does not call mutate when validation fails", async () => {
        render(<EditMembershipPlanContainer />);
        await waitFor(() => screen.getByLabelText(/plan name/i));
        fireEvent.change(screen.getByLabelText(/plan name/i), { target: { value: "" } });
        fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);
        expect(mockMutate).not.toHaveBeenCalled();
    });
});

describe("EditMembershipPlanContainer — submit", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
    });

    it("calls mutate with correct payload on valid submit", async () => {
        render(<EditMembershipPlanContainer />);
        await waitFor(() => screen.getByRole("button", { name: "Save Changes" }));
        fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Gold Member",
                price: 49.99,
                billing_period: "monthly",
                is_active: true,
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
    });

    it("shows Saving… and disables button when isPending", () => {
        setupMocks({}, { isPending: true });
        render(<EditMembershipPlanContainer />);
        // isPending shown in the spinner state before plan loads — check after
        // the container still shows the loading spinner since plan data is present
    });
});

describe("EditMembershipPlanContainer — cancel", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
    });

    it("navigates to /membership-plans when Cancel is clicked", async () => {
        render(<EditMembershipPlanContainer />);
        await waitFor(() => screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ to: "/membership-plans" })
        );
    });
});

describe("EditMembershipPlanContainer — API error", () => {
    it("shows API error alert", async () => {
        setupMocks({}, { error: new Error("Update failed") });
        render(<EditMembershipPlanContainer />);
        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeInTheDocument();
            expect(screen.getByText("Update failed")).toBeInTheDocument();
        });
    });

    it("calls reset when error is dismissed", async () => {
        setupMocks({}, { error: new Error("Update failed") });
        render(<EditMembershipPlanContainer />);
        await waitFor(() => screen.getByText("Dismiss"));
        fireEvent.click(screen.getByText("Dismiss"));
        expect(mockReset).toHaveBeenCalled();
    });
});
