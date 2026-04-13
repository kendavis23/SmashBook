import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MembershipPlanModal } from "./MembershipPlanModal";
import type { MembershipPlan } from "../types";

vi.mock("../hooks", () => ({
    useCreateMembershipPlan: vi.fn(),
    useUpdateMembershipPlan: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
}));

import { useCreateMembershipPlan, useUpdateMembershipPlan } from "../hooks";

const mockUseCreate = useCreateMembershipPlan as ReturnType<typeof vi.fn>;
const mockUseUpdate = useUpdateMembershipPlan as ReturnType<typeof vi.fn>;

const mockMutate = vi.fn();
const mockReset = vi.fn();

function setupCreateMock(overrides = {}) {
    mockUseCreate.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
        reset: mockReset,
        ...overrides,
    });
    mockUseUpdate.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: null,
        reset: vi.fn(),
    });
}

function setupUpdateMock(overrides = {}) {
    mockUseCreate.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: null,
        reset: vi.fn(),
    });
    mockUseUpdate.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
        reset: mockReset,
        ...overrides,
    });
}

const mockPlan: MembershipPlan = {
    id: "plan-1",
    club_id: "club-1",
    name: "Gold Member",
    description: "Full access plan",
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

describe("MembershipPlanModal — create mode title", () => {
    it("shows create title when no initialData", () => {
        setupCreateMock();
        render(<MembershipPlanModal clubId="club-1" onClose={vi.fn()} />);
        expect(screen.getByText("Create membership plan")).toBeInTheDocument();
    });
});

describe("MembershipPlanModal — edit mode title", () => {
    it("shows edit title when initialData provided", () => {
        setupUpdateMock();
        render(<MembershipPlanModal clubId="club-1" onClose={vi.fn()} initialData={mockPlan} />);
        expect(screen.getByText("Edit membership plan")).toBeInTheDocument();
    });
});

describe("MembershipPlanModal — validation", () => {
    it("shows name error when name is empty on submit", () => {
        setupCreateMock();
        render(<MembershipPlanModal clubId="club-1" onClose={vi.fn()} />);
        fireEvent.click(screen.getByText("Create Plan"));
        expect(screen.getByText("Plan name is required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("shows price error when price is empty on submit", () => {
        setupCreateMock();
        render(<MembershipPlanModal clubId="club-1" onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText(/plan name/i), {
            target: { value: "Gold" },
        });
        fireEvent.click(screen.getByText("Create Plan"));
        expect(screen.getByText("A valid price is required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });
});

describe("MembershipPlanModal — submit", () => {
    it("calls mutate with correct payload on valid create submit", () => {
        setupCreateMock();
        render(<MembershipPlanModal clubId="club-1" onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText(/plan name/i), {
            target: { value: "Gold Member" },
        });
        fireEvent.change(screen.getByLabelText(/price/i), {
            target: { value: "49.99" },
        });
        fireEvent.click(screen.getByText("Create Plan"));
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Gold Member", price: 49.99, club_id: "club-1" }),
            expect.any(Object)
        );
    });

    it("calls mutate with correct payload on valid edit submit", () => {
        setupUpdateMock();
        render(<MembershipPlanModal clubId="club-1" onClose={vi.fn()} initialData={mockPlan} />);
        fireEvent.change(screen.getByLabelText(/plan name/i), {
            target: { value: "Gold Member Updated" },
        });
        fireEvent.click(screen.getByText("Update Plan"));
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Gold Member Updated" }),
            expect.any(Object)
        );
    });
});

describe("MembershipPlanModal — cancel", () => {
    it("calls onClose when Cancel is clicked", () => {
        setupCreateMock();
        const handleClose = vi.fn();
        render(<MembershipPlanModal clubId="club-1" onClose={handleClose} />);
        fireEvent.click(screen.getByText("Cancel"));
        expect(handleClose).toHaveBeenCalled();
    });

    it("calls onClose when X button is clicked", () => {
        setupCreateMock();
        const handleClose = vi.fn();
        render(<MembershipPlanModal clubId="club-1" onClose={handleClose} />);
        fireEvent.click(screen.getByLabelText("Close modal"));
        expect(handleClose).toHaveBeenCalled();
    });
});

describe("MembershipPlanModal — pending state", () => {
    it("shows submitting state while pending", () => {
        setupCreateMock({ isPending: true });
        render(<MembershipPlanModal clubId="club-1" onClose={vi.fn()} />);
        expect(screen.getByText("Creating...")).toBeInTheDocument();
    });
});

describe("MembershipPlanModal — API error", () => {
    it("shows API error toast when error present", () => {
        setupCreateMock({ error: new Error("Server error") });
        render(<MembershipPlanModal clubId="club-1" onClose={vi.fn()} />);
        expect(screen.getByText("Server error")).toBeInTheDocument();
    });
});
