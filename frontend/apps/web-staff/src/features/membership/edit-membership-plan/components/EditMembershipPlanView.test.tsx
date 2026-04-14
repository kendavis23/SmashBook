import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditMembershipPlanView from "./EditMembershipPlanView";
import type { EditMembershipPlanFormState } from "./EditMembershipPlanView";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) => (
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
}));

const defaultForm: EditMembershipPlanFormState = {
    name: "Gold Member",
    description: "Full access plan",
    billingPeriod: "monthly",
    price: "49.99",
    trialDays: "7",
    bookingCredits: "10",
    guestPasses: "2",
    discountPct: "15",
    priorityDays: "7",
    maxMembers: "50",
    isActive: true,
};

const defaultProps = {
    planName: "Gold Member",
    form: defaultForm,
    nameError: "",
    priceError: "",
    apiError: "",
    isPending: false,
    onFormChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    onDismissError: vi.fn(),
};

describe("EditMembershipPlanView — rendering", () => {
    it("renders Edit Plan heading", () => {
        render(<EditMembershipPlanView {...defaultProps} />);
        expect(screen.getByRole("heading", { name: "Edit Plan" })).toBeInTheDocument();
    });

    it("renders plan name in breadcrumb", () => {
        render(<EditMembershipPlanView {...defaultProps} />);
        expect(screen.getAllByText("Gold Member").length).toBeGreaterThan(0);
    });

    it("renders Membership Plans breadcrumb item", () => {
        render(<EditMembershipPlanView {...defaultProps} />);
        expect(screen.getByText("Membership Plans")).toBeInTheDocument();
    });

    it("renders all section headings", () => {
        render(<EditMembershipPlanView {...defaultProps} />);
        expect(screen.getByText("Plan Details")).toBeInTheDocument();
        expect(screen.getByText("Perks & Limits")).toBeInTheDocument();
        expect(screen.getByText("Promotions")).toBeInTheDocument();
        expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("renders Save Changes button", () => {
        render(<EditMembershipPlanView {...defaultProps} />);
        expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    it("renders Cancel button", () => {
        render(<EditMembershipPlanView {...defaultProps} />);
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("pre-fills form fields from form prop", () => {
        render(<EditMembershipPlanView {...defaultProps} />);
        expect(screen.getByLabelText(/plan name/i)).toHaveValue("Gold Member");
        expect(screen.getByLabelText(/price/i)).toHaveValue(49.99);
    });

    it("renders Active checkbox checked when isActive is true", () => {
        render(<EditMembershipPlanView {...defaultProps} />);
        expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("renders Active checkbox unchecked when isActive is false", () => {
        render(
            <EditMembershipPlanView {...defaultProps} form={{ ...defaultForm, isActive: false }} />
        );
        expect(screen.getByRole("checkbox")).not.toBeChecked();
    });
});

describe("EditMembershipPlanView — validation errors", () => {
    it("shows name error when provided", () => {
        render(<EditMembershipPlanView {...defaultProps} nameError="Plan name is required." />);
        expect(screen.getByText("Plan name is required.")).toBeInTheDocument();
    });

    it("shows price error when provided", () => {
        render(
            <EditMembershipPlanView {...defaultProps} priceError="A valid price is required." />
        );
        expect(screen.getByText("A valid price is required.")).toBeInTheDocument();
    });

    it("shows API error alert when provided", () => {
        render(<EditMembershipPlanView {...defaultProps} apiError="Server error" />);
        expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("calls onDismissError when alert Dismiss is clicked", () => {
        const handleDismiss = vi.fn();
        render(
            <EditMembershipPlanView
                {...defaultProps}
                apiError="Server error"
                onDismissError={handleDismiss}
            />
        );
        fireEvent.click(screen.getByText("Dismiss"));
        expect(handleDismiss).toHaveBeenCalled();
    });
});

describe("EditMembershipPlanView — pending state", () => {
    it("shows Saving… when isPending", () => {
        render(<EditMembershipPlanView {...defaultProps} isPending={true} />);
        expect(screen.getByRole("button", { name: "Saving…" })).toBeInTheDocument();
    });

    it("disables submit button while pending", () => {
        render(<EditMembershipPlanView {...defaultProps} isPending={true} />);
        expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    });
});

describe("EditMembershipPlanView — user interactions", () => {
    it("calls onSubmit when form is submitted", () => {
        const handleSubmit = vi.fn((e) => e.preventDefault());
        render(<EditMembershipPlanView {...defaultProps} onSubmit={handleSubmit} />);
        fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form")!);
        expect(handleSubmit).toHaveBeenCalled();
    });

    it("calls onCancel when Cancel is clicked", () => {
        const handleCancel = vi.fn();
        render(<EditMembershipPlanView {...defaultProps} onCancel={handleCancel} />);
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(handleCancel).toHaveBeenCalled();
    });

    it("calls onFormChange with name patch when name input changes", () => {
        const handleChange = vi.fn();
        render(<EditMembershipPlanView {...defaultProps} onFormChange={handleChange} />);
        fireEvent.change(screen.getByLabelText(/plan name/i), { target: { value: "Platinum" } });
        expect(handleChange).toHaveBeenCalledWith({ name: "Platinum" });
    });

    it("calls onFormChange with isActive patch when checkbox changes", () => {
        const handleChange = vi.fn();
        render(<EditMembershipPlanView {...defaultProps} onFormChange={handleChange} />);
        fireEvent.click(screen.getByRole("checkbox"));
        expect(handleChange).toHaveBeenCalledWith({ isActive: false });
    });
});
