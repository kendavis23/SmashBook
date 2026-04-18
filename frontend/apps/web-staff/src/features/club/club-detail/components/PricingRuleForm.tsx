import type { PricingRule } from "../../types";
import { type FormEvent, type JSX } from "react";
import {
    FormField,
    SelectInput,
    NumberInput,
    TimeInput,
    DatePicker,
    DateTimePicker,
} from "@repo/ui";
import { DAY_NAMES, fieldCls, labelCls, type FormState } from "./pricingRulesConstants";

export function RuleForm({
    form,
    currency,
    saving,
    onChange,
    onSubmit,
    onCancel,
}: {
    form: FormState;
    currency: string;
    saving: boolean;
    onChange: (field: keyof PricingRule, value: unknown) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
}): JSX.Element {
    return (
        <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
            <h4 className="mb-4 text-base font-semibold text-foreground">
                {form._editIndex !== undefined ? "Edit rule" : "New rule"}
            </h4>

            <form onSubmit={onSubmit}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <FormField labelClassName={labelCls} label="Label *">
                        <input
                            required
                            className={fieldCls}
                            value={form.label}
                            onChange={(e) => onChange("label", e.target.value)}
                            placeholder="e.g. Peak, Off-Peak, Happy Hour"
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
