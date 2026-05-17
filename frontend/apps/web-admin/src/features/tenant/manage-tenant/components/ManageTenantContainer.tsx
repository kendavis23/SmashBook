import { useCallback, useEffect, useState } from "react";
import type { FormEvent, JSX } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

import {
    useActivateTenant,
    useChangeTenantPlan,
    useGetTenant,
    useSuspendTenant,
    useUpdateTenant,
} from "../../hooks";
import { useListPlans } from "../../../plan/hooks";
import { usePlatformKeyStore } from "../../../plan/store/platformKey";
import ManageTenantView from "./ManageTenantView";

export default function ManageTenantContainer(): JSX.Element {
    const navigate = useNavigate();
    const { tenantId } = useParams({ strict: false }) as { tenantId: string };
    const { platformKey } = usePlatformKeyStore();

    const { data: tenant, isLoading } = useGetTenant(platformKey, tenantId);
    const { data: plans } = useListPlans(platformKey);

    const updateTenant = useUpdateTenant(platformKey, tenantId);
    const activateTenant = useActivateTenant(platformKey, tenantId);
    const suspendTenant = useSuspendTenant(platformKey, tenantId);
    const changePlan = useChangeTenantPlan(platformKey, tenantId);

    const [subdomainInput, setSubdomainInput] = useState("");
    const [customDomainInput, setCustomDomainInput] = useState("");
    const [billingEmailInput, setBillingEmailInput] = useState("");
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [initialised, setInitialised] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (tenant && !initialised) {
            setSubdomainInput(tenant.subdomain);
            setCustomDomainInput(tenant.custom_domain ?? "");
            setSelectedPlanId(tenant.plan_id);
            setInitialised(true);
        }
    }, [tenant, initialised]);

    const handleUpdateSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            updateTenant.mutate(
                {
                    subdomain: subdomainInput.trim() || null,
                    custom_domain: customDomainInput.trim() || null,
                },
                { onSuccess: () => setSuccessMessage("Tenant updated.") }
            );
        },
        [subdomainInput, customDomainInput, updateTenant]
    );

    const handleActivate = useCallback(() => {
        activateTenant.mutate(
            { billing_email: billingEmailInput.trim() || null },
            { onSuccess: () => setSuccessMessage("Tenant activated.") }
        );
    }, [billingEmailInput, activateTenant]);

    const handleSuspend = useCallback(() => {
        suspendTenant.mutate(undefined, {
            onSuccess: () => setSuccessMessage("Tenant suspended."),
        });
    }, [suspendTenant]);

    const handleChangePlan = useCallback(() => {
        if (!selectedPlanId) return;
        changePlan.mutate(
            { plan_id: selectedPlanId },
            { onSuccess: () => setSuccessMessage("Plan changed.") }
        );
    }, [selectedPlanId, changePlan]);

    const handleBack = useCallback(() => void navigate({ to: "/tenants" as never }), [navigate]);

    if (isLoading || !initialised) {
        return (
            <div className="flex items-center justify-center gap-3 py-32">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
        );
    }

    if (!tenant) {
        return <div className="p-6 text-sm text-muted-foreground">Tenant not found.</div>;
    }

    return (
        <ManageTenantView
            tenant={tenant}
            plans={plans ?? []}
            subdomainInput={subdomainInput}
            customDomainInput={customDomainInput}
            billingEmailInput={billingEmailInput}
            selectedPlanId={selectedPlanId}
            isUpdatePending={updateTenant.isPending}
            isActivatePending={activateTenant.isPending}
            isSuspendPending={suspendTenant.isPending}
            isChangePlanPending={changePlan.isPending}
            updateError={(updateTenant.error as Error | null)?.message ?? null}
            activateError={(activateTenant.error as Error | null)?.message ?? null}
            suspendError={(suspendTenant.error as Error | null)?.message ?? null}
            changePlanError={(changePlan.error as Error | null)?.message ?? null}
            successMessage={successMessage}
            onSubdomainChange={setSubdomainInput}
            onCustomDomainChange={setCustomDomainInput}
            onBillingEmailChange={setBillingEmailInput}
            onSelectedPlanChange={setSelectedPlanId}
            onUpdateSubmit={handleUpdateSubmit}
            onActivate={handleActivate}
            onSuspend={handleSuspend}
            onChangePlan={handleChangePlan}
            onDismissUpdateError={() => updateTenant.reset()}
            onDismissActivateError={() => activateTenant.reset()}
            onDismissSuspendError={() => suspendTenant.reset()}
            onDismissChangePlanError={() => changePlan.reset()}
            onDismissSuccess={() => setSuccessMessage(null)}
            onBack={handleBack}
        />
    );
}
