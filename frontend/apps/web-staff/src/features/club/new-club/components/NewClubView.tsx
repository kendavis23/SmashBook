import { AlertToast, Breadcrumb, SelectInput } from "@repo/ui";
import { Building2, Coins, Loader2 } from "lucide-react";
import type { FormEvent, JSX } from "react";
import { CURRENCIES } from "../../types";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const fieldErrorCls = "border-destructive focus:border-destructive focus:ring-destructive/20";

const labelCls = "mb-1.5 block text-sm font-medium text-foreground";

export type NewClubFormState = {
    name: string;
    address: string;
    currency: string;
};

type Props = {
    form: NewClubFormState;
    nameError: string;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<NewClubFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
};

export default function NewClubView({
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
            <Breadcrumb items={[{ label: "Clubs", href: "/clubs" }, { label: "New Club" }]} />

            <section className="card-surface overflow-hidden">
                <header className="border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                        New Club
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Create a new club under your organisation.
                    </p>
                </header>

                <div className="px-5 py-6 sm:px-6">
                    {apiError ? (
                        <div className="mb-6">
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        </div>
                    ) : null}

                    <form onSubmit={onSubmit} noValidate>
                        <section className="form-section">
                            <div className="mb-5">
                                <h3 className="text-sm font-semibold text-foreground">
                                    Club Details
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Basic information about the club.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {/* Club Name */}
                                <div>
                                    <label htmlFor="club-name" className={labelCls}>
                                        Club Name{" "}
                                        <span className="text-destructive" aria-hidden>
                                            *
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <Building2
                                            size={15}
                                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                        />
                                        <input
                                            id="club-name"
                                            type="text"
                                            aria-required
                                            aria-invalid={!!nameError}
                                            aria-describedby={
                                                nameError ? "club-name-error" : undefined
                                            }
                                            className={`${fieldCls} pl-9 ${nameError ? fieldErrorCls : ""}`}
                                            placeholder="e.g. Padel Club Madrid"
                                            value={form.name}
                                            onChange={(e) => onFormChange({ name: e.target.value })}
                                        />
                                    </div>
                                    {nameError ? (
                                        <p
                                            id="club-name-error"
                                            className="mt-1.5 text-xs text-destructive"
                                        >
                                            {nameError}
                                        </p>
                                    ) : null}
                                </div>

                                {/* Address */}
                                <div>
                                    <label htmlFor="club-address" className={labelCls}>
                                        Address
                                    </label>
                                    <textarea
                                        id="club-address"
                                        rows={3}
                                        className={fieldCls}
                                        placeholder="e.g. 123 Main Street, Madrid"
                                        value={form.address}
                                        onChange={(e) => onFormChange({ address: e.target.value })}
                                    />
                                </div>

                                {/* Currency */}
                                <div>
                                    <label htmlFor="club-currency" className={labelCls}>
                                        Currency
                                    </label>
                                    <SelectInput
                                        name="club-currency"
                                        value={form.currency}
                                        onValueChange={(v) => onFormChange({ currency: v })}
                                        startIcon={<Coins size={15} />}
                                        options={CURRENCIES.map(({ code, label }) => ({
                                            value: code,
                                            label,
                                        }))}
                                    />
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        Used for pricing and billing.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-5">
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={isPending}
                                className="btn-outline"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="btn-cta inline-flex items-center gap-2"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Creating…
                                    </>
                                ) : (
                                    "Create Club"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
