import { AlertToast, Breadcrumb } from "@repo/ui";
import { Building2, MapPin, Coins, Loader2 } from "lucide-react";
import type { FormEvent, JSX } from "react";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const fieldErrorCls = "border-destructive focus:border-destructive focus:ring-destructive/20";

const labelCls = "mb-1.5 block text-sm font-medium text-foreground";

const CURRENCIES = [
    { code: "GBP", label: "GBP — British Pound" },
    { code: "EUR", label: "EUR — Euro" },
    { code: "USD", label: "USD — US Dollar" },
    { code: "AED", label: "AED — UAE Dirham" },
    { code: "AUD", label: "AUD — Australian Dollar" },
    { code: "CAD", label: "CAD — Canadian Dollar" },
    { code: "CHF", label: "CHF — Swiss Franc" },
    { code: "SEK", label: "SEK — Swedish Krona" },
];

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
                <header className="flex items-start gap-4 border-b border-border px-5 py-5 sm:px-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cta/10">
                        <Building2 size={20} className="text-cta" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">
                            New Club
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Create a new club under your organisation.
                        </p>
                    </div>
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

                            <div className="grid grid-cols-1 gap-5 max-w-md">
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
                                    <div className="relative">
                                        <MapPin
                                            size={15}
                                            className="pointer-events-none absolute left-3 top-3 text-muted-foreground"
                                        />
                                        <textarea
                                            id="club-address"
                                            rows={2}
                                            className={`${fieldCls} resize-none pl-9`}
                                            placeholder="e.g. 123 Main Street, Madrid"
                                            value={form.address}
                                            onChange={(e) =>
                                                onFormChange({ address: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Currency */}
                                <div>
                                    <label htmlFor="club-currency" className={labelCls}>
                                        Currency
                                    </label>
                                    <div className="relative">
                                        <Coins
                                            size={15}
                                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                        />
                                        <select
                                            id="club-currency"
                                            className={`${fieldCls} cursor-pointer appearance-none pl-9 pr-8`}
                                            value={form.currency}
                                            onChange={(e) =>
                                                onFormChange({ currency: e.target.value })
                                            }
                                        >
                                            {CURRENCIES.map(({ code, label }) => (
                                                <option key={code} value={code}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                        <svg
                                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                            width="12"
                                            height="12"
                                            viewBox="0 0 12 12"
                                            fill="none"
                                            aria-hidden
                                        >
                                            <path
                                                d="M2.5 4.5L6 8L9.5 4.5"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
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
