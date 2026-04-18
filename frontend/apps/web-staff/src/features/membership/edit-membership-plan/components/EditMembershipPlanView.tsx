import type { FormEvent, JSX } from "react";
import { Breadcrumb, AlertToast, NumberInput, SelectInput } from "@repo/ui";
import type { BillingPeriod } from "../../types";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

const BILLING_OPTIONS: { value: BillingPeriod; label: string }[] = [
    { value: "monthly", label: "Monthly" },
    { value: "annual", label: "Annual" },
];

export type EditMembershipPlanFormState = {
    name: string;
    description: string;
    billingPeriod: BillingPeriod;
    price: string;
    trialDays: string;
    bookingCredits: string;
    guestPasses: string;
    discountPct: string;
    priorityDays: string;
    maxMembers: string;
    isActive: boolean;
};

type Props = {
    planName: string;
    form: EditMembershipPlanFormState;
    nameError: string;
    priceError: string;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<EditMembershipPlanFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
};

export default function EditMembershipPlanView({
    planName,
    form,
    nameError,
    priceError,
    apiError,
    isPending,
    onFormChange,
    onSubmit,
    onCancel,
    onDismissError,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[
                    { label: "Membership Plans", href: "/membership-plans" },
                    { label: planName || "Edit Plan" },
                ]}
            />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">
                            Edit Plan
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Update the details for <strong>{planName}</strong>.
                        </p>
                    </div>
                </header>

                <div className="px-5 py-6 sm:px-6">
                    {apiError ? (
                        <div className="mb-5">
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        </div>
                    ) : null}

                    <form onSubmit={onSubmit} noValidate>
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Plan Details
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Name, description, billing period, and price.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label htmlFor="plan-name" className={labelCls}>
                                            Plan Name <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            id="plan-name"
                                            type="text"
                                            className={`${fieldCls} ${nameError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                            value={form.name}
                                            onChange={(e) => onFormChange({ name: e.target.value })}
                                        />
                                        {nameError ? (
                                            <p className="mt-1 text-xs text-destructive">
                                                {nameError}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label htmlFor="plan-description" className={labelCls}>
                                            Description
                                        </label>
                                        <textarea
                                            id="plan-description"
                                            rows={2}
                                            className={fieldCls}
                                            placeholder="Optional description visible to members"
                                            value={form.description}
                                            onChange={(e) =>
                                                onFormChange({ description: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="plan-billing" className={labelCls}>
                                            Billing Period
                                        </label>
                                        <SelectInput
                                            value={form.billingPeriod}
                                            onValueChange={(v) =>
                                                onFormChange({
                                                    billingPeriod: v as BillingPeriod,
                                                })
                                            }
                                            options={BILLING_OPTIONS}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="plan-price" className={labelCls}>
                                            Price (€) <span className="text-destructive">*</span>
                                        </label>
                                        <NumberInput
                                            id="plan-price"
                                            min={0}
                                            step={0.01}
                                            className={`${fieldCls} ${priceError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                            value={form.price}
                                            onChange={(e) =>
                                                onFormChange({ price: e.target.value })
                                            }
                                        />
                                        {priceError ? (
                                            <p className="mt-1 text-xs text-destructive">
                                                {priceError}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </section>

                            {/* Perks */}
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Perks &amp; Limits
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Credits, guest passes, priority booking, and member cap.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <label htmlFor="plan-credits" className={labelCls}>
                                            Booking Credits / Period
                                        </label>
                                        <NumberInput
                                            id="plan-credits"
                                            min={0}
                                            step={1}
                                            className={fieldCls}
                                            placeholder="Blank = unlimited"
                                            value={form.bookingCredits}
                                            onChange={(e) =>
                                                onFormChange({ bookingCredits: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="plan-guests" className={labelCls}>
                                            Guest Passes / Period
                                        </label>
                                        <NumberInput
                                            id="plan-guests"
                                            min={0}
                                            step={1}
                                            className={fieldCls}
                                            placeholder="Blank = none"
                                            value={form.guestPasses}
                                            onChange={(e) =>
                                                onFormChange({ guestPasses: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="plan-priority" className={labelCls}>
                                            Priority Booking Days
                                        </label>
                                        <NumberInput
                                            id="plan-priority"
                                            min={0}
                                            step={1}
                                            className={fieldCls}
                                            placeholder="e.g. 7"
                                            value={form.priorityDays}
                                            onChange={(e) =>
                                                onFormChange({ priorityDays: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="plan-max-members" className={labelCls}>
                                            Max Active Members
                                        </label>
                                        <NumberInput
                                            id="plan-max-members"
                                            min={0}
                                            step={1}
                                            className={fieldCls}
                                            placeholder="Blank = unlimited"
                                            value={form.maxMembers}
                                            onChange={(e) =>
                                                onFormChange({ maxMembers: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Promotions */}
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Promotions{" "}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            (optional)
                                        </span>
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Trial period and discount for new members.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="plan-trial" className={labelCls}>
                                            Trial Days
                                        </label>
                                        <NumberInput
                                            id="plan-trial"
                                            min={0}
                                            step={1}
                                            className={fieldCls}
                                            placeholder="0"
                                            value={form.trialDays}
                                            onChange={(e) =>
                                                onFormChange({ trialDays: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="plan-discount" className={labelCls}>
                                            Discount (%)
                                        </label>
                                        <NumberInput
                                            id="plan-discount"
                                            min={0}
                                            max={100}
                                            step={0.1}
                                            className={fieldCls}
                                            placeholder="e.g. 10"
                                            value={form.discountPct}
                                            onChange={(e) =>
                                                onFormChange({ discountPct: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Status */}
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Status
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Inactive plans are hidden from new members.
                                    </p>
                                </div>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        id="plan-active"
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border accent-cta"
                                        checked={form.isActive}
                                        onChange={(e) =>
                                            onFormChange({ isActive: e.target.checked })
                                        }
                                    />
                                    <span className="text-sm font-medium text-foreground">
                                        Active
                                    </span>
                                </label>
                            </section>
                        </div>

                        {/* Actions */}
                        <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-5">
                            <button type="button" onClick={onCancel} className="btn-outline">
                                Cancel
                            </button>
                            <button type="submit" disabled={isPending} className="btn-cta">
                                {isPending ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
