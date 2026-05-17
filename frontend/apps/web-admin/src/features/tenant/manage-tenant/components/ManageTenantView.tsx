import { AlertToast, Breadcrumb, SelectInput, formatUTCDate } from "@repo/ui";
import type { SelectOption } from "@repo/ui";
import { Building2, CheckCircle, PauseCircle, RefreshCw } from "lucide-react";
import type { FormEvent, JSX } from "react";

import type { Plan, TenantDetail } from "../../types";

const labelCls = "mb-1.5 block text-sm font-medium text-foreground";

function statusBadge(status: string | null, isActive: boolean): JSX.Element {
    if (!isActive) {
        return (
            <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                Suspended
            </span>
        );
    }
    if (!status) {
        return (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                No subscription
            </span>
        );
    }
    const map: Record<string, { bg: string; text: string }> = {
        active: { bg: "bg-success/15", text: "text-success" },
        trialing: { bg: "bg-info/15", text: "text-info" },
        past_due: { bg: "bg-warning/15", text: "text-warning" },
        canceled: { bg: "bg-destructive/15", text: "text-destructive" },
        unpaid: { bg: "bg-destructive/15", text: "text-destructive" },
    };
    const cls = map[status] ?? { bg: "bg-muted", text: "text-muted-foreground" };
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls.bg} ${cls.text}`}
        >
            {status.replace(/_/g, " ")}
        </span>
    );
}

interface ManageTenantViewProps {
    tenant: TenantDetail;
    plans: Plan[];
    subdomainInput: string;
    customDomainInput: string;
    billingEmailInput: string;
    selectedPlanId: string;
    isUpdatePending: boolean;
    isActivatePending: boolean;
    isSuspendPending: boolean;
    isChangePlanPending: boolean;
    updateError: string | null;
    activateError: string | null;
    suspendError: string | null;
    changePlanError: string | null;
    successMessage: string | null;
    onSubdomainChange: (v: string) => void;
    onCustomDomainChange: (v: string) => void;
    onBillingEmailChange: (v: string) => void;
    onSelectedPlanChange: (v: string) => void;
    onUpdateSubmit: (e: FormEvent) => void;
    onActivate: () => void;
    onSuspend: () => void;
    onChangePlan: () => void;
    onDismissUpdateError: () => void;
    onDismissActivateError: () => void;
    onDismissSuspendError: () => void;
    onDismissChangePlanError: () => void;
    onDismissSuccess: () => void;
    onBack: () => void;
}

export default function ManageTenantView({
    tenant,
    plans,
    subdomainInput,
    customDomainInput,
    billingEmailInput,
    selectedPlanId,
    isUpdatePending,
    isActivatePending,
    isSuspendPending,
    isChangePlanPending,
    updateError,
    activateError,
    suspendError,
    changePlanError,
    successMessage,
    onSubdomainChange,
    onCustomDomainChange,
    onBillingEmailChange,
    onSelectedPlanChange,
    onUpdateSubmit,
    onActivate,
    onSuspend,
    onChangePlan,
    onDismissUpdateError,
    onDismissActivateError,
    onDismissSuspendError,
    onDismissChangePlanError,
    onDismissSuccess,
    onBack,
}: ManageTenantViewProps): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Tenants", onClick: onBack }, { label: tenant.name }]} showHomeIcon={false} />

            {/* Header */}
            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <Building2 size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        {tenant.name}
                                    </h1>
                                    {statusBadge(tenant.subscription_status, tenant.is_active)}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {tenant.subdomain} · {tenant.plan_name}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Clubs: {tenant.club_count}</span>
                        <span>·</span>
                        <span>Created: {formatUTCDate(tenant.created_at)}</span>
                    </div>
                </header>

                {/* Overview pills */}
                <div className="px-5 py-4 sm:px-6">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: "Stripe customer", value: tenant.stripe_customer_id ?? "—" },
                            {
                                label: "Stripe subscription",
                                value: tenant.stripe_subscription_id ?? "—",
                            },
                            {
                                label: "Subscription started",
                                value: tenant.subscription_start_date
                                    ? formatUTCDate(tenant.subscription_start_date)
                                    : "—",
                            },
                            {
                                label: "Last updated",
                                value: formatUTCDate(tenant.updated_at),
                            },
                        ].map(({ label, value }) => (
                            <div
                                key={label}
                                className="rounded-lg border border-border bg-muted/10 px-3 py-2"
                            >
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {label}
                                </p>
                                <p className="mt-1 truncate font-mono text-xs text-foreground">
                                    {value}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {successMessage ? (
                <AlertToast title={successMessage} variant="success" onClose={onDismissSuccess} />
            ) : null}

            {/* Domain settings + Subscription plan side by side */}
            <div className="grid gap-5 lg:grid-cols-2">
                {/* Update domain settings */}
                <section className="card-surface p-5">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold text-foreground">Domain settings</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Update subdomain and custom domain.
                        </p>
                    </div>
                    {updateError ? (
                        <div className="mb-4">
                            <AlertToast
                                title={updateError}
                                variant="error"
                                onClose={onDismissUpdateError}
                            />
                        </div>
                    ) : null}
                    <form onSubmit={onUpdateSubmit} noValidate>
                        <div className="grid gap-4">
                            <label>
                                <span className={labelCls}>Subdomain</span>
                                <input
                                    className="input-base"
                                    value={subdomainInput}
                                    onChange={(e) => onSubdomainChange(e.target.value)}
                                    placeholder="my-club"
                                    autoComplete="off"
                                />
                            </label>
                            <label>
                                <span className={labelCls}>Custom domain</span>
                                <input
                                    className="input-base"
                                    value={customDomainInput}
                                    onChange={(e) => onCustomDomainChange(e.target.value)}
                                    placeholder="app.myclub.com (optional)"
                                    autoComplete="off"
                                />
                            </label>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={isUpdatePending}
                                className="btn-cta min-h-10 px-4"
                            >
                                <RefreshCw size={14} />
                                {isUpdatePending ? "Saving…" : "Save"}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Change plan */}
                <section className="card-surface p-5">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold text-foreground">Subscription plan</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Switch this tenant to a different plan.
                        </p>
                    </div>
                    {changePlanError ? (
                        <div className="mb-4">
                            <AlertToast
                                title={changePlanError}
                                variant="error"
                                onClose={onDismissChangePlanError}
                            />
                        </div>
                    ) : null}
                    <div className="grid gap-4">
                        <div>
                            <span className={labelCls}>Plan</span>
                            <SelectInput
                                className="input-base"
                                name="plan"
                                value={selectedPlanId}
                                options={plans.map(
                                    (p): SelectOption => ({ value: p.id, label: p.name })
                                )}
                                onValueChange={onSelectedPlanChange}
                                placeholder="Select plan…"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={onChangePlan}
                            disabled={isChangePlanPending || selectedPlanId === tenant.plan_id}
                            className="btn-cta min-h-10 px-4"
                        >
                            {isChangePlanPending ? "Changing…" : "Change plan"}
                        </button>
                    </div>
                </section>
            </div>

            {/* Activate / Suspend */}
            <section className="card-surface p-5">
                <div className="mb-4">
                    <h2 className="text-sm font-semibold text-foreground">Account status</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Activate or suspend this tenant.
                    </p>
                </div>
                {activateError ? (
                    <div className="mb-4">
                        <AlertToast
                            title={activateError}
                            variant="error"
                            onClose={onDismissActivateError}
                        />
                    </div>
                ) : null}
                {suspendError ? (
                    <div className="mb-4">
                        <AlertToast
                            title={suspendError}
                            variant="error"
                            onClose={onDismissSuspendError}
                        />
                    </div>
                ) : null}
                <div className="flex flex-wrap items-end gap-4">
                    {!tenant.is_active ? (
                        <div className="flex items-end gap-3">
                            <label className="flex-1">
                                <span className={labelCls}>Billing email (optional)</span>
                                <input
                                    className="input-base"
                                    value={billingEmailInput}
                                    onChange={(e) => onBillingEmailChange(e.target.value)}
                                    placeholder="billing@myclub.com"
                                    type="email"
                                    autoComplete="off"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={onActivate}
                                disabled={isActivatePending}
                                className="btn-cta min-h-10 px-4"
                            >
                                <CheckCircle size={14} />
                                {isActivatePending ? "Activating…" : "Activate"}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={onSuspend}
                            disabled={isSuspendPending}
                            className="flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
                        >
                            <PauseCircle size={14} />
                            {isSuspendPending ? "Suspending…" : "Suspend tenant"}
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
}
