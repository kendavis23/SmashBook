import { describe, it, expect } from "vitest";
import { toPricingRule } from "./club.mapper";
import type { PricingRule } from "../models";

const BASE_RULE: PricingRule = {
    label: "Peak",
    day_of_week: 1,
    start_time: "18:00",
    end_time: "21:00",
    price_per_slot: 20,
};

describe("toPricingRule", () => {
    it("passes through a rule with no incentive_expires_at unchanged", () => {
        const result = toPricingRule(BASE_RULE);
        expect(result).toEqual(BASE_RULE);
    });

    it("passes through a rule where incentive_expires_at is undefined", () => {
        const rule: PricingRule = { ...BASE_RULE, incentive_expires_at: undefined };
        const result = toPricingRule(rule);
        expect(result.incentive_expires_at).toBeUndefined();
    });

    it("converts ISO datetime to datetime-local format", () => {
        const rule: PricingRule = { ...BASE_RULE, incentive_expires_at: "2026-04-08T14:30:00Z" };
        const result = toPricingRule(rule);
        // Result must match YYYY-MM-DDTHH:mm pattern
        expect(result.incentive_expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it("preserves all other fields when transforming incentive_expires_at", () => {
        const rule: PricingRule = {
            ...BASE_RULE,
            is_active: true,
            surge_trigger_pct: 80,
            incentive_expires_at: "2026-04-08T14:30:00Z",
        };
        const result = toPricingRule(rule);
        expect(result.label).toBe("Peak");
        expect(result.price_per_slot).toBe(20);
        expect(result.is_active).toBe(true);
        expect(result.surge_trigger_pct).toBe(80);
    });
});
