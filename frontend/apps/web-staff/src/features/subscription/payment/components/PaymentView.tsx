import { type JSX } from "react";
import { Elements } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { Breadcrumb, AlertToast } from "@repo/ui";
import { CreditCard } from "lucide-react";
import type { Subscription } from "../../types";
import { AddCardForm } from "./AddCardForm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
    // data
    subscription: Subscription | null;
    isLoading: boolean;
    error: Error | null;
    // stripe
    stripePromise: Promise<Stripe | null>;
    clientSecret: string | null;
    setupError: string | null;
    isPreparingSetup: boolean;
    // events
    onCardSaveSuccess: () => void;
    onCancelAddCard: () => void;
    onDismissSetupError: () => void;
    successMessage: string | null;
    onDismissSuccess: () => void;
};

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default function PaymentView({
    isLoading,
    error,
    stripePromise,
    clientSecret,
    setupError,
    isPreparingSetup,
    onCardSaveSuccess,
    onCancelAddCard,
    onDismissSetupError,
    successMessage,
    onDismissSuccess,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Cards" }]} />

            <section className="card-surface overflow-hidden">
                {/* ── Header ── */}
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <CreditCard size={16} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                    Cards
                                </h1>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Manage your billing card.
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── Body ── */}
                <div className="px-5 py-5 sm:px-6">
                    {/* Toast messages */}
                    {successMessage ? (
                        <div className="mb-4">
                            <AlertToast
                                title={successMessage}
                                variant="success"
                                onClose={onDismissSuccess}
                            />
                        </div>
                    ) : null}

                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-20">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">Loading…</span>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error.message}
                        </div>
                    ) : (
                        <div className="max-w-md space-y-4">
                            {setupError ? (
                                <AlertToast
                                    title={setupError}
                                    variant="error"
                                    onClose={onDismissSetupError}
                                />
                            ) : null}

                            {isPreparingSetup && !clientSecret ? (
                                <div className="flex items-center gap-2 py-4">
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-cta" />
                                    <span className="text-xs text-muted-foreground">
                                        Preparing secure form…
                                    </span>
                                </div>
                            ) : null}

                            {clientSecret && !setupError ? (
                                <Elements
                                    stripe={stripePromise}
                                    options={{
                                        clientSecret,
                                        appearance: {
                                            theme: "stripe",
                                            variables: { borderRadius: "8px" },
                                        },
                                    }}
                                >
                                    <AddCardForm
                                        clientSecret={clientSecret}
                                        onSuccess={onCardSaveSuccess}
                                        onCancel={onCancelAddCard}
                                    />
                                </Elements>
                            ) : null}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
