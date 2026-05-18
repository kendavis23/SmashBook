import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { datetimeLocalToUTC } from "@repo/ui";

import { usePlatformKeyStore } from "../../plan/store/platformKey";
import { useListPlans, useOnboardTenant } from "../hooks";
import type { OnboardClubForm, OnboardTenantFormState, TenantOnboardInput } from "../types";
import { DEFAULT_CLUB, DEFAULT_ONBOARD_FORM } from "../types";
import OnboardView from "./OnboardView";

function trimOrNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function buildPayload(form: OnboardTenantFormState): TenantOnboardInput {
    return {
        name: form.name.trim(),
        subdomain: form.subdomain.trim(),
        plan_id: form.plan_id.trim(),
        subscription_start_date: form.subscription_start_date
            ? datetimeLocalToUTC(form.subscription_start_date)
            : null,
        clubs: form.clubs.map((club) => ({
            name: club.name.trim(),
            address: trimOrNull(club.address),
            currency: club.currency,
        })),
        owner: {
            email: form.owner.email.trim(),
            full_name: form.owner.full_name.trim(),
            password: form.owner.password,
        },
    };
}

function validateForm(form: OnboardTenantFormState, platformKey: string): string | null {
    if (!platformKey.trim()) return "Platform key is required.";
    if (!form.name.trim()) return "Tenant name is required.";
    if (!form.subdomain.trim()) return "Subdomain is required.";
    if (!form.plan_id.trim()) return "Plan ID is required.";
    if (form.clubs.length === 0) return "Add at least one club.";
    if (form.clubs.some((club) => !club.name.trim())) return "Every club needs a name.";
    if (!form.owner.email.trim()) return "Owner email is required.";
    if (!form.owner.full_name.trim()) return "Owner full name is required.";
    if (!form.owner.password) return "Owner password is required.";
    return null;
}

export default function OnboardContainer(): JSX.Element {
    const { platformKey } = usePlatformKeyStore();
    const [form, setForm] = useState<OnboardTenantFormState>(DEFAULT_ONBOARD_FORM);
    const [apiError, setApiError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const onboardTenant = useOnboardTenant(platformKey);
    const { data: plans = [] } = useListPlans(platformKey);

    const planOptions = plans.map((plan) => ({ value: plan.id, label: plan.name }));

    const firstPlanId = plans[0]?.id ?? "";
    const effectivePlanId = form.plan_id || firstPlanId;

    const updateField = (field: keyof OnboardTenantFormState, value: string): void => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const updateClubField = (index: number, field: keyof OnboardClubForm, value: string): void => {
        setForm((current) => ({
            ...current,
            clubs: current.clubs.map((club, clubIndex) =>
                clubIndex === index ? { ...club, [field]: value } : club
            ),
        }));
    };

    const updateOwnerField = (
        field: keyof OnboardTenantFormState["owner"],
        value: string
    ): void => {
        setForm((current) => ({
            ...current,
            owner: { ...current.owner, [field]: value },
        }));
    };

    const addClub = (): void => {
        setForm((current) => ({
            ...current,
            clubs: [...current.clubs, { ...DEFAULT_CLUB }],
        }));
    };

    const removeClub = (index: number): void => {
        setForm((current) => ({
            ...current,
            clubs:
                current.clubs.length === 1
                    ? current.clubs
                    : current.clubs.filter((_, clubIndex) => clubIndex !== index),
        }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        setApiError(null);
        setSuccessMessage(null);

        const resolvedForm = { ...form, plan_id: effectivePlanId };
        const validationError = validateForm(resolvedForm, platformKey);
        if (validationError) {
            setApiError(validationError);
            return;
        }

        onboardTenant.mutate(buildPayload(resolvedForm), {
            onSuccess: (result) => {
                setSuccessMessage(`Tenant onboarded. Tenant ID: ${result.tenant_id}`);
            },
            onError: (error) => {
                setApiError(error.message);
            },
        });
    };

    return (
        <OnboardView
            form={{ ...form, plan_id: effectivePlanId }}
            planOptions={planOptions}
            isPending={onboardTenant.isPending}
            apiError={apiError}
            successMessage={successMessage}
            onSubmit={handleSubmit}
            onFieldChange={updateField}
            onClubFieldChange={updateClubField}
            onOwnerFieldChange={updateOwnerField}
            onAddClub={addClub}
            onRemoveClub={removeClub}
            onDismissError={() => setApiError(null)}
            onDismissSuccess={() => setSuccessMessage(null)}
        />
    );
}
