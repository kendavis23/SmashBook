import { AlertToast, Breadcrumb, NumberInput } from "@repo/ui";
import { BookOpen, Plus } from "lucide-react";
import type { FormEvent, JSX } from "react";

import type { PlanFormState } from "../../types";

const labelCls = "mb-1.5 block text-sm font-medium text-foreground";
const fieldGroupCls = "grid gap-4 md:grid-cols-2 xl:grid-cols-3";

interface NewPlanViewProps {
    form: PlanFormState;
    isPending: boolean;
    apiError: string | null;
    onFormChange: (patch: Partial<PlanFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
}

export default function NewPlanView({
    form,
    isPending,
    apiError,
    onFormChange,
    onSubmit,
    onCancel,
    onDismissError,
}: NewPlanViewProps): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Plans", onClick: onCancel }, { label: "New Plan" }]} showHomeIcon={false} />

            {apiError ? (
                <AlertToast title={apiError} variant="error" onClose={onDismissError} />
            ) : null}

            <form onSubmit={onSubmit} noValidate>
                <div className="space-y-5">
                    <section className="card-surface p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                <BookOpen size={17} />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-foreground">
                                    Plan details
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Name, pricing, and limits.
                                </p>
                            </div>
                        </div>
                        <div className={fieldGroupCls}>
                            <label className="md:col-span-2 xl:col-span-3">
                                <span className={labelCls}>Plan name</span>
                                <input
                                    className="input-base"
                                    value={form.name}
                                    onChange={(e) => onFormChange({ name: e.target.value })}
                                    placeholder="Starter"
                                />
                            </label>
                            <label>
                                <span className={labelCls}>Price / month (£)</span>
                                <NumberInput
                                    className="input-base"
                                    value={form.price_per_month}
                                    min={0}
                                    step={0.01}
                                    onChange={(e) =>
                                        onFormChange({ price_per_month: e.target.value })
                                    }
                                />
                            </label>
                            <label>
                                <span className={labelCls}>Setup fee (£)</span>
                                <NumberInput
                                    className="input-base"
                                    value={form.setup_fee}
                                    min={0}
                                    step={0.01}
                                    onChange={(e) => onFormChange({ setup_fee: e.target.value })}
                                />
                            </label>
                            <label>
                                <span className={labelCls}>Trial days</span>
                                <NumberInput
                                    className="input-base"
                                    value={form.trial_days}
                                    min={0}
                                    onChange={(e) => onFormChange({ trial_days: e.target.value })}
                                />
                            </label>
                        </div>
                    </section>

                    <section className="card-surface p-5">
                        <div className="mb-4">
                            <h2 className="text-sm font-semibold text-foreground">Limits</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Maximum clubs, courts, and staff per tenant.
                            </p>
                        </div>
                        <div className={fieldGroupCls}>
                            <label>
                                <span className={labelCls}>Max clubs</span>
                                <NumberInput
                                    className="input-base"
                                    value={form.max_clubs}
                                    min={1}
                                    onChange={(e) => onFormChange({ max_clubs: e.target.value })}
                                />
                            </label>
                            <label>
                                <span className={labelCls}>Max courts per club</span>
                                <NumberInput
                                    className="input-base"
                                    value={form.max_courts_per_club}
                                    min={1}
                                    onChange={(e) =>
                                        onFormChange({ max_courts_per_club: e.target.value })
                                    }
                                />
                            </label>
                            <label>
                                <span className={labelCls}>Max staff users</span>
                                <NumberInput
                                    className="input-base"
                                    value={form.max_staff_users}
                                    min={0}
                                    onChange={(e) =>
                                        onFormChange({ max_staff_users: e.target.value })
                                    }
                                />
                            </label>
                            <label>
                                <span className={labelCls}>Max API calls / month</span>
                                <NumberInput
                                    className="input-base"
                                    value={form.max_api_calls_per_month}
                                    min={0}
                                    onChange={(e) =>
                                        onFormChange({
                                            max_api_calls_per_month: e.target.value,
                                        })
                                    }
                                    placeholder="Unlimited"
                                />
                            </label>
                        </div>
                    </section>

                    <section className="card-surface p-5">
                        <div className="mb-4">
                            <h2 className="text-sm font-semibold text-foreground">Features</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Toggle features included in this plan.
                            </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {(
                                [
                                    ["open_games_feature", "Open games"],
                                    ["waitlist_feature", "Waitlist"],
                                    ["white_label_enabled", "White label"],
                                    ["analytics_enabled", "Analytics"],
                                ] as [keyof PlanFormState, string][]
                            ).map(([field, label]) => (
                                <label key={field} className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={form[field] as boolean}
                                        onChange={(e) =>
                                            onFormChange({ [field]: e.target.checked })
                                        }
                                        className="h-4 w-4 rounded border-border text-cta focus:ring-cta-ring"
                                    />
                                    <span className="text-sm font-medium text-foreground">
                                        {label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </section>

                    <section className="card-surface p-5">
                        <div className="mb-4">
                            <h2 className="text-sm font-semibold text-foreground">
                                Revenue sharing
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Optional fee percentages and overages.
                            </p>
                        </div>
                        <div className={fieldGroupCls}>
                            <label>
                                <span className={labelCls}>Booking fee %</span>
                                <NumberInput
                                    className="input-base"
                                    value={form.booking_fee_pct}
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    onChange={(e) =>
                                        onFormChange({ booking_fee_pct: e.target.value })
                                    }
                                    placeholder="None"
                                />
                            </label>
                            <label>
                                <span className={labelCls}>Revenue share %</span>
                                <NumberInput
                                    className="input-base"
                                    value={form.revenue_share_pct}
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    onChange={(e) =>
                                        onFormChange({ revenue_share_pct: e.target.value })
                                    }
                                    placeholder="None"
                                />
                            </label>
                            <label>
                                <span className={labelCls}>3rd-party revenue share %</span>
                                <NumberInput
                                    className="input-base"
                                    value={form.third_party_revenue_share_pct}
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    onChange={(e) =>
                                        onFormChange({
                                            third_party_revenue_share_pct: e.target.value,
                                        })
                                    }
                                    placeholder="None"
                                />
                            </label>
                            <label>
                                <span className={labelCls}>Overage fee / booking (£)</span>
                                <NumberInput
                                    className="input-base"
                                    value={form.overage_fee_per_booking}
                                    min={0}
                                    step={0.01}
                                    onChange={(e) =>
                                        onFormChange({ overage_fee_per_booking: e.target.value })
                                    }
                                    placeholder="None"
                                />
                            </label>
                        </div>
                    </section>

                    <section className="card-surface p-5">
                        <div className="mb-4">
                            <h2 className="text-sm font-semibold text-foreground">Stripe</h2>
                        </div>
                        <label>
                            <span className={labelCls}>Stripe price ID</span>
                            <input
                                className="input-base"
                                value={form.stripe_price_id}
                                onChange={(e) => onFormChange({ stripe_price_id: e.target.value })}
                                placeholder="price_xxx (optional)"
                                autoComplete="off"
                            />
                        </label>
                    </section>
                </div>

                <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-5">
                    <button type="button" onClick={onCancel} className="btn-outline">
                        Cancel
                    </button>
                    <button type="submit" disabled={isPending} className="btn-cta min-h-10 px-4">
                        <Plus size={14} />
                        {isPending ? "Creating…" : "Create Plan"}
                    </button>
                </div>
            </form>
        </div>
    );
}
