import type { PricingRule } from "../../types";
import type { BookingType } from "../../types";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import type { JSX } from "react";
import { formatPlainTime } from "@repo/ui";
import { PRICING_LABEL_NAMES, SESSION_TYPE_LABELS, formatPrice } from "./pricingRulesConstants";

type IndexedRule = { rule: PricingRule; globalIndex: number };

export function SessionPricingGroup({
    sessionType,
    rules,
    currency,
    isOpen,
    onToggle,
    onEditRule,
    onDeleteRule,
}: {
    sessionType: BookingType;
    rules: IndexedRule[];
    currency: string;
    isOpen: boolean;
    onToggle: () => void;
    onEditRule: (index: number) => void;
    onDeleteRule: (index: number) => void;
}): JSX.Element {
    return (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Header — title + count + timeline */}
            <div className="flex flex-col gap-3 border-b border-border bg-muted/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <button
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    className="flex min-w-0 items-center gap-2 text-left"
                >
                    {isOpen ? (
                        <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
                    ) : (
                        <ChevronRight size={15} className="shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-sm font-semibold text-foreground">
                        {SESSION_TYPE_LABELS[sessionType]}
                    </span>
                    <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {rules.length} {rules.length === 1 ? "rule" : "rules"}
                    </span>
                </button>
            </div>

            {isOpen ? (
                rules.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No {SESSION_TYPE_LABELS[sessionType].toLowerCase()} pricing for this day
                        yet.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted text-left">
                                    <th className="sticky left-0 z-10 bg-muted px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Time
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Label
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Price (per slot)
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Valid From
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Valid Until
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Surge Trigger
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Surge Max
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Low Demand Trigger
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Low Demand Min
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Incentive Price
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Incentive Label
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Incentive Expires
                                    </th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="sticky right-0 z-10 bg-muted px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map(({ rule, globalIndex }) => (
                                    <tr
                                        key={globalIndex}
                                        className="group border-b border-border/40 last:border-0 hover:bg-muted"
                                    >
                                        {/* TIME — sticky left */}
                                        <td className="sticky left-0 z-10 bg-card px-4 py-2.5 group-hover:bg-muted">
                                            <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                                <span className="font-medium text-foreground">
                                                    {formatPlainTime(rule.start_time)} –{" "}
                                                    {formatPlainTime(rule.end_time)}
                                                </span>
                                            </span>
                                        </td>
                                        {/* LABEL */}
                                        <td className="px-4 py-2.5">
                                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                                {PRICING_LABEL_NAMES[rule.label] ?? rule.label}
                                            </span>
                                        </td>
                                        {/* PRICE */}
                                        <td className="px-4 py-2.5 font-semibold text-foreground">
                                            {formatPrice(rule.price_per_slot, currency)}
                                        </td>
                                        {/* VALID FROM */}
                                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                                            {rule.valid_from ?? "—"}
                                        </td>
                                        {/* VALID UNTIL */}
                                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                                            {rule.valid_until ?? "—"}
                                        </td>
                                        {/* SURGE TRIGGER */}
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            {rule.surge_trigger_pct != null
                                                ? `${rule.surge_trigger_pct}%`
                                                : "—"}
                                        </td>
                                        {/* SURGE MAX */}
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            {rule.surge_max_pct != null
                                                ? `${rule.surge_max_pct}%`
                                                : "—"}
                                        </td>
                                        {/* LOW DEMAND TRIGGER */}
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            {rule.low_demand_trigger_pct != null
                                                ? `${rule.low_demand_trigger_pct}%`
                                                : "—"}
                                        </td>
                                        {/* LOW DEMAND MIN */}
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            {rule.low_demand_min_pct != null
                                                ? `${rule.low_demand_min_pct}%`
                                                : "—"}
                                        </td>
                                        {/* INCENTIVE PRICE */}
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            {rule.incentive_price != null
                                                ? formatPrice(rule.incentive_price, currency)
                                                : "—"}
                                        </td>
                                        {/* INCENTIVE LABEL */}
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            {rule.incentive_label ?? "—"}
                                        </td>
                                        {/* INCENTIVE EXPIRES */}
                                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                                            {rule.incentive_expires_at
                                                ? formatIncentiveExpiry(rule.incentive_expires_at)
                                                : "—"}
                                        </td>
                                        {/* STATUS */}
                                        <td className="px-4 py-2.5">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                    rule.is_active
                                                        ? "bg-success/15 text-success"
                                                        : "bg-muted text-muted-foreground"
                                                }`}
                                            >
                                                {rule.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        {/* ACTIONS — sticky right */}
                                        <td className="sticky right-0 z-10 bg-card px-4 py-2.5 group-hover:bg-muted">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => onEditRule(globalIndex)}
                                                    aria-label="Edit rule"
                                                    className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteRule(globalIndex)}
                                                    aria-label="Delete rule"
                                                    className="rounded-md p-1.5 text-destructive transition hover:bg-destructive/10"
                                                >
                                                    <Trash2Icon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : null}
        </section>
    );
}

/** Shows "YYYY-MM-DD HH:mm" from a datetime-local or ISO string. */
function formatIncentiveExpiry(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const date = d.toISOString().slice(0, 10);
    const time = d.toISOString().slice(11, 16);
    return `${date} ${time}`;
}

function Trash2Icon(): JSX.Element {
    // Inline to keep the import list tight; matches lucide Trash2 sizing.
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M10 11v6M14 11v6" />
        </svg>
    );
}
