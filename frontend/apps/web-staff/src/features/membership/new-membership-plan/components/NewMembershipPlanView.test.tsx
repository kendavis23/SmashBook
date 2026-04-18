import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewMembershipPlanView from "./NewMembershipPlanView";
import type { NewMembershipPlanFormState } from "./NewMembershipPlanView";

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
        "aria-label": ariaLabel,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
        placeholder?: string;
        "aria-label"?: string;
    }) => (
        <select
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={ariaLabel ?? placeholder ?? "select"}
        >
            {(options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

const defaultForm: NewMembershipPlanFormState = {
    name: "",
    description: "",
    billingPeriod: "monthly",
    price: "",
    trialDays: "0",
    bookingCredits: "",
    guestPasses: "",
    discountPct: "",
    priorityDays: "",
    maxMembers: "",
};

const defaultProps = {
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

describe("NewMembershipPlanView — rendering", () => {
    it("renders page heading", () => {
        render(<NewMembershipPlanView {...defaultProps} />);
        expect(screen.getByRole("heading", { name: "New Membership Plan" })).toBeInTheDocument();
    });

    it("renders breadcrumb with Membership Plans and New Plan", () => {
        render(<NewMembershipPlanView {...defaultProps} />);
        expect(screen.getByText("Membership Plans")).toBeInTheDocument();
        expect(screen.getByText("New Plan")).toBeInTheDocument();
    });

    it("renders all section headings", () => {
        render(<NewMembershipPlanView {...defaultProps} />);
        expect(screen.getByText("Plan Details")).toBeInTheDocument();
        expect(screen.getByText("Perks & Limits")).toBeInTheDocument();
        expect(screen.getByText("Promotions")).toBeInTheDocument();
    });

    it("renders Create Plan submit button", () => {
        render(<NewMembershipPlanView {...defaultProps} />);
        expect(screen.getByRole("button", { name: "Create Plan" })).toBeInTheDocument();
    });

    it("renders Cancel button", () => {
        render(<NewMembershipPlanView {...defaultProps} />);
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });
});

describe("NewMembershipPlanView — validation errors", () => {
    it("shows name error when provided", () => {
        render(<NewMembershipPlanView {...defaultProps} nameError="Plan name is required." />);
        expect(screen.getByText("Plan name is required.")).toBeInTheDocument();
    });

    it("shows price error when provided", () => {
        render(<NewMembershipPlanView {...defaultProps} priceError="A valid price is required." />);
        expect(screen.getByText("A valid price is required.")).toBeInTheDocument();
    });

    it("shows API error alert when provided", () => {
        render(<NewMembershipPlanView {...defaultProps} apiError="Server error" />);
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    it("calls onDismissError when alert is dismissed", () => {
        const handleDismiss = vi.fn();
        render(
            <NewMembershipPlanView
                {...defaultProps}
                apiError="Server error"
                onDismissError={handleDismiss}
            />
        );
        fireEvent.click(screen.getByText("Dismiss"));
        expect(handleDismiss).toHaveBeenCalled();
    });
});

describe("NewMembershipPlanView — pending state", () => {
    it("shows Creating… when isPending", () => {
        render(<NewMembershipPlanView {...defaultProps} isPending={true} />);
        expect(screen.getByRole("button", { name: "Creating…" })).toBeInTheDocument();
    });

    it("disables submit button while pending", () => {
        render(<NewMembershipPlanView {...defaultProps} isPending={true} />);
        expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    });
});

describe("NewMembershipPlanView — user interactions", () => {
    it("calls onSubmit when form is submitted", () => {
        const handleSubmit = vi.fn((e) => e.preventDefault());
        render(<NewMembershipPlanView {...defaultProps} onSubmit={handleSubmit} />);
        fireEvent.submit(screen.getByRole("button", { name: "Create Plan" }).closest("form")!);
        expect(handleSubmit).toHaveBeenCalled();
    });

    it("calls onCancel when Cancel is clicked", () => {
        const handleCancel = vi.fn();
        render(<NewMembershipPlanView {...defaultProps} onCancel={handleCancel} />);
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(handleCancel).toHaveBeenCalled();
    });

    it("calls onFormChange with name patch when name input changes", () => {
        const handleChange = vi.fn();
        render(<NewMembershipPlanView {...defaultProps} onFormChange={handleChange} />);
        fireEvent.change(screen.getByLabelText(/plan name/i), { target: { value: "Gold" } });
        expect(handleChange).toHaveBeenCalledWith({ name: "Gold" });
    });

    it("calls onFormChange with price patch when price input changes", () => {
        const handleChange = vi.fn();
        render(<NewMembershipPlanView {...defaultProps} onFormChange={handleChange} />);
        fireEvent.change(screen.getByLabelText(/price/i), { target: { value: "29.99" } });
        expect(handleChange).toHaveBeenCalledWith({ price: "29.99" });
    });

    it("calls onFormChange with billingPeriod patch when billing select changes", () => {
        const handleChange = vi.fn();
        render(<NewMembershipPlanView {...defaultProps} onFormChange={handleChange} />);
        fireEvent.change(screen.getByLabelText("Billing Period"), { target: { value: "annual" } });
        expect(handleChange).toHaveBeenCalledWith({ billingPeriod: "annual" });
    });
});
