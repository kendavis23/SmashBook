import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RuleCard } from "./PricingRuleCard";
import type { PricingRule } from "../../types";

const baseRule: PricingRule = {
    label: "Peak",
    day_of_week: 0,
    start_time: "08:00",
    end_time: "22:00",
    is_active: true,
    price_per_slot: 20,
};

describe("RuleCard", () => {
    it("renders rule label", () => {
        render(<RuleCard rule={baseRule} currency="GBP" onEdit={vi.fn()} onDelete={vi.fn()} />);
        expect(screen.getByText("Peak")).toBeInTheDocument();
    });

    it("renders day name", () => {
        render(<RuleCard rule={baseRule} currency="GBP" onEdit={vi.fn()} onDelete={vi.fn()} />);
        expect(screen.getByText("Monday")).toBeInTheDocument();
    });

    it("renders active badge", () => {
        render(<RuleCard rule={baseRule} currency="GBP" onEdit={vi.fn()} onDelete={vi.fn()} />);
        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders inactive badge for inactive rule", () => {
        render(
            <RuleCard
                rule={{ ...baseRule, is_active: false }}
                currency="GBP"
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />
        );
        expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("shows 'Base price only' when no surge/low-demand/incentive", () => {
        render(<RuleCard rule={baseRule} currency="GBP" onEdit={vi.fn()} onDelete={vi.fn()} />);
        expect(screen.getByText("Base price only")).toBeInTheDocument();
    });

    it("shows surge info when surge_trigger_pct is set", () => {
        render(
            <RuleCard
                rule={{ ...baseRule, surge_trigger_pct: 80, surge_max_pct: 25 }}
                currency="GBP"
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />
        );
        expect(screen.getByText(/Surge/)).toBeInTheDocument();
    });

    it("calls onEdit when Edit button is clicked", () => {
        const handleEdit = vi.fn();
        render(<RuleCard rule={baseRule} currency="GBP" onEdit={handleEdit} onDelete={vi.fn()} />);
        fireEvent.click(screen.getByText("Edit"));
        expect(handleEdit).toHaveBeenCalled();
    });

    it("calls onDelete when Delete button is clicked", () => {
        const handleDelete = vi.fn();
        render(<RuleCard rule={baseRule} currency="GBP" onEdit={vi.fn()} onDelete={handleDelete} />);
        fireEvent.click(screen.getByText("Delete"));
        expect(handleDelete).toHaveBeenCalled();
    });
});
