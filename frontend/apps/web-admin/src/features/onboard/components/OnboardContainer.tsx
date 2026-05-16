import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { datetimeLocalToUTC } from "@repo/ui";

import { useOnboardTenant } from "../hooks";
import type { OnboardCourtForm, OnboardTenantFormState, TenantOnboardInput } from "../types";
import { DEFAULT_COURT, DEFAULT_ONBOARD_FORM } from "../types";
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
        club: {
            name: form.club.name.trim(),
            address: trimOrNull(form.club.address),
            currency: form.club.currency,
        },
        courts: form.courts.map((court) => ({
            name: court.name.trim(),
            surface_type: court.surface_type,
            has_lighting: court.has_lighting,
            lighting_surcharge: court.lighting_surcharge ? Number(court.lighting_surcharge) : null,
        })),
        owner: {
            email: form.owner.email.trim(),
            full_name: form.owner.full_name.trim(),
            password: form.owner.password,
        },
    };
}

function validateForm(form: OnboardTenantFormState): string | null {
    if (!form.platformKey.trim()) return "Platform key is required.";
    if (!form.name.trim()) return "Tenant name is required.";
    if (!form.subdomain.trim()) return "Subdomain is required.";
    if (!form.plan_id.trim()) return "Plan ID is required.";
    if (!form.club.name.trim()) return "Club name is required.";
    if (form.courts.length === 0) return "Add at least one court.";
    if (form.courts.some((court) => !court.name.trim())) return "Every court needs a name.";
    if (!form.owner.email.trim()) return "Owner email is required.";
    if (!form.owner.full_name.trim()) return "Owner full name is required.";
    if (!form.owner.password) return "Owner password is required.";
    if (
        form.courts.some(
            (court) =>
                court.lighting_surcharge !== "" && Number.isNaN(Number(court.lighting_surcharge))
        )
    ) {
        return "Lighting surcharge must be a valid number.";
    }
    return null;
}

export default function OnboardContainer(): JSX.Element {
    const [form, setForm] = useState<OnboardTenantFormState>(DEFAULT_ONBOARD_FORM);
    const [apiError, setApiError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const onboardTenant = useOnboardTenant(form.platformKey.trim());

    const updateField = (field: keyof OnboardTenantFormState, value: string): void => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const updateClubField = (field: keyof OnboardTenantFormState["club"], value: string): void => {
        setForm((current) => ({
            ...current,
            club: { ...current.club, [field]: value },
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

    const updateCourtField = <K extends keyof OnboardCourtForm>(
        index: number,
        field: K,
        value: OnboardCourtForm[K]
    ): void => {
        setForm((current) => ({
            ...current,
            courts: current.courts.map((court, courtIndex) =>
                courtIndex === index ? { ...court, [field]: value } : court
            ),
        }));
    };

    const addCourt = (): void => {
        setForm((current) => ({
            ...current,
            courts: [...current.courts, { ...DEFAULT_COURT }],
        }));
    };

    const removeCourt = (index: number): void => {
        setForm((current) => ({
            ...current,
            courts:
                current.courts.length === 1
                    ? current.courts
                    : current.courts.filter((_, courtIndex) => courtIndex !== index),
        }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        setApiError(null);
        setSuccessMessage(null);

        const validationError = validateForm(form);
        if (validationError) {
            setApiError(validationError);
            return;
        }

        onboardTenant.mutate(buildPayload(form), {
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
            form={form}
            isPending={onboardTenant.isPending}
            apiError={apiError}
            successMessage={successMessage}
            onSubmit={handleSubmit}
            onFieldChange={updateField}
            onClubFieldChange={updateClubField}
            onOwnerFieldChange={updateOwnerField}
            onCourtFieldChange={updateCourtField}
            onAddCourt={addCourt}
            onRemoveCourt={removeCourt}
            onDismissError={() => setApiError(null)}
            onDismissSuccess={() => setSuccessMessage(null)}
        />
    );
}
