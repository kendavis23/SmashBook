import type { OperatingHours, PricingRule } from "../../types";
import type { BookingType } from "../../types";
import { AlertToast } from "@repo/ui";
import { Plus } from "lucide-react";
import { type JSX, useState } from "react";
import { DeleteModal } from "./DeleteModal";
import { SessionPricingGroup } from "./SessionPricingGroup";
import { DAY_NAMES, DAY_NAMES_SHORT, SESSION_TYPES, sessionTypeOf } from "./pricingRulesConstants";

type Props = {
    rules: PricingRule[];
    hours: OperatingHours[];
    currency: string;
    saving: boolean;
    success: boolean;
    finalError: Error | null;
    toastDismissed: boolean;
    deleteIndex: number | null;
    selectedDay: number;
    onToastDismiss: () => void;
    onDayChange: (day: number) => void;
    onAddRule: (sessionType: BookingType) => void;
    onEditRule: (index: number) => void;
    onDeleteRule: (index: number) => void;
    onDeleteConfirmed: () => void;
    onDeleteCancel: () => void;
};

export default function PricingRulesView({
    rules,
    hours,
    currency,
    saving,
    success,
    finalError,
    toastDismissed,
    deleteIndex,
    selectedDay,
    onToastDismiss,
    onDayChange,
    onAddRule,
    onEditRule,
    onDeleteRule,
    onDeleteConfirmed,
    onDeleteCancel,
}: Props): JSX.Element {
    // Collapsed/expanded state per session-type group. All expanded by default.
    const [collapsed, setCollapsed] = useState<Set<BookingType>>(new Set(SESSION_TYPES));

    const dayRules = rules
        .map((rule, i) => ({ rule, globalIndex: i }))
        .filter(({ rule }) => rule.day_of_week === selectedDay);

    const dayHours = hours.find((h) => h.day_of_week === selectedDay);

    // Only show session groups that have rules, but keep a stable global order.
    const sessionsWithRules = SESSION_TYPES.filter((st) =>
        dayRules.some(({ rule }) => sessionTypeOf(rule) === st)
    );

    function toggleSession(st: BookingType): void {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(st)) next.delete(st);
            else next.add(st);
            return next;
        });
    }

    return (
        <div className="space-y-4">
            {finalError && !toastDismissed ? (
                <AlertToast title={finalError.message} variant="error" onClose={onToastDismiss} />
            ) : null}
            {success && !toastDismissed ? (
                <AlertToast title="Changes saved." variant="success" onClose={onToastDismiss} />
            ) : null}

            {rules.length === 0 ? (
                <section className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
                    <h3 className="text-lg font-semibold text-foreground">No pricing set yet</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        Create your first pricing rule to set a base rate for a session type, day,
                        and time range. Set pricing for every open hour so no slot is left unpriced.
                    </p>
                    <button
                        onClick={() => onAddRule("regular")}
                        className="btn-cta mt-6 inline-flex items-center gap-2"
                    >
                        <Plus size={14} />
                        Add rule
                    </button>
                </section>
            ) : (
                <div className="flex gap-0 overflow-hidden rounded-xl border border-border bg-card">
                    {/* Day nav */}
                    <div className="w-32 shrink-0 border-r border-border bg-muted/20 sm:w-40">
                        <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Days
                        </p>
                        {DAY_NAMES.map((name, idx) => {
                            const hasHours = hours.some((h) => h.day_of_week === idx);
                            return (
                                <button
                                    key={name}
                                    onClick={() => onDayChange(idx)}
                                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                                        selectedDay === idx
                                            ? "border-l-2 border-cta bg-background font-semibold text-foreground"
                                            : "border-l-2 border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                    }`}
                                >
                                    <span>
                                        <span className="hidden sm:inline">{name}</span>
                                        <span className="sm:hidden">{DAY_NAMES_SHORT[idx]}</span>
                                    </span>
                                    {!hasHours ? (
                                        <span className="text-[9px] uppercase text-muted-foreground/50">
                                            closed
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>

                    {/* Rules panel — session-type groups */}
                    <div className="min-w-0 flex-1 px-4 py-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-foreground">
                                    {DAY_NAMES[selectedDay]} Pricing
                                </h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {dayHours
                                        ? "Set a rule for each session type across all open hours."
                                        : "No operating hours set for this day."}
                                </p>
                            </div>
                            <button
                                onClick={() => onAddRule("regular")}
                                className="btn-cta-sm inline-flex shrink-0 items-center gap-1.5"
                            >
                                <Plus size={13} />
                                Add rule
                            </button>
                        </div>

                        {sessionsWithRules.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                                <p className="text-sm text-muted-foreground">
                                    No rules for {DAY_NAMES[selectedDay]}.
                                </p>
                                <button
                                    onClick={() => onAddRule("regular")}
                                    className="btn-cta-sm mt-3 inline-flex items-center gap-1.5"
                                >
                                    <Plus size={13} />
                                    Add rule
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sessionsWithRules.map((st) => (
                                    <SessionPricingGroup
                                        key={st}
                                        sessionType={st}
                                        rules={dayRules.filter(
                                            ({ rule }) => sessionTypeOf(rule) === st
                                        )}
                                        currency={currency}
                                        isOpen={!collapsed.has(st)}
                                        onToggle={() => toggleSession(st)}
                                        onEditRule={onEditRule}
                                        onDeleteRule={onDeleteRule}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {deleteIndex !== null ? (
                <DeleteModal
                    onConfirm={onDeleteConfirmed}
                    onCancel={onDeleteCancel}
                    saving={saving}
                />
            ) : null}
        </div>
    );
}
