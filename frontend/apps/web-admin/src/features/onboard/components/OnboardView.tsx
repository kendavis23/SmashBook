import { AlertToast, DateTimePicker, NumberInput, SelectInput } from "@repo/ui";
import { Building2, KeyRound, Plus, Trash2, UserPlus } from "lucide-react";
import type { FormEvent, JSX } from "react";

import type { OnboardCourtForm, OnboardTenantFormState, SurfaceType } from "../types";
import { CURRENCY_OPTIONS, SURFACE_OPTIONS } from "../types";

interface OnboardViewProps {
    form: OnboardTenantFormState;
    isPending: boolean;
    apiError: string | null;
    successMessage: string | null;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onFieldChange: (field: keyof OnboardTenantFormState, value: string) => void;
    onClubFieldChange: (field: keyof OnboardTenantFormState["club"], value: string) => void;
    onOwnerFieldChange: (field: keyof OnboardTenantFormState["owner"], value: string) => void;
    onCourtFieldChange: <K extends keyof OnboardCourtForm>(
        index: number,
        field: K,
        value: OnboardCourtForm[K]
    ) => void;
    onAddCourt: () => void;
    onRemoveCourt: (index: number) => void;
    onDismissError: () => void;
    onDismissSuccess: () => void;
}

const fieldGroupCls = "grid gap-4 md:grid-cols-2";
const labelCls = "mb-1.5 block text-sm font-medium text-foreground";
const hintCls = "mt-1 text-xs text-muted-foreground";

