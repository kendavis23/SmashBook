import type { FormEvent, JSX } from "react";
import { Breadcrumb, AlertToast, NumberInput, SelectInput } from "@repo/ui";
import type { SelectOption } from "@repo/ui";
import type { SurfaceType } from "../../types";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

const SURFACE_OPTIONS: SelectOption[] = [
    { value: "indoor", label: "Indoor" },
    { value: "outdoor", label: "Outdoor" },
    { value: "crystal", label: "Crystal" },
    { value: "artificial_grass", label: "Artificial Grass" },
];

export type EditCourtFormState = {
    name: string;
    surfaceType: SurfaceType;
    hasLighting: boolean;
    lightingSurcharge: string;
    isActive: boolean;
};

type Props = {
    courtName: string;
    form: EditCourtFormState;
    nameError: string;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<EditCourtFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
};

export default function EditCourtView({
    courtName,
    form,
    nameError,
    apiError,
    isPending,
    onFormChange,
    onSubmit,
    onCancel,
    onDismissError,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Courts", href: "/courts" }, { label: courtName }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">
                            Edit Court
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Update court details and configuration.
                        </p>
                    </div>
                </header>

                <div className="px-5 py-6 sm:px-6">
                    {apiError ? (
                        <div className="mb-5">
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        </div>
                    ) : null}

                    <form onSubmit={onSubmit} noValidate>
                        <div className="space-y-6">
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Court Details
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Name, surface type, and lighting configuration.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label htmlFor="court-name" className={labelCls}>
                                            Court Name <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            id="court-name"
                                            type="text"
                                            className={`${fieldCls} ${nameError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                            placeholder="e.g. Court 1"
                                            value={form.name}
                                            onChange={(e) => onFormChange({ name: e.target.value })}
                                        />
                                        {nameError ? (
                                            <p className="mt-1 text-xs text-destructive">
                                                {nameError}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div>
                                        <label htmlFor="court-surface" className={labelCls}>
                                            Surface Type
                                        </label>
                                        <SelectInput
                                            name="court-surface"
                                            value={form.surfaceType}
                                            options={SURFACE_OPTIONS}
                                            onValueChange={(v) =>
                                                onFormChange({ surfaceType: v as SurfaceType })
                                            }
                                            placeholder="Select surface"
                                        />
                                    </div>

                                    <div className="flex items-end pb-1">
                                        <div className="flex items-center gap-3">
                                            <input
                                                id="court-lighting"
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-border accent-cta"
                                                checked={form.hasLighting}
                                                onChange={(e) =>
                                                    onFormChange({ hasLighting: e.target.checked })
                                                }
                                            />
                                            <label
                                                htmlFor="court-lighting"
                                                className="text-sm font-medium text-foreground"
                                            >
                                                Has Lighting
                                            </label>
                                        </div>
                                    </div>

                                    {form.hasLighting ? (
                                        <div>
                                            <label htmlFor="court-surcharge" className={labelCls}>
                                                Lighting Surcharge
                                            </label>
                                            <NumberInput
                                                id="court-surcharge"
                                                min="0"
                                                step="0.01"
                                                className={fieldCls}
                                                placeholder="e.g. 5.00"
                                                value={form.lightingSurcharge}
                                                onChange={(e) =>
                                                    onFormChange({
                                                        lightingSurcharge: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            </section>

                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Status
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Inactive courts are hidden from booking.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        id="court-active"
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border accent-cta"
                                        checked={form.isActive}
                                        onChange={(e) =>
                                            onFormChange({ isActive: e.target.checked })
                                        }
                                    />
                                    <label
                                        htmlFor="court-active"
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Active
                                    </label>
                                </div>
                            </section>
                        </div>

                        <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-5">
                            <button type="button" onClick={onCancel} className="btn-outline">
                                Cancel
                            </button>
                            <button type="submit" disabled={isPending} className="btn-cta">
                                {isPending ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
