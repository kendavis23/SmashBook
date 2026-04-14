import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { RuleForm } from "./PricingRuleForm";
import { EMPTY_RULE } from "./pricingRulesConstants";
import type { FormState } from "./pricingRulesConstants";

vi.mock("@repo/ui", () => ({
    FormField: ({ label, children }: { label: string; children: ReactNode }) => (
        <div>
            <label>{label}</label>
            {children}
        </div>
    ),
}));

const baseForm: FormState = { ...EMPTY_RULE, label: "Peak" };

describe("RuleForm — new rule", () => {
    it("renders 'New rule' heading when no _editIndex", () => {
        render(
            <RuleForm
                form={baseForm}
                currency="GBP"
                saving={false}
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText("New rule")).toBeInTheDocument();
    });

    it("renders 'Edit rule' heading when _editIndex is set", () => {
        render(
            <RuleForm
                form={{ ...baseForm, _editIndex: 0 }}
                currency="GBP"
                saving={false}
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText("Edit rule")).toBeInTheDocument();
    });

    it("renders submit button as 'Add rule' for new rule", () => {
        render(
            <RuleForm
                form={baseForm}
                currency="GBP"
                saving={false}
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText("Add rule")).toBeInTheDocument();
    });

    it("renders submit button as 'Update rule' in edit mode", () => {
        render(
            <RuleForm
                form={{ ...baseForm, _editIndex: 2 }}
                currency="GBP"
                saving={false}
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText("Update rule")).toBeInTheDocument();
    });

    it("renders 'Saving...' on submit button when saving", () => {
        render(
            <RuleForm
                form={baseForm}
                currency="GBP"
                saving={true}
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    it("calls onCancel when Cancel is clicked", () => {
        const handleCancel = vi.fn();
        render(
            <RuleForm
                form={baseForm}
                currency="GBP"
                saving={false}
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onCancel={handleCancel}
            />
        );
        fireEvent.click(screen.getByText("Cancel"));
        expect(handleCancel).toHaveBeenCalled();
    });

    it("calls onChange when label input changes", () => {
        const handleChange = vi.fn();
        render(
            <RuleForm
                form={baseForm}
                currency="GBP"
                saving={false}
                onChange={handleChange}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        const labelInput = screen.getByDisplayValue("Peak");
        fireEvent.change(labelInput, { target: { value: "Off-Peak" } });
        expect(handleChange).toHaveBeenCalledWith("label", "Off-Peak");
    });

    it("includes currency in base price label", () => {
        render(
            <RuleForm
                form={baseForm}
                currency="EUR"
                saving={false}
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText(/Base price \(EUR\)/)).toBeInTheDocument();
    });

    it("calls onSubmit when form is submitted", () => {
        const handleSubmit = vi.fn((e) => e.preventDefault());
        const { container } = render(
            <RuleForm
                form={baseForm}
                currency="GBP"
                saving={false}
                onChange={vi.fn()}
                onSubmit={handleSubmit}
                onCancel={vi.fn()}
            />
        );
        fireEvent.submit(container.querySelector("form")!);
        expect(handleSubmit).toHaveBeenCalled();
    });

    it("renders surge pricing section", () => {
        render(
            <RuleForm
                form={baseForm}
                currency="GBP"
                saving={false}
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText("Surge pricing")).toBeInTheDocument();
    });

    it("renders seasonal validity section", () => {
        render(
            <RuleForm
                form={baseForm}
                currency="GBP"
                saving={false}
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText("Seasonal validity")).toBeInTheDocument();
    });

    it("Active checkbox reflects is_active state", () => {
        render(
            <RuleForm
                form={{ ...baseForm, is_active: true }}
                currency="GBP"
                saving={false}
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
    });
});
