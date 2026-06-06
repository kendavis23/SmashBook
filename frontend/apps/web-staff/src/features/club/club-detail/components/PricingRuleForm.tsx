import type { OperatingHours, PricingRule } from "../../types";
import { type FormEvent, type JSX } from "react";
import {
    FormField,
    SelectInput,
    NumberInput,
    TimeInput,
    DatePicker,
    DateTimePicker,
} from "@repo/ui";
import {
    DAY_NAMES,
    PRICING_LABEL_OPTIONS,
    SESSION_TYPE_OPTIONS,
    fieldCls,
    labelCls,
    timeToMinutes,
    computeCoverage,
    sessionTypeOf,
    type FormState,
    type Interval,
} from "./pricingRulesConstants";

// ---------------------------------------------------------------------------
// Coverage bar — shows which time slots already have rules for this
// session type / day so the user doesn't accidentally overlap or leave gaps.
// ---------------------------------------------------------------------------

function formatShortTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const suffix = h < 12 ? "A" : "P";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}${suffix}`;
}

function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const suffix = h < 12 ? "AM" : "PM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${displayH}${suffix}` : `${displayH}:${String(m).padStart(2, "0")}${suffix}`;
}

function intersectInterval(a: Interval, b: Interval): Interval | null {
    const s = Math.max(a.start, b.start);
    const e = Math.min(a.end, b.end);
    return s < e ? { start: s, end: e } : null;
}

