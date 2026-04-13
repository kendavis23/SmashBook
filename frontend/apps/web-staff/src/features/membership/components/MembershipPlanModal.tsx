import { useCreateMembershipPlan, useUpdateMembershipPlan } from "../hooks";
import type { MembershipPlan, MembershipPlanInput, BillingPeriod } from "../types";
import { AlertToast } from "@repo/ui";
import { X } from "lucide-react";
import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

const BILLING_OPTIONS: { value: BillingPeriod; label: string }[] = [
    { value: "monthly", label: "Monthly" },
    { value: "annual", label: "Annual" },
];

type Props = {
    clubId: string;
    onClose: () => void;
    onSuccess?: (message: string) => void;
    initialData?: MembershipPlan;
};

export function MembershipPlanModal({
    clubId,
    onClose,
    onSuccess,
    initialData,
}: Props): JSX.Element {
    const isEdit = !!initialData;

    const [name, setName] = useState(initialData?.name ?? "");
    const [description, setDescription] = useState(initialData?.description ?? "");
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
        initialData?.billing_period ?? "monthly"
    );
    const [price, setPrice] = useState(initialData?.price != null ? String(initialData.price) : "");
    const [trialDays, setTrialDays] = useState(
        initialData?.trial_days != null ? String(initialData.trial_days) : "0"
    );
    const [bookingCredits, setBookingCredits] = useState(
        initialData?.booking_credits_per_period != null
            ? String(initialData.booking_credits_per_period)
            : ""
    );
    const [guestPasses, setGuestPasses] = useState(
        initialData?.guest_passes_per_period != null
            ? String(initialData.guest_passes_per_period)
            : ""
    );
    const [discountPct, setDiscountPct] = useState(
        initialData?.discount_pct != null ? String(initialData.discount_pct) : ""
    );
    const [priorityDays, setPriorityDays] = useState(
        initialData?.priority_booking_days != null ? String(initialData.priority_booking_days) : ""
    );
    const [maxMembers, setMaxMembers] = useState(
        initialData?.max_active_members != null ? String(initialData.max_active_members) : ""
    );
    const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

    const [nameError, setNameError] = useState("");
    const [priceError, setPriceError] = useState("");

    const createPlan = useCreateMembershipPlan(clubId);
    const updatePlan = useUpdateMembershipPlan(clubId, initialData?.id ?? "");
    const active = isEdit ? updatePlan : createPlan;
    const isPending = active.isPending;
    const apiError = (active.error as Error | null)?.message ?? "";

    const handleSubmit = (e: FormEvent): void => {
        e.preventDefault();

        let valid = true;
        if (!name.trim()) {
            setNameError("Plan name is required.");
            valid = false;
        } else {
            setNameError("");
        }

        const parsedPrice = Number(price);
        if (!price.trim() || isNaN(parsedPrice) || parsedPrice < 0) {
            setPriceError("A valid price is required.");
            valid = false;
        } else {
            setPriceError("");
        }

        if (!valid) return;

        const toNullableInt = (val: string): number | null =>
            val.trim() ? parseInt(val, 10) : null;
        const toNullableFloat = (val: string): number | null =>
            val.trim() ? parseFloat(val) : null;

        if (isEdit) {
            updatePlan.mutate(
                {
                    name: name.trim(),
                    description: description.trim() || null,
                    billing_period: billingPeriod,
                    price: parsedPrice,
                    trial_days: parseInt(trialDays, 10) || 0,
                    booking_credits_per_period: toNullableInt(bookingCredits),
                    guest_passes_per_period: toNullableInt(guestPasses),
                    discount_pct: toNullableFloat(discountPct),
                    priority_booking_days: toNullableInt(priorityDays),
                    max_active_members: toNullableInt(maxMembers),
                    is_active: isActive,
                },
                {
                    onSuccess: () => {
                        onClose();
                        onSuccess?.("Membership plan updated successfully.");
                    },
                }
            );
        } else {
            const payload: MembershipPlanInput = {
                club_id: clubId,
                name: name.trim(),
                description: description.trim() || null,
                billing_period: billingPeriod,
                price: parsedPrice,
                trial_days: parseInt(trialDays, 10) || 0,
                booking_credits_per_period: toNullableInt(bookingCredits),
                guest_passes_per_period: toNullableInt(guestPasses),
                discount_pct: toNullableFloat(discountPct),
                priority_booking_days: toNullableInt(priorityDays),
                max_active_members: toNullableInt(maxMembers),
                is_active: isActive,
            };
            createPlan.mutate(payload, {
                onSuccess: () => {
                    onClose();
                    onSuccess?.("Membership plan created successfully.");
                },
            });
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="mt-0.5 text-base font-semibold text-foreground">
                        {isEdit ? "Edit membership plan" : "Create membership plan"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Close modal"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
                        {apiError ? (
                            <AlertToast
                                title={apiError}
                                variant="error"
                                onClose={() => active.reset()}
                            />
                        ) : null}

                        {/* Name */}
                        <div>
                            <label htmlFor="plan-name" className={labelCls}>
                                Plan Name <span className="text-destructive">*</span>
                            </label>
                            <input
                                id="plan-name"
                                type="text"
                                className={`${fieldCls} ${nameError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                placeholder="e.g. Gold Member"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (nameError) setNameError("");
                                }}
                            />
                            {nameError ? (
                                <p className="mt-1 text-xs text-destructive">{nameError}</p>
                            ) : null}
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="plan-description" className={labelCls}>
                                Description
                            </label>
                            <textarea
                                id="plan-description"
                                rows={2}
                                className={fieldCls}
                                placeholder="Optional description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Billing Period + Price */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="plan-billing" className={labelCls}>
                                    Billing Period
                                </label>
                                <select
                                    id="plan-billing"
                                    className={fieldCls}
                                    value={billingPeriod}
                                    onChange={(e) =>
                                        setBillingPeriod(e.target.value as BillingPeriod)
                                    }
                                >
                                    {BILLING_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="plan-price" className={labelCls}>
                                    Price <span className="text-destructive">*</span>
                                </label>
                                <input
                                    id="plan-price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={`${fieldCls} ${priceError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                    placeholder="e.g. 29.99"
                                    value={price}
                                    onChange={(e) => {
                                        setPrice(e.target.value);
                                        if (priceError) setPriceError("");
                                    }}
                                />
                                {priceError ? (
                                    <p className="mt-1 text-xs text-destructive">{priceError}</p>
                                ) : null}
                            </div>
                        </div>

                        {/* Trial Days */}
                        <div>
                            <label htmlFor="plan-trial" className={labelCls}>
                                Trial Days
                            </label>
                            <input
                                id="plan-trial"
                                type="number"
                                min="0"
                                step="1"
                                className={fieldCls}
                                placeholder="0"
                                value={trialDays}
                                onChange={(e) => setTrialDays(e.target.value)}
                            />
                        </div>

                        {/* Credits + Guest Passes */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="plan-credits" className={labelCls}>
                                    Booking Credits / Period
                                </label>
                                <input
                                    id="plan-credits"
                                    type="number"
                                    min="0"
                                    step="1"
                                    className={fieldCls}
                                    placeholder="Leave blank for unlimited"
                                    value={bookingCredits}
                                    onChange={(e) => setBookingCredits(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="plan-guests" className={labelCls}>
                                    Guest Passes / Period
                                </label>
                                <input
                                    id="plan-guests"
                                    type="number"
                                    min="0"
                                    step="1"
                                    className={fieldCls}
                                    placeholder="Leave blank for none"
                                    value={guestPasses}
                                    onChange={(e) => setGuestPasses(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Discount + Priority Days */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="plan-discount" className={labelCls}>
                                    Discount (%)
                                </label>
                                <input
                                    id="plan-discount"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    className={fieldCls}
                                    placeholder="e.g. 10"
                                    value={discountPct}
                                    onChange={(e) => setDiscountPct(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="plan-priority" className={labelCls}>
                                    Priority Booking Days
                                </label>
                                <input
                                    id="plan-priority"
                                    type="number"
                                    min="0"
                                    step="1"
                                    className={fieldCls}
                                    placeholder="e.g. 7"
                                    value={priorityDays}
                                    onChange={(e) => setPriorityDays(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Max Members */}
                        <div>
                            <label htmlFor="plan-max-members" className={labelCls}>
                                Max Active Members
                            </label>
                            <input
                                id="plan-max-members"
                                type="number"
                                min="0"
                                step="1"
                                className={fieldCls}
                                placeholder="Leave blank for unlimited"
                                value={maxMembers}
                                onChange={(e) => setMaxMembers(e.target.value)}
                            />
                        </div>

                        {/* Active — edit only */}
                        {isEdit ? (
                            <div className="flex items-center gap-3">
                                <input
                                    id="plan-active"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-border accent-cta"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                />
                                <label
                                    htmlFor="plan-active"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Active
                                </label>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                        <button type="button" onClick={onClose} className="btn-outline">
                            Cancel
                        </button>
                        <button type="submit" disabled={isPending} className="btn-cta">
                            {isPending
                                ? isEdit
                                    ? "Updating..."
                                    : "Creating..."
                                : isEdit
                                  ? "Update Plan"
                                  : "Create Plan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
