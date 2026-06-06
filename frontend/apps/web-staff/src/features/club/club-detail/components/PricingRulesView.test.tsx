import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PricingRulesView from "./PricingRulesView";
import type { OperatingHours, PricingRule } from "../../types";

const baseRule: PricingRule = {
    session_type: "regular",
    label: "peak",
    day_of_week: 0,
    start_time: "08:00",
    end_time: "22:00",
    is_active: true,
    price_per_slot: 20,
};

const hours: OperatingHours[] = [{ day_of_week: 0, open_time: "08:00", close_time: "22:00" }];

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, variant }: { title: string; variant: string }) => (
        <div role="alert" data-variant={variant}>
            {title}
        </div>
    ),
    formatPlainTime: (t: string) => t,
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

const defaultProps = {
    rules: [] as PricingRule[],
    hours,
    currency: "GBP",
    saving: false,
    success: false,
    finalError: null,
    toastDismissed: false,
    deleteIndex: null,
    selectedDay: 0,
    onToastDismiss: vi.fn(),
    onDayChange: vi.fn(),
    onAddRule: vi.fn(),
    onEditRule: vi.fn(),
    onDeleteRule: vi.fn(),
    onDeleteConfirmed: vi.fn(),
    onDeleteCancel: vi.fn(),
};

function expandRegularPlay(): void {
    fireEvent.click(screen.getByRole("button", { name: /Regular Play/ }));
}

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
    const twoRules = [baseRule, { ...baseRule, label: "off_peak" as const, day_of_week: 0 }];

    it("renders selected day heading", () => {
        render(<PricingRulesView {...defaultProps} rules={twoRules} />);
        expect(screen.getByText("Monday Pricing")).toBeInTheDocument();
    });

    it("groups rules under their session type", () => {
        render(<PricingRulesView {...defaultProps} rules={twoRules} />);
        expect(screen.getByText("Regular Play")).toBeInTheDocument();
    });

    it("renders rule label badges and times", () => {
        render(<PricingRulesView {...defaultProps} rules={twoRules} />);
        expandRegularPlay();
        expect(screen.getByText("Peak")).toBeInTheDocument();
        expect(screen.getByText("Off-Peak")).toBeInTheDocument();
    });

    it("calls onEditRule with correct index when Edit is clicked", () => {
        const handleEdit = vi.fn();
        render(<PricingRulesView {...defaultProps} rules={twoRules} onEditRule={handleEdit} />);
        expandRegularPlay();
        fireEvent.click(screen.getAllByLabelText("Edit rule")[0]!);
        expect(handleEdit).toHaveBeenCalledWith(0);
    });

    it("calls onDeleteRule with correct index when Delete is clicked", () => {
        const handleDelete = vi.fn();
        render(<PricingRulesView {...defaultProps} rules={twoRules} onDeleteRule={handleDelete} />);
        expandRegularPlay();
        fireEvent.click(screen.getAllByLabelText("Delete rule")[0]!);
        expect(handleDelete).toHaveBeenCalledWith(0);
    });

    it("renders rules for the selected day only", () => {
        render(
            <PricingRulesView
                {...defaultProps}
                rules={[baseRule, { ...baseRule, day_of_week: 5 }]}
            />
        );
        // Only the Monday rule's group is shown; Saturday rule is filtered out.
        expect(screen.getByText("Regular Play")).toBeInTheDocument();
        expandRegularPlay();
        expect(screen.getAllByText("Peak")).toHaveLength(1);
    });
});

describe("PricingRulesView — day tabs", () => {
    it("renders all day tabs", () => {
        render(<PricingRulesView {...defaultProps} rules={[baseRule]} />);
        expect(screen.getByText("Monday")).toBeInTheDocument();
        expect(screen.getByText("Sunday")).toBeInTheDocument();
    });

    it("calls onDayChange when a day is clicked", () => {
        const handleDayChange = vi.fn();
        render(
            <PricingRulesView {...defaultProps} rules={[baseRule]} onDayChange={handleDayChange} />
        );
        fireEvent.click(screen.getByText("Sunday"));
        expect(handleDayChange).toHaveBeenCalledWith(6);
    });

    it("shows an empty message for the selected day when it has no rules", () => {
        render(<PricingRulesView {...defaultProps} rules={[baseRule]} selectedDay={6} />);
        expect(screen.getByText("No rules for Sunday.")).toBeInTheDocument();
    });
});

describe("PricingRulesView — coverage", () => {
    it("renders timeline when rules are present", () => {
        render(<PricingRulesView {...defaultProps} rules={[baseRule]} />);
        expect(screen.getByText("Regular Play")).toBeInTheDocument();
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
        render(<PricingRulesView {...defaultProps} rules={[baseRule]} deleteIndex={0} />);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("calls onDeleteConfirmed when Confirm is clicked in modal", () => {
        const handleConfirm = vi.fn();
        render(
            <PricingRulesView
                {...defaultProps}
                rules={[baseRule]}
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
                deleteIndex={0}
                onDeleteCancel={handleCancel}
            />
        );
        fireEvent.click(screen.getByText("Cancel Delete"));
        expect(handleCancel).toHaveBeenCalled();
    });
});
