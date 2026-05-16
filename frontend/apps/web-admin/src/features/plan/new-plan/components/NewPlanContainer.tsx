import { useCallback, useState } from "react";
import type { FormEvent, JSX } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useCreatePlan } from "../../hooks";
import { usePlatformKeyStore } from "../../store/platformKey";
import type { PlanFormState, PlanInput } from "../../types";
import { DEFAULT_PLAN_FORM } from "../../types";
import NewPlanView from "./NewPlanView";

function toOptionalNumber(value: string): number | null {
    const n = Number(value);
    return value.trim() === "" || Number.isNaN(n) ? null : n;
}

function buildPayload(form: PlanFormState): PlanInput {
    return {
        name: form.name.trim(),
        max_clubs: Number(form.max_clubs),
        max_courts_per_club: Number(form.max_courts_per_club),
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

export default function NewPlanContainer(): JSX.Element {
    const navigate = useNavigate();
    const { platformKey } = usePlatformKeyStore();
    const [form, setForm] = useState<PlanFormState>(DEFAULT_PLAN_FORM);
    const createPlan = useCreatePlan(platformKey);

    const handleFormChange = useCallback((patch: Partial<PlanFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    }, []);

    const handleSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            createPlan.mutate(buildPayload(form), {
                onSuccess: () => void navigate({ to: "/plans" as never }),
            });
        },
        [form, createPlan, navigate]
    );

    const handleCancel = useCallback(() => void navigate({ to: "/plans" as never }), [navigate]);

    return (
        <NewPlanView
            form={form}
            isPending={createPlan.isPending}
            apiError={(createPlan.error as Error | null)?.message ?? null}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDismissError={() => createPlan.reset()}
        />
    );
}
