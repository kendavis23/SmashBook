import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PricingRulesView from "./PricingRulesView";
import type { PricingRule } from "../../types";

const baseRule: PricingRule = {
    label: "Peak",
    day_of_week: 0,
    start_time: "08:00",
    end_time: "22:00",
    is_active: true,
    price_per_slot: 20,
};

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, variant }: { title: string; variant: string }) => (
        <div role="alert" data-variant={variant}>
            {title}
        </div>
    ),
}));

vi.mock("./DeleteModal", () => ({
    DeleteModal: ({
        onConfirm,
        onCancel,
    }: {
        onConfirm: () => void;
        onCancel: () => void;
        saving: boolean;
    }) => (
        <div role="dialog">
            <button onClick={onConfirm}>Confirm</button>
            <button onClick={onCancel}>Cancel Delete</button>
        </div>
    ),
}));

vi.mock("./PricingRuleCard", () => ({
    RuleCard: ({
        rule,
        onEdit,
        onDelete,
    }: {
        rule: PricingRule;
        currency: string;
        onEdit: () => void;
        onDelete: () => void;
    }) => (
        <div>
            <span>{rule.label}</span>
            <button onClick={onEdit}>Edit</button>
            <button onClick={onDelete}>Delete</button>
        </div>
    ),
}));

const defaultProps = {
    rules: [],
    pagedRules: [],
    currency: "GBP",
    saving: false,
    success: false,
    finalError: null,
    toastDismissed: false,
    currentPage: 0,
    totalPages: 1,
    deleteIndex: null,
    onToastDismiss: vi.fn(),
    onAddRule: vi.fn(),
    onEditRule: vi.fn(),
    onDeleteRule: vi.fn(),
    onPageChange: vi.fn(),
    onDeleteConfirmed: vi.fn(),
    onDeleteCancel: vi.fn(),
};

describe("PricingRulesView — empty state", () => {
    it("shows empty state message when no rules", () => {
        render(<PricingRulesView {...defaultProps} />);
        expect(screen.getByText("No pricing set yet")).toBeInTheDocument();
    });

    it("calls onAddRule when empty state Add rule button is clicked", () => {
        const handleAdd = vi.fn();
        render(<PricingRulesView {...defaultProps} onAddRule={handleAdd} />);
        fireEvent.click(screen.getByText("Add rule"));
        expect(handleAdd).toHaveBeenCalled();
    });
});

describe("PricingRulesView — with rules", () => {
    const twoRules = [baseRule, { ...baseRule, label: "Off-Peak", day_of_week: 6 }];

    it("renders rule count", () => {
        render(
            <PricingRulesView
                {...defaultProps}
                rules={twoRules}
                pagedRules={twoRules}
                totalPages={1}
            />
        );
        expect(screen.getByText("2 rules")).toBeInTheDocument();
    });

    it("renders each rule card", () => {
        render(
            <PricingRulesView
                {...defaultProps}
                rules={twoRules}
                pagedRules={twoRules}
                totalPages={1}
            />
        );
        expect(screen.getByText("Peak")).toBeInTheDocument();
        expect(screen.getByText("Off-Peak")).toBeInTheDocument();
    });

    it("calls onEditRule with correct index when Edit is clicked", () => {
        const handleEdit = vi.fn();
        render(
            <PricingRulesView
                {...defaultProps}
                rules={twoRules}
                pagedRules={twoRules}
                totalPages={1}
                onEditRule={handleEdit}
            />
        );
        // getAllByText guaranteed to return elements matching the mock render
        fireEvent.click(screen.getAllByText("Edit")[0]!);
        expect(handleEdit).toHaveBeenCalledWith(0);
    });

    it("calls onDeleteRule with correct index when Delete is clicked", () => {
        const handleDelete = vi.fn();
        render(
            <PricingRulesView
                {...defaultProps}
                rules={twoRules}
                pagedRules={twoRules}
                totalPages={1}
                onDeleteRule={handleDelete}
            />
        );
        // getAllByText guaranteed to return elements matching the mock render
        fireEvent.click(screen.getAllByText("Delete")[0]!);
        expect(handleDelete).toHaveBeenCalledWith(0);
    });

    it("shows '1 rule' text for a single rule", () => {
        render(
            <PricingRulesView
                {...defaultProps}
                rules={[baseRule]}
                pagedRules={[baseRule]}
                totalPages={1}
            />
        );
        expect(screen.getByText("1 rule")).toBeInTheDocument();
    });
});

describe("PricingRulesView — pagination", () => {
    const manyRules = Array.from({ length: 12 }, (_, i) => ({
        ...baseRule,
        label: `Rule ${i}`,
    }));

    it("renders pagination controls when totalPages > 1", () => {
        render(
            <PricingRulesView
                {...defaultProps}
                rules={manyRules}
                pagedRules={manyRules.slice(0, 10)}
                totalPages={2}
            />
        );
        expect(screen.getByText("Previous")).toBeInTheDocument();
        expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("calls onPageChange when Next is clicked", () => {
        const handlePage = vi.fn();
        render(
            <PricingRulesView
                {...defaultProps}
                rules={manyRules}
                pagedRules={manyRules.slice(0, 10)}
                totalPages={2}
                onPageChange={handlePage}
            />
        );
        fireEvent.click(screen.getByText("Next"));
        expect(handlePage).toHaveBeenCalledWith(1);
    });

    it("Previous button is disabled on first page", () => {
        render(
            <PricingRulesView
                {...defaultProps}
                rules={manyRules}
                pagedRules={manyRules.slice(0, 10)}
                totalPages={2}
                currentPage={0}
            />
        );
        expect(screen.getByText("Previous")).toBeDisabled();
    });
});

describe("PricingRulesView — toasts", () => {
    it("shows error toast when finalError is set", () => {
        render(<PricingRulesView {...defaultProps} finalError={new Error("Save failed")} />);
        expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    });

    it("shows success toast when success is true", () => {
        render(<PricingRulesView {...defaultProps} success={true} />);
        expect(screen.getByRole("alert")).toHaveTextContent("Changes saved.");
    });

    it("does not show toast when toastDismissed is true", () => {
        render(<PricingRulesView {...defaultProps} success={true} toastDismissed={true} />);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});

describe("PricingRulesView — delete modal", () => {
    it("renders delete modal when deleteIndex is set", () => {
        render(
            <PricingRulesView
                {...defaultProps}
                rules={[baseRule]}
                pagedRules={[baseRule]}
                totalPages={1}
                deleteIndex={0}
            />
        );
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("calls onDeleteConfirmed when Confirm is clicked in modal", () => {
        const handleConfirm = vi.fn();
        render(
            <PricingRulesView
                {...defaultProps}
                rules={[baseRule]}
                pagedRules={[baseRule]}
                totalPages={1}
                deleteIndex={0}
                onDeleteConfirmed={handleConfirm}
            />
        );
        fireEvent.click(screen.getByText("Confirm"));
        expect(handleConfirm).toHaveBeenCalled();
    });

    it("calls onDeleteCancel when Cancel Delete is clicked in modal", () => {
        const handleCancel = vi.fn();
        render(
            <PricingRulesView
                {...defaultProps}
                rules={[baseRule]}
                pagedRules={[baseRule]}
                totalPages={1}
                deleteIndex={0}
                onDeleteCancel={handleCancel}
            />
        );
        fireEvent.click(screen.getByText("Cancel Delete"));
        expect(handleCancel).toHaveBeenCalled();
    });
});
