import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FormEvent } from "react";
import PricingRulesTable from "./ClubDetailPricingRulesSection";
import type { PricingRule } from "../../types";

const mockSaveRules = vi.hoisted(() => vi.fn());
const mockGetRules = vi.hoisted(() =>
    vi.fn((): { data: PricingRule[]; isLoading: boolean; error: null | Error } => ({
        data: [],
        isLoading: false,
        error: null,
    }))
);

vi.mock("../../hooks", () => ({
    useGetPricingRules: () => mockGetRules(),
    useSetPricingRules: () => ({
        mutate: mockSaveRules,
        isPending: false,
        isSuccess: false,
        error: null,
    }),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title }: { title: string }) => <div role="alert">{title}</div>,
}));

vi.mock("./PricingRulesView", () => ({
    default: ({
        rules,
        onAddRule,
        onEditRule,
        onDeleteRule,
        onDeleteConfirmed,
        onDeleteCancel,
        onPageChange,
        onToastDismiss,
    }: {
        rules: PricingRule[];
        pagedRules: PricingRule[];
        onAddRule: () => void;
        onEditRule: (i: number) => void;
        onDeleteRule: (i: number) => void;
        onDeleteConfirmed: () => void;
        onDeleteCancel: () => void;
        onPageChange: (p: number) => void;
        onToastDismiss: () => void;
    }) => (
        <div>
            <span data-testid="rule-count">{rules.length}</span>
            <button onClick={onAddRule}>Add rule</button>
            <button onClick={() => onEditRule(0)}>Edit 0</button>
            <button onClick={() => onDeleteRule(0)}>Delete 0</button>
            <button onClick={onDeleteConfirmed}>Confirm Delete</button>
            <button onClick={onDeleteCancel}>Cancel Delete</button>
            <button onClick={() => onPageChange(1)}>Page 2</button>
            <button onClick={onToastDismiss}>Dismiss</button>
        </div>
    ),
}));

vi.mock("./PricingRuleForm", () => ({
    RuleForm: ({
        onCancel,
        onSubmit,
        form,
    }: {
        form: { label: string };
        currency: string;
        saving: boolean;
        onChange: () => void;
        onSubmit: (e: FormEvent) => void;
        onCancel: () => void;
    }) => (
        <div>
            <span>Form: {form.label || "new"}</span>
            <button onClick={onCancel}>Cancel Form</button>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    onSubmit(e as unknown as FormEvent);
                }}
            >
                Submit Form
            </button>
        </div>
    ),
}));

describe("PricingRulesTable — loading state", () => {
    it("shows loading spinner when isLoading is true", () => {
        mockGetRules.mockReturnValueOnce({ data: [], isLoading: true, error: null });
        render(<PricingRulesTable clubId="club-1" />);
        expect(screen.getByText(/Loading pricing rules/)).toBeInTheDocument();
    });
});

describe("PricingRulesTable — empty state", () => {
    it("renders view with 0 rules by default", () => {
        render(<PricingRulesTable clubId="club-1" />);
        expect(screen.getByTestId("rule-count")).toHaveTextContent("0");
    });

    it("opens add form when Add rule is clicked", () => {
        render(<PricingRulesTable clubId="club-1" />);
        fireEvent.click(screen.getByText("Add rule"));
        expect(screen.getByText(/Form:/)).toBeInTheDocument();
    });

    it("closes form when Cancel Form is clicked", () => {
        render(<PricingRulesTable clubId="club-1" />);
        fireEvent.click(screen.getByText("Add rule"));
        expect(screen.getByText(/Form:/)).toBeInTheDocument();
        fireEvent.click(screen.getByText("Cancel Form"));
        expect(screen.queryByText(/Form:/)).not.toBeInTheDocument();
    });
});

describe("PricingRulesTable — with rules", () => {
    const twoRules: PricingRule[] = [
        {
            label: "Peak",
            day_of_week: 0,
            start_time: "08:00",
            end_time: "22:00",
            is_active: true,
            price_per_slot: 20,
        },
        {
            label: "Off-Peak",
            day_of_week: 6,
            start_time: "08:00",
            end_time: "22:00",
            is_active: false,
            price_per_slot: 10,
        },
    ];

    it("renders view with 2 rules", () => {
        mockGetRules.mockReturnValueOnce({ data: twoRules, isLoading: false, error: null });
        render(<PricingRulesTable clubId="club-1" />);
        expect(screen.getByTestId("rule-count")).toHaveTextContent("2");
    });

    it("opens edit form with rule data when Edit is clicked", () => {
        mockGetRules.mockReturnValueOnce({ data: twoRules, isLoading: false, error: null });
        render(<PricingRulesTable clubId="club-1" />);
        fireEvent.click(screen.getByText("Edit 0"));
        expect(screen.getByText("Form: Peak")).toBeInTheDocument();
    });

    it("calls saveRules without deleted rule when Confirm Delete is clicked", () => {
        mockGetRules.mockReturnValue({ data: twoRules, isLoading: false, error: null });
        render(<PricingRulesTable clubId="club-1" />);
        fireEvent.click(screen.getByText("Delete 0"));
        fireEvent.click(screen.getByText("Confirm Delete"));
        expect(mockSaveRules).toHaveBeenCalledWith([twoRules[1]]);
        mockGetRules.mockReturnValue({ data: [], isLoading: false, error: null });
    });

    it("resets deleteIndex when Cancel Delete is clicked", () => {
        mockGetRules.mockReturnValueOnce({ data: twoRules, isLoading: false, error: null });
        render(<PricingRulesTable clubId="club-1" />);
        fireEvent.click(screen.getByText("Delete 0"));
        fireEvent.click(screen.getByText("Cancel Delete"));
        // No error thrown — component stays in view mode
        expect(screen.getByTestId("rule-count")).toBeInTheDocument();
    });
});