export default function OnboardView({
    form,
    isPending,
    apiError,
    successMessage,
    onSubmit,
    onFieldChange,
    onClubFieldChange,
    onOwnerFieldChange,
    onCourtFieldChange,
    onAddCourt,
    onRemoveCourt,
    onDismissError,
    onDismissSuccess,
}: OnboardViewProps): JSX.Element {
    return (
        <form onSubmit={onSubmit} noValidate className="p-6">
            <div className="mb-6 flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="page-title">Onboard Tenant</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Create the tenant, first club, courts, and owner account.
                    </p>
                </div>
                <button type="submit" disabled={isPending} className="btn-cta min-h-10 px-4">
                    <UserPlus size={16} />
                    {isPending ? "Onboarding..." : "Onboard"}
                </button>
            </div>

            <div className="space-y-5">
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

                <section className="card-surface p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                            <KeyRound size={17} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Platform</h2>
                            <p className="text-xs text-muted-foreground">
                                The platform key is sent as the admin API header value.
                            </p>
                        </div>
                    </div>
                    <label>
                        <span className={labelCls}>Platform key</span>
                        <input
                            className="input-base"
                            value={form.platformKey}
                            onChange={(event) => onFieldChange("platformKey", event.target.value)}
                            placeholder="platform-key"
                            autoComplete="off"
                        />
                    </label>
                </section>

                <section className="card-surface p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                            <Building2 size={17} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Tenant</h2>
                            <p className="text-xs text-muted-foreground">
                                Create the tenant workspace and subscription details.
                            </p>
                        </div>
                    </div>
                    <div className={fieldGroupCls}>
                        <label>
                            <span className={labelCls}>Tenant name</span>
                            <input
                                className="input-base"
                                value={form.name}
                                onChange={(event) => onFieldChange("name", event.target.value)}
                                placeholder="Ace Padel"
                            />
                        </label>
                        <label>
                            <span className={labelCls}>Subdomain</span>
                            <input
                                className="input-base"
                                value={form.subdomain}
                                onChange={(event) => onFieldChange("subdomain", event.target.value)}
                                placeholder="ace-padel"
                                autoComplete="off"
                            />
                        </label>
                        <label>
                            <span className={labelCls}>Plan ID</span>
                            <input
                                className="input-base"
                                value={form.plan_id}
                                onChange={(event) => onFieldChange("plan_id", event.target.value)}
                                placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6"
                                autoComplete="off"
                            />
                        </label>
                        <label className="md:col-span-2">
                            <span className={labelCls}>Subscription start date</span>
                            <DateTimePicker
                                className="input-base"
                                value={form.subscription_start_date}
                                onChange={(value) =>
                                    onFieldChange("subscription_start_date", value)
                                }
                                placeholder="Pick subscription start"
                            />
                            <span className={hintCls}>
                                Optional. The value is converted to UTC before submit.
                            </span>
                        </label>
                    </div>
                </section>

                <section className="card-surface p-5">
                    <div className="mb-4">
                        <h2 className="text-base font-semibold text-foreground">Club</h2>
                    </div>
                    <div className={fieldGroupCls}>
                        <label>
                            <span className={labelCls}>Club name</span>
                            <input
                                className="input-base"
                                value={form.club.name}
                                onChange={(event) => onClubFieldChange("name", event.target.value)}
                                placeholder="Ace Padel HQ"
                            />
                        </label>
                        <label>
                            <span className={labelCls}>Currency</span>
                            <SelectInput
                                className="input-base"
                                value={form.club.currency}
                                options={CURRENCY_OPTIONS}
                                onValueChange={(value) => onClubFieldChange("currency", value)}
                            />
                        </label>
                        <label className="md:col-span-2">
                            <span className={labelCls}>Address</span>
                            <input
                                className="input-base"
                                value={form.club.address}
                                onChange={(event) =>
                                    onClubFieldChange("address", event.target.value)
                                }
                                placeholder="Club address"
                            />
                        </label>
                    </div>
                </section>

                <section className="card-surface p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Courts</h2>
                        </div>
                        <button type="button" onClick={onAddCourt} className="btn-outline">
                            <Plus size={15} />
                            Add Court
                        </button>
                    </div>

                    <div className="space-y-4">
                        {form.courts.map((court, index) => (
                            <div key={index} className="rounded-lg border border-border p-4">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Court {index + 1}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveCourt(index)}
                                        disabled={form.courts.length === 1}
                                        className="btn-outline px-2.5 py-1.5 text-xs"
                                        aria-label={`Remove court ${index + 1}`}
                                    >
                                        <Trash2 size={14} />
                                        Remove
                                    </button>
                                </div>
                                <div className={fieldGroupCls}>
                                    <label>
                                        <span className={labelCls}>Court name</span>
                                        <input
                                            className="input-base"
                                            value={court.name}
                                            onChange={(event) =>
                                                onCourtFieldChange(
                                                    index,
                                                    "name",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Court 1"
                                        />
                                    </label>
                                    <label>
                                        <span className={labelCls}>Surface type</span>
                                        <SelectInput
                                            className="input-base"
                                            value={court.surface_type}
                                            options={SURFACE_OPTIONS}
                                            onValueChange={(value) =>
                                                onCourtFieldChange(
                                                    index,
                                                    "surface_type",
                                                    value as SurfaceType
                                                )
                                            }
                                        />
                                    </label>
                                    <label>
                                        <span className={labelCls}>Lighting surcharge</span>
                                        <NumberInput
                                            className="input-base"
                                            value={court.lighting_surcharge}
                                            min={0}
                                            step={0.01}
                                            onChange={(event) =>
                                                onCourtFieldChange(
                                                    index,
                                                    "lighting_surcharge",
                                                    event.target.value
                                                )
                                            }
                                        />
                                    </label>
                                    <label className="flex items-center gap-3 pt-7">
                                        <input
                                            type="checkbox"
                                            checked={court.has_lighting}
                                            onChange={(event) =>
                                                onCourtFieldChange(
                                                    index,
                                                    "has_lighting",
                                                    event.target.checked
                                                )
                                            }
                                            className="h-4 w-4 rounded border-border text-cta focus:ring-cta-ring"
                                        />
                                        <span className="text-sm font-medium text-foreground">
                                            Has lighting
                                        </span>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="card-surface p-5">
                    <div className="mb-4">
                        <h2 className="text-base font-semibold text-foreground">Owner</h2>
                    </div>
                    <div className={fieldGroupCls}>
                        <label>
                            <span className={labelCls}>Email</span>
                            <input
                                className="input-base"
                                type="email"
                                value={form.owner.email}
                                onChange={(event) =>
                                    onOwnerFieldChange("email", event.target.value)
                                }
                                placeholder="owner@example.com"
                                autoComplete="email"
                            />
                        </label>
                        <label>
                            <span className={labelCls}>Full name</span>
                            <input
                                className="input-base"
                                value={form.owner.full_name}
                                onChange={(event) =>
                                    onOwnerFieldChange("full_name", event.target.value)
                                }
                                placeholder="Owner name"
                                autoComplete="name"
                            />
                        </label>
                        <label className="md:col-span-2">
                            <span className={labelCls}>Password</span>
                            <input
                                className="input-base"
                                type="password"
                                value={form.owner.password}
                                onChange={(event) =>
                                    onOwnerFieldChange("password", event.target.value)
                                }
                                placeholder="Temporary password"
                                autoComplete="new-password"
                            />
                        </label>
                    </div>
                </section>

                <div className="flex justify-end border-t border-border pt-5">
                    <button type="submit" disabled={isPending} className="btn-cta min-h-10 px-4">
                        <UserPlus size={16} />
                        {isPending ? "Onboarding..." : "Onboard"}
                    </button>
                </div>
            </div>
        </form>
    );
}
