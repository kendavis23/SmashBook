import type { PricingRule } from "../types";

export const DAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];
export const PAGE_SIZE = 10;

export const EMPTY_RULE: PricingRule = {
    label: "",
    day_of_week: 0,
    start_time: "08:00",
    end_time: "22:00",
    valid_from: undefined,
    valid_until: undefined,
    is_active: true,
    price_per_slot: 0,
    surge_trigger_pct: undefined,
    surge_max_pct: undefined,
    low_demand_trigger_pct: undefined,
    low_demand_min_pct: undefined,
    incentive_price: undefined,
    incentive_label: undefined,
    incentive_expires_at: undefined,
};

export type FormState = PricingRule & { _editIndex?: number };

export const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

export const labelCls = "mb-1 block text-sm font-medium text-foreground";

export const fieldWrapperCls = "flex flex-col gap-1.5";

export function formatPrice(value: string | number | undefined, currency: string): string {
    if (value === undefined || value === "") {
        return "—";
    }
    return `${currency} ${value}`;
}
