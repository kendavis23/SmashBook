import { useState, useCallback, useEffect } from "react";
import type { FormEvent, JSX } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGetMembershipPlan, useUpdateMembershipPlan } from "../../hooks";
import { useClubAccess } from "../../store";
import type { BillingPeriod } from "../../types";
import EditMembershipPlanView from "./EditMembershipPlanView";
import type { EditMembershipPlanFormState } from "./EditMembershipPlanView";

function toNullableInt(val: string): number | null {
    return val.trim() ? parseInt(val, 10) : null;
}

function toNullableFloat(val: string): number | null {
    return val.trim() ? parseFloat(val) : null;
}

export default function EditMembershipPlanContainer(): JSX.Element {
    const navigate = useNavigate();
    const { planId } = useParams({ strict: false }) as { planId: string };
    const { clubId } = useClubAccess();

    const { data: plan, isLoading } = useGetMembershipPlan(clubId ?? "", planId);

    const [form, setForm] = useState<EditMembershipPlanFormState>({
        name: "",
        description: "",
        billingPeriod: "monthly",
        price: "",
        trialDays: "0",
        bookingCredits: "",
        guestPasses: "",
        discountPct: "",
        priorityDays: "",
        maxMembers: "",
        isActive: true,
    });
    const [initialised, setInitialised] = useState(false);
    const [nameError, setNameError] = useState("");
    const [priceError, setPriceError] = useState("");

    // Populate form once plan data arrives
    useEffect(() => {
        if (plan && !initialised) {
            setForm({
                name: plan.name ?? "",
                description: plan.description ?? "",
                billingPeriod: (plan.billing_period as BillingPeriod) ?? "monthly",
                price: plan.price != null ? String(plan.price) : "",
                trialDays: plan.trial_days != null ? String(plan.trial_days) : "0",
                bookingCredits:
                    plan.booking_credits_per_period != null
                        ? String(plan.booking_credits_per_period)
                        : "",
                guestPasses:
                    plan.guest_passes_per_period != null
                        ? String(plan.guest_passes_per_period)
                        : "",
                discountPct: plan.discount_pct != null ? String(plan.discount_pct) : "",
                priorityDays:
                    plan.priority_booking_days != null ? String(plan.priority_booking_days) : "",
                maxMembers: plan.max_active_members != null ? String(plan.max_active_members) : "",
                isActive: plan.is_active ?? true,
            });
            setInitialised(true);
        }
    }, [plan, initialised]);

    const updatePlan = useUpdateMembershipPlan(clubId ?? "", planId);
    const apiError = (updatePlan.error as Error | null)?.message ?? "";

    const handleFormChange = useCallback((patch: Partial<EditMembershipPlanFormState>): void => {
        setForm((prev) => {
            if (patch.name !== undefined) setNameError("");
            if (patch.price !== undefined) setPriceError("");
            return { ...prev, ...patch };
        });
    }, []);

    const validate = (): boolean => {
        let valid = true;
        if (!form.name.trim()) {
            setNameError("Plan name is required.");
            valid = false;
        }
        const parsedPrice = Number(form.price);
        if (!form.price.trim() || isNaN(parsedPrice) || parsedPrice < 0) {
            setPriceError("A valid price is required.");
            valid = false;
        }
        return valid;
    };

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!validate()) return;

            updatePlan.mutate(
                {
                    name: form.name.trim(),
                    description: form.description.trim() || null,
                    billing_period: form.billingPeriod,
                    price: Number(form.price),
                    trial_days: parseInt(form.trialDays, 10) || 0,
                    booking_credits_per_period: toNullableInt(form.bookingCredits),
                    guest_passes_per_period: toNullableInt(form.guestPasses),
                    discount_pct: toNullableFloat(form.discountPct),
                    priority_booking_days: toNullableInt(form.priorityDays),
                    max_active_members: toNullableInt(form.maxMembers),
                    is_active: form.isActive,
                },
                {
                    onSuccess: () => {
                        void navigate({
                            to: "/membership-plans",
                            search: { created: undefined, updated: true },
                        });
                    },
                }
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, updatePlan, navigate]
    );

    const handleCancel = useCallback((): void => {
        void navigate({
            to: "/membership-plans",
            search: { created: undefined, updated: undefined },
        });
    }, [navigate]);

    const handleDismissError = useCallback((): void => {
        updatePlan.reset();
    }, [updatePlan]);

    if (isLoading || !initialised) {
        return (
            <div className="flex items-center justify-center gap-3 py-32">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading plan…</span>
            </div>
        );
    }

    return (
        <EditMembershipPlanView
            planName={form.name}
            form={form}
            nameError={nameError}
            priceError={priceError}
            apiError={apiError}
            isPending={updatePlan.isPending}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDismissError={handleDismissError}
        />
    );
}
