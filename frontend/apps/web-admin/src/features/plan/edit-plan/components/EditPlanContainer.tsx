import { useCallback, useEffect, useState } from "react";
import type { FormEvent, JSX } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

import { useGetPlan, useUpdatePlan } from "../../hooks";
import { usePlatformKeyStore } from "../../store/platformKey";
import type { Plan, PlanFormState, PlanUpdateInput } from "../../types";
import { DEFAULT_PLAN_FORM } from "../../types";
import EditPlanView from "./EditPlanView";

function toStr(value: number | null | undefined): string {
    return value !== null && value !== undefined ? String(value) : "";
}

function mapPlanToForm(plan: Plan): PlanFormState {
    return {
        name: plan.name,
        max_clubs: String(plan.max_clubs),
        max_courts_per_club: String(plan.max_courts_per_club),
        max_staff_users: String(plan.max_staff_users),
        open_games_feature: plan.open_games_feature,
        waitlist_feature: plan.waitlist_feature,
        white_label_enabled: plan.white_label_enabled,
        analytics_enabled: plan.analytics_enabled,
        price_per_month: String(plan.price_per_month),
        setup_fee: String(plan.setup_fee),
        trial_days: String(plan.trial_days),
        booking_fee_pct: toStr(plan.booking_fee_pct),
        revenue_share_pct: toStr(plan.revenue_share_pct),
        third_party_revenue_share_pct: toStr(plan.third_party_revenue_share_pct),
        overage_fee_per_booking: toStr(plan.overage_fee_per_booking),
        max_api_calls_per_month: toStr(plan.max_api_calls_per_month),
        stripe_price_id: plan.stripe_price_id ?? "",
    };
}

function toOptionalNumber(value: string): number | null {
    const n = Number(value);
    return value.trim() === "" || Number.isNaN(n) ? null : n;
}

function buildPayload(form: PlanFormState): PlanUpdateInput {
    return {
        name: form.name.trim() || null,
        max_clubs: Number(form.max_clubs) || null,
        max_courts_per_club: Number(form.max_courts_per_club) || null,
        max_staff_users: Number(form.max_staff_users),
        open_games_feature: form.open_games_feature,
        waitlist_feature: form.waitlist_feature,
        white_label_enabled: form.white_label_enabled,
        analytics_enabled: form.analytics_enabled,
        price_per_month: Number(form.price_per_month),
        setup_fee: Number(form.setup_fee),
        trial_days: Number(form.trial_days),
        booking_fee_pct: toOptionalNumber(form.booking_fee_pct),
        revenue_share_pct: toOptionalNumber(form.revenue_share_pct),
        third_party_revenue_share_pct: toOptionalNumber(form.third_party_revenue_share_pct),
        overage_fee_per_booking: toOptionalNumber(form.overage_fee_per_booking),
        max_api_calls_per_month: toOptionalNumber(form.max_api_calls_per_month),
        stripe_price_id: form.stripe_price_id.trim() || null,
    };
}

export default function EditPlanContainer(): JSX.Element {
    const navigate = useNavigate();
    const { planId } = useParams({ strict: false }) as { planId: string };
    const { platformKey } = usePlatformKeyStore();

    const { data: plan, isLoading } = useGetPlan(platformKey, planId);
    const updatePlan = useUpdatePlan(platformKey, planId);

    const [form, setForm] = useState<PlanFormState>(DEFAULT_PLAN_FORM);
    const [initialised, setInitialised] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (plan && !initialised) {
            setForm(mapPlanToForm(plan));
            setInitialised(true);
        }
    }, [plan, initialised]);

    const handleFormChange = useCallback((patch: Partial<PlanFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    }, []);

    const handleSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            updatePlan.mutate(buildPayload(form), {
                onSuccess: () => setSuccessMessage("Plan updated successfully."),
            });
        },
        [form, updatePlan]
    );

    const handleCancel = useCallback(() => void navigate({ to: "/plans" as never }), [navigate]);

    if (isLoading || !initialised) {
        return (
            <div className="flex items-center justify-center gap-3 py-32">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
        );
    }

    return (
        <EditPlanView
            planName={plan?.name ?? ""}
            form={form}
            isPending={updatePlan.isPending}
            apiError={(updatePlan.error as Error | null)?.message ?? null}
            successMessage={successMessage}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDismissError={() => updatePlan.reset()}
            onDismissSuccess={() => setSuccessMessage(null)}
        />
    );
}
