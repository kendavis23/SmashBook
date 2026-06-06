import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionPricingGroup } from "./SessionPricingGroup";
import type { PricingRule } from "../../types";

vi.mock("@repo/ui", () => ({
    formatPlainTime: (t: string) => t,
}));

const rule: PricingRule = {
    session_type: "regular",
    label: "peak",
    day_of_week: 0,
    start_time: "08:00",
    end_time: "22:00",
    is_active: true,
    price_per_slot: 20,
};

const indexed = [{ rule, globalIndex: 3 }];

const baseProps = {
    sessionType: "regular" as const,
    rules: indexed,
    currency: "GBP",
    isOpen: true,
    onToggle: vi.fn(),
    onEditRule: vi.fn(),
    onDeleteRule: vi.fn(),
};

describe("SessionPricingGroup", () => {
    it("renders the session type title and rule count", () => {
        render(<SessionPricingGroup {...baseProps} />);
        expect(screen.getByText("Regular Play")).toBeInTheDocument();
        expect(screen.getByText("1 rule")).toBeInTheDocument();
    });

    it("renders the rule row with friendly label and price", () => {
        render(<SessionPricingGroup {...baseProps} />);
        expect(screen.getByText("Peak")).toBeInTheDocument();
        expect(screen.getByText("GBP 20")).toBeInTheDocument();
    });

    it("renders the timeline when rules are present", () => {
        render(<SessionPricingGroup {...baseProps} />);
        expect(screen.getByText("Regular Play")).toBeInTheDocument();
    });

    it("calls onEditRule with the global index", () => {
        const onEditRule = vi.fn();
        render(<SessionPricingGroup {...baseProps} onEditRule={onEditRule} />);
        fireEvent.click(screen.getByLabelText("Edit rule"));
        expect(onEditRule).toHaveBeenCalledWith(3);
    });

    it("calls onDeleteRule with the global index", () => {
        const onDeleteRule = vi.fn();
        render(<SessionPricingGroup {...baseProps} onDeleteRule={onDeleteRule} />);
        fireEvent.click(screen.getByLabelText("Delete rule"));
        expect(onDeleteRule).toHaveBeenCalledWith(3);
    });

    it("hides the rule table when collapsed", () => {
        render(<SessionPricingGroup {...baseProps} isOpen={false} />);
        expect(screen.queryByText("Peak")).not.toBeInTheDocument();
    });
});
