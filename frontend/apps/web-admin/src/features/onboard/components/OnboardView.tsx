import { AlertToast, Breadcrumb, DateTimePicker, SelectInput } from "@repo/ui";
import { Building2, Globe, Plus, Trash2, UserPlus, Users } from "lucide-react";
import type { FormEvent, JSX, ReactNode } from "react";

import type { OnboardClubForm, OnboardTenantFormState } from "../types";
import { CURRENCY_OPTIONS } from "../types";

interface PlanOption {
    value: string;
    label: string;
}

interface OnboardViewProps {
    form: OnboardTenantFormState;
    planOptions: PlanOption[];
    isPending: boolean;
    apiError: string | null;
    successMessage: string | null;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onFieldChange: (field: keyof OnboardTenantFormState, value: string) => void;
    onClubFieldChange: (index: number, field: keyof OnboardClubForm, value: string) => void;
    onOwnerFieldChange: (field: keyof OnboardTenantFormState["owner"], value: string) => void;
    onAddClub: () => void;
    onRemoveClub: (index: number) => void;
    onDismissError: () => void;
    onDismissSuccess: () => void;
}

function Field({
    label,
    hint,
    children,
    span2 = false,
}: {
    label: string;
    hint?: string;
    children: ReactNode;
    span2?: boolean;
}): JSX.Element {
    return (
        <div className={span2 ? "col-span-2" : undefined}>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {label}
            </label>
            {children}
            {hint ? <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p> : null}
        </div>
    );
}

function Card({
    icon,
    title,
    action,
    children,
}: {
    icon: JSX.Element;
    title: string;
    action?: JSX.Element;
    children: ReactNode;
}): JSX.Element {
    return (
        <div className="flex flex-col rounded-xl border border-border bg-background shadow-sm">
            <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background text-foreground shadow-xs ring-1 ring-border">
                        {icon}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{title}</span>
                </div>
                {action}
            </div>
            <div className="flex-1 p-4">{children}</div>
        </div>
    );
}

export default function OnboardView({
    form,
    planOptions,
    isPending,
    apiError,
    successMessage,
    onSubmit,
    onFieldChange,
    onClubFieldChange,
    onOwnerFieldChange,
    onAddClub,
    onRemoveClub,
    onDismissError,
    onDismissSuccess,
}: OnboardViewProps): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Onboard" }]} showHomeIcon={false} />

            <form onSubmit={onSubmit} noValidate className="space-y-5">
                {/* Page header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="page-title">Onboard Tenant</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Create the tenant, clubs, and owner account.
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="btn-cta min-h-10 shrink-0 px-5"
                    >
                        <UserPlus size={15} />
                        {isPending ? "Onboarding..." : "Onboard"}
                    </button>
                </div>

                {/* Alerts */}
                {apiError ? (
                    <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                ) : null}
                {successMessage ? (
                    <AlertToast
                        title={successMessage}
                        variant="success"
                        onClose={onDismissSuccess}
                    />
                ) : null}

                {/* 2-column grid */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Tenant */}
                    <Card icon={<Globe size={14} />} title="Tenant">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
                            <Field label="Tenant name" span2>
                                <input
                                    className="input-base"
                                    value={form.name}
                                    onChange={(e) => onFieldChange("name", e.target.value)}
                                    placeholder="Ace Padel"
                                />
                            </Field>
                            <Field label="Subdomain">
                                <input
                                    className="input-base"
                                    value={form.subdomain}
                                    onChange={(e) => onFieldChange("subdomain", e.target.value)}
                                    placeholder="ace-padel"
                                    autoComplete="off"
                                />
                            </Field>
                            <Field label="Plan">
                                <SelectInput
                                    className="input-base"
                                    value={form.plan_id}
                                    options={planOptions}
                                    onValueChange={(value) => onFieldChange("plan_id", value)}
                                />
                            </Field>
                            <Field label="Subscription start" hint="Optional · UTC" span2>
                                <DateTimePicker
                                    className="input-base"
                                    value={form.subscription_start_date}
                                    onChange={(value) =>
                                        onFieldChange("subscription_start_date", value)
                                    }
                                    placeholder="Pick a date"
                                />
                            </Field>
                        </div>
                    </Card>

                    {/* Owner */}
                    <Card icon={<Users size={14} />} title="Owner">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
                            <Field label="Email" span2>
                                <input
                                    className="input-base"
                                    type="email"
                                    value={form.owner.email}
                                    onChange={(e) => onOwnerFieldChange("email", e.target.value)}
                                    placeholder="owner@example.com"
                                    autoComplete="email"
                                />
                            </Field>
                            <Field label="Full name" span2>
                                <input
                                    className="input-base"
                                    value={form.owner.full_name}
                                    onChange={(e) =>
                                        onOwnerFieldChange("full_name", e.target.value)
                                    }
                                    placeholder="Owner name"
                                    autoComplete="name"
                                />
                            </Field>
                            <Field label="Password" span2>
                                <input
                                    className="input-base"
                                    type="password"
                                    value={form.owner.password}
                                    onChange={(e) => onOwnerFieldChange("password", e.target.value)}
                                    placeholder="Temporary password"
                                    autoComplete="new-password"
                                />
                            </Field>
                        </div>
                    </Card>
                </div>

                {/* Clubs — full width, repeatable */}
                <Card
                    icon={<Building2 size={14} />}
                    title="Clubs"
                    action={
                        <button
                            type="button"
                            onClick={onAddClub}
                            className="btn-outline min-h-7 px-2.5 text-xs"
                        >
                            <Plus size={12} />
                            Add
                        </button>
                    }
                >
                    <div className="space-y-3">
                        {form.clubs.map((club, index) => (
                            <div
                                key={index}
                                className="rounded-lg border border-border bg-muted/20 p-3"
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground/60">
                                        Club {index + 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveClub(index)}
                                        disabled={form.clubs.length === 1}
                                        className="btn-outline min-h-6 px-2 text-[11px] disabled:opacity-40"
                                        aria-label={`Remove club ${index + 1}`}
                                    >
                                        <Trash2 size={11} />
                                        Remove
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                                    <Field label="Club name">
                                        <input
                                            className="input-base"
                                            value={club.name}
                                            onChange={(e) =>
                                                onClubFieldChange(index, "name", e.target.value)
                                            }
                                            placeholder="Ace Padel HQ"
                                        />
                                    </Field>
                                    <Field label="Currency">
                                        <SelectInput
                                            className="input-base"
                                            value={club.currency}
                                            options={CURRENCY_OPTIONS}
                                            onValueChange={(value) =>
                                                onClubFieldChange(index, "currency", value)
                                            }
                                        />
                                    </Field>
                                    <Field label="Address" span2>
                                        <input
                                            className="input-base"
                                            value={club.address}
                                            onChange={(e) =>
                                                onClubFieldChange(index, "address", e.target.value)
                                            }
                                            placeholder="Club address"
                                        />
                                    </Field>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Footer */}
                <div className="flex justify-end border-t border-border pt-4">
                    <button type="submit" disabled={isPending} className="btn-cta min-h-10 px-5">
                        <UserPlus size={15} />
                        {isPending ? "Onboarding..." : "Onboard"}
                    </button>
                </div>
            </form>
        </div>
    );
}
