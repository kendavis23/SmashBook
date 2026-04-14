import { useState, useCallback } from "react";
import type { FormEvent, JSX } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCreateMembershipPlan } from "../../hooks";
import { useClubAccess } from "../../store";
import type { BillingPeriod, MembershipPlanInput } from "../../types";
import NewMembershipPlanView from "./NewMembershipPlanView";
import type { NewMembershipPlanFormState } from "./NewMembershipPlanView";

function createDefaultForm(): NewMembershipPlanFormState {
    return {
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
    };
}

function toNullableInt(val: string): number | null {
    return val.trim() ? parseInt(val, 10) : null;
}

function toNullableFloat(val: string): number | null {
    return val.trim() ? parseFloat(val) : null;
}

export default function NewMembershipPlanContainer(): JSX.Element {
    const navigate = useNavigate();
    const { clubId } = useClubAccess();
    const [form, setForm] = useState<NewMembershipPlanFormState>(createDefaultForm);
    const [nameError, setNameError] = useState("");
    const [priceError, setPriceError] = useState("");

    const createPlan = useCreateMembershipPlan(clubId ?? "");
    const apiError = (createPlan.error as Error | null)?.message ?? "";

    const handleFormChange = useCallback((patch: Partial<NewMembershipPlanFormState>): void => {
        setForm((prev) => {
            const next = { ...prev, ...patch };
            if (patch.name !== undefined) setNameError("");
            if (patch.price !== undefined) setPriceError("");
            return next;
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

            const payload: MembershipPlanInput = {
                club_id: clubId ?? "",
                name: form.name.trim(),
                description: form.description.trim() || null,
                billing_period: form.billingPeriod as BillingPeriod,
                price: Number(form.price),
                trial_days: parseInt(form.trialDays, 10) || 0,
                booking_credits_per_period: toNullableInt(form.bookingCredits),
                guest_passes_per_period: toNullableInt(form.guestPasses),
                discount_pct: toNullableFloat(form.discountPct),
                priority_booking_days: toNullableInt(form.priorityDays),
                max_active_members: toNullableInt(form.maxMembers),
                is_active: true,
            };

            createPlan.mutate(payload, {
                onSuccess: () => {
                    void navigate({
                        to: "/membership-plans",
                        search: { created: true, updated: undefined },
                    });
                },
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, clubId, createPlan, navigate]
    );

    const handleCancel = useCallback((): void => {
        void navigate({
            to: "/membership-plans",
            search: { created: undefined, updated: undefined },
        });
    }, [navigate]);

    const handleDismissError = useCallback((): void => {
        createPlan.reset();
    }, [createPlan]);

    return (
        <NewMembershipPlanView
            form={form}
            nameError={nameError}
            priceError={priceError}
            apiError={apiError}
            isPending={createPlan.isPending}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDismissError={handleDismissError}
        />
    );
}