function RuleCoverageBar({
    existingRules,
    hours,
    sessionType,
    dayOfWeek,
    editIndex,
    editStartTime,
    editEndTime,
}: {
    existingRules: PricingRule[];
    hours: OperatingHours[];
    sessionType: string;
    dayOfWeek: number;
    editIndex: number | undefined;
    editStartTime: string;
    editEndTime: string;
}): JSX.Element | null {
    const dayHours = hours.find((h) => h.day_of_week === dayOfWeek);
    if (!dayHours) return null;

    const openWindow: Interval = {
        start: timeToMinutes(dayHours.open_time),
        end: timeToMinutes(dayHours.close_time),
    };
    const rangeMinutes = openWindow.end - openWindow.start;
    if (rangeMinutes <= 0) return null;

    // Other active rules for this session type on this day (exclude the one being edited).
    const sessionRules = existingRules.filter(
        (r, i) => r.day_of_week === dayOfWeek && sessionTypeOf(r) === sessionType && i !== editIndex
    );
    const activeRules = sessionRules.filter((r) => r.is_active);

    const activeRanges: Interval[] = activeRules.map((r) => ({
        start: timeToMinutes(r.start_time),
        end: timeToMinutes(r.end_time),
    }));

    const { gaps } = computeCoverage(activeRanges, openWindow);

    function pct(m: number): number {
        return ((m - openWindow.start) / rangeMinutes) * 100;
    }

    // One tick per 2 hours.
    const ticks: number[] = [];
    for (let t = openWindow.start + 120; t < openWindow.end; t += 120) ticks.push(t);

    // Current rule segment — always shown (green for the rule being added/edited).
    const editS = Math.max(timeToMinutes(editStartTime), openWindow.start);
    const editE = Math.min(timeToMinutes(editEndTime), openWindow.end);
    const showCurrentSegment = editE > editS;

    // Compute overlap between the current rule and each existing active rule.
    const currentInterval: Interval = { start: editS, end: editE };
    const overlapSegments: Interval[] = showCurrentSegment
        ? activeRanges
              .map((r) => intersectInterval(currentInterval, r))
              .filter((x): x is Interval => x !== null)
        : [];

    const hasOverlap = overlapSegments.length > 0;

    // Build a human-readable list of conflicting rule times for the tooltip.
    const conflictingRules = showCurrentSegment
        ? activeRules.filter((r) => {
              const ri: Interval = {
                  start: timeToMinutes(r.start_time),
                  end: timeToMinutes(r.end_time),
              };
              return intersectInterval(currentInterval, ri) !== null;
          })
        : [];

    return (
        <div
            className={`mb-5 rounded-lg border px-4 py-3 ${hasOverlap ? "border-warning/60 bg-warning/5" : "border-border/60 bg-muted/30"}`}
        >
            <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                    Coverage for this session type
                </p>
                {hasOverlap && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-warning">
                        <svg
                            viewBox="0 0 16 16"
                            className="h-3.5 w-3.5 fill-current"
                            aria-hidden="true"
                        >
                            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5zm0 6.5a.875.875 0 1 1 0-1.75A.875.875 0 0 1 8 11z" />
                        </svg>
                        Time overlap detected
                    </span>
                )}
            </div>

            {/* Bar */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/60">
                {/* Existing active rule segments — blue */}
                {activeRules.map((r, i) => {
                    const s = Math.max(timeToMinutes(r.start_time), openWindow.start);
                    const e = Math.min(timeToMinutes(r.end_time), openWindow.end);
                    if (e <= s) return null;
                    return (
                        <div
                            key={i}
                            className="absolute inset-y-0 bg-blue-500/60"
                            style={{ left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%` }}
                            title={`Existing rule: ${r.start_time} – ${r.end_time}`}
                        />
                    );
                })}
                {/* Gap segments — faint red */}
                {gaps.map((g, i) => {
                    const s = Math.max(g.start, openWindow.start);
                    const e = Math.min(g.end, openWindow.end);
                    if (e <= s) return null;
                    return (
                        <div
                            key={`gap-${i}`}
                            className="absolute inset-y-0 bg-destructive/20"
                            style={{ left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%` }}
                            title="No pricing rule for this period"
                        />
                    );
                })}
                {/* Current rule segment — green, rendered above existing */}
                {showCurrentSegment && (
                    <div
                        className="absolute inset-y-0 bg-success/70"
                        style={{
                            left: `${pct(editS)}%`,
                            width: `${pct(editE) - pct(editS)}%`,
                        }}
                        title={`This rule: ${editStartTime} – ${editEndTime}`}
                    />
                )}
                {/* Overlap segments — amber, rendered on top of everything */}
                {overlapSegments.map((seg, i) => {
                    const s = Math.max(seg.start, openWindow.start);
                    const e = Math.min(seg.end, openWindow.end);
                    if (e <= s) return null;
                    return (
                        <div
                            key={`overlap-${i}`}
                            className="absolute inset-y-0 bg-warning/80"
                            style={{ left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%` }}
                            title={`Overlap: ${formatTime(s)} – ${formatTime(e)}`}
                        />
                    );
                })}
                {/* Hour ticks */}
                {ticks.map((t) => (
                    <div
                        key={t}
                        className="absolute inset-y-0 w-px bg-background/50"
                        style={{ left: `${pct(t)}%` }}
                    />
                ))}
            </div>

            {/* Time labels */}
            <div className="relative mt-1 h-3.5">
                <span className="absolute left-0 text-[9px] tabular-nums text-muted-foreground/70">
                    {formatShortTime(openWindow.start)}
                </span>
                {ticks
                    .filter((t) => pct(t) > 8 && pct(t) < 92)
                    .map((t) => (
                        <span
                            key={t}
                            className="absolute text-[9px] tabular-nums text-muted-foreground/70"
                            style={{ left: `${pct(t)}%`, transform: "translateX(-50%)" }}
                        >
                            {formatShortTime(t)}
                        </span>
                    ))}
                <span className="absolute right-0 text-[9px] tabular-nums text-muted-foreground/70">
                    {formatShortTime(openWindow.end)}
                </span>
            </div>

            {/* Legend */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                    <span className="h-2 w-3 rounded-sm bg-blue-500/60" />
                    Existing rules
                </span>
                {showCurrentSegment && (
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                        <span className="h-2 w-3 rounded-sm bg-success/70" />
                        This rule
                    </span>
                )}
                {hasOverlap && (
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-warning">
                        <span className="h-2 w-3 rounded-sm bg-warning/80" />
                        Overlap
                    </span>
                )}
                {gaps.length > 0 && (
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                        <span className="h-2 w-3 rounded-sm bg-destructive/20" />
                        No rule
                    </span>
                )}
            </div>

            {/* Overlap detail */}
            {hasOverlap && conflictingRules.length > 0 && (
                <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
                    <p className="text-xs font-medium text-warning">
                        This time range overlaps with{" "}
                        {conflictingRules.length === 1
                            ? "an existing rule"
                            : `${conflictingRules.length} existing rules`}
                        :
                    </p>
                    <ul className="mt-1 space-y-0.5">
                        {conflictingRules.map((r, i) => (
                            <li key={i} className="text-xs text-warning/90">
                                {r.start_time} – {r.end_time}
                                {r.label ? ` (${r.label})` : ""}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function RuleForm({
    form,
    currency,
    saving,
    existingRules,
    hours,
    onChange,
    onSubmit,
    onCancel,
}: {
    form: FormState;
    currency: string;
    saving: boolean;
    existingRules: PricingRule[];
    hours: OperatingHours[];
    onChange: (field: keyof PricingRule, value: unknown) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
}): JSX.Element {
    return (
        <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
            <h4 className="mb-4 text-base font-semibold text-foreground">
                {form._editIndex !== undefined ? "Edit rule" : "New rule"}
            </h4>

            <RuleCoverageBar
                existingRules={existingRules}
                hours={hours}
                sessionType={form.session_type ?? "regular"}
                dayOfWeek={form.day_of_week}
                editIndex={form._editIndex}
                editStartTime={form.start_time}
                editEndTime={form.end_time}
            />

            <form onSubmit={onSubmit}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <FormField labelClassName={labelCls} label="Session type *">
                        <SelectInput
                            value={form.session_type ?? "regular"}
                            onValueChange={(v) => onChange("session_type", v)}
                            options={SESSION_TYPE_OPTIONS}
                        />
                    </FormField>

                    <FormField labelClassName={labelCls} label="Label *">
                        <SelectInput
                            value={form.label}
                            onValueChange={(v) => onChange("label", v)}
                            options={PRICING_LABEL_OPTIONS}
                        />
                    </FormField>

                    <FormField labelClassName={labelCls} label="Day *">
                        <SelectInput
                            value={String(form.day_of_week)}
                            onValueChange={(v) => onChange("day_of_week", Number(v))}
                            options={DAY_NAMES.map((d, i) => ({ value: String(i), label: d }))}
                        />
                    </FormField>

                    <FormField labelClassName={labelCls} label={`Base price (${currency}) *`}>
                        <NumberInput
                            required
                            step="0.01"
                            min="0"
                            className={fieldCls}
                            value={form.price_per_slot}
                            onChange={(e) => onChange("price_per_slot", e.target.value)}
                        />
                    </FormField>

                    <FormField labelClassName={labelCls} label="Start time *">
                        <TimeInput
                            required
                            className={fieldCls}
                            value={form.start_time}
                            onChange={(e) => onChange("start_time", e.target.value)}
                        />
                    </FormField>

                    <FormField labelClassName={labelCls} label="End time *">
                        <TimeInput
                            required
                            className={fieldCls}
                            value={form.end_time}
                            onChange={(e) => onChange("end_time", e.target.value)}
                        />
                    </FormField>
                </div>

                <div className="mt-5 space-y-4">
                    <section className="form-section">
                        <div className="mb-3">
                            <h4 className="text-sm font-semibold text-foreground">Surge pricing</h4>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Optional. Set both fields or leave both empty.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField labelClassName={labelCls} label="Surge trigger %">
                                <NumberInput
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className={fieldCls}
                                    value={form.surge_trigger_pct ?? ""}
                                    onChange={(e) => onChange("surge_trigger_pct", e.target.value)}
                                    placeholder="e.g. 80"
                                />
                            </FormField>
                            <FormField labelClassName={labelCls} label="Surge max %">
                                <NumberInput
                                    step="0.01"
                                    min="0"
                                    className={fieldCls}
                                    value={form.surge_max_pct ?? ""}
                                    onChange={(e) => onChange("surge_max_pct", e.target.value)}
                                    placeholder="e.g. 25"
                                />
                            </FormField>
                        </div>
                    </section>

                    <section className="form-section">
                        <div className="mb-3">
                            <h4 className="text-sm font-semibold text-foreground">
                                Low-demand pricing
                            </h4>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Optional. Set both fields or leave both empty.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField labelClassName={labelCls} label="Low-demand trigger %">
                                <NumberInput
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className={fieldCls}
                                    value={form.low_demand_trigger_pct ?? ""}
                                    onChange={(e) =>
                                        onChange("low_demand_trigger_pct", e.target.value)
                                    }
                                    placeholder="e.g. 20"
                                />
                            </FormField>
                            <FormField labelClassName={labelCls} label="Low-demand discount %">
                                <NumberInput
                                    step="0.01"
                                    min="0"
                                    className={fieldCls}
                                    value={form.low_demand_min_pct ?? ""}
                                    onChange={(e) => onChange("low_demand_min_pct", e.target.value)}
                                    placeholder="e.g. 10"
                                />
                            </FormField>
                        </div>
                    </section>

                    <section className="form-section">
                        <div className="mb-3">
                            <h4 className="text-sm font-semibold text-foreground">
                                Promotional price
                            </h4>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Optional. Use for limited offers or special campaigns.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <FormField
                                labelClassName={labelCls}
                                label={`Promo price (${currency})`}
                            >
                                <NumberInput
                                    step="0.01"
                                    min="0"
                                    className={fieldCls}
                                    value={form.incentive_price ?? ""}
                                    onChange={(e) => onChange("incentive_price", e.target.value)}
                                    placeholder="e.g. 12.50"
                                />
                            </FormField>
                            <FormField labelClassName={labelCls} label="Promo label">
                                <input
                                    className={fieldCls}
                                    value={form.incentive_label ?? ""}
                                    onChange={(e) => onChange("incentive_label", e.target.value)}
                                    placeholder="e.g. Happy Hour"
                                />
                            </FormField>
                            <FormField labelClassName={labelCls} label="Promo expires">
                                <DateTimePicker
                                    value={form.incentive_expires_at ?? ""}
                                    onChange={(v) =>
                                        onChange("incentive_expires_at", v || undefined)
                                    }
                                />
                            </FormField>
                        </div>
                    </section>

                    <section className="form-section">
                        <div className="mb-3">
                            <h4 className="text-sm font-semibold text-foreground">
                                Seasonal validity
                            </h4>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Optional. Restrict this rule to a date range.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField labelClassName={labelCls} label="Valid from">
                                <DatePicker
                                    value={form.valid_from ?? ""}
                                    onChange={(v) => onChange("valid_from", v || undefined)}
                                />
                            </FormField>
                            <FormField labelClassName={labelCls} label="Valid until">
                                <DatePicker
                                    value={form.valid_until ?? ""}
                                    onChange={(v) => onChange("valid_until", v || undefined)}
                                />
                            </FormField>
                        </div>
                    </section>
                </div>

                <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border text-cta focus:ring-cta-ring/30"
                            checked={form.is_active}
                            onChange={(e) => onChange("is_active", e.target.checked)}
                        />
                        Active
                    </label>
                    <div className="flex items-center justify-end gap-3">
                        <button type="button" onClick={onCancel} className="btn-outline">
                            Cancel
                        </button>
                        <button type="submit" className="btn-cta" disabled={saving}>
                            {saving
                                ? "Saving..."
                                : form._editIndex !== undefined
                                  ? "Update rule"
                                  : "Add rule"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
