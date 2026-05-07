import { type JSX, useState, useCallback, useEffect } from "react";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useQueryClient } from "@tanstack/react-query";
import { config } from "@repo/config";
import {
    useListPaymentMethods,
    useCreateSetupIntent,
    useSavePaymentMethod,
    useDeletePaymentMethod,
    useSetDefaultPaymentMethod,
} from "@repo/player-domain/hooks";
import { AlertToast } from "@repo/ui";
import { Lock, Plus, Star, Trash2, X } from "lucide-react";
import type { PaymentMethod } from "@repo/player-domain/models";

const stripePromise = loadStripe(config.stripePublishableKey);

// ── Saved card row ────────────────────────────────────────────────────────────

function CardBrandBadge({ brand }: { brand: string }): JSX.Element {
    return (
        <div className="flex h-7 w-11 items-center justify-center rounded border border-border bg-muted text-[9px] font-bold uppercase text-muted-foreground">
            {brand}
        </div>
    );
}

function CardRow({
    card,
    onDelete,
    onSetDefault,
    isDeleting,
    isSettingDefault,
}: {
    card: PaymentMethod;
    onDelete: (id: string) => void;
    onSetDefault: (id: string) => void;
    isDeleting: boolean;
    isSettingDefault: boolean;
}): JSX.Element {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
            <CardBrandBadge brand={card.brand} />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">•••• {card.last4}</p>
                <p className="text-[11px] text-muted-foreground">
                    {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                </p>
            </div>
            {card.is_default ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-cta">
                    <Star size={9} />
                    Default
                </span>
            ) : (
                <button
                    type="button"
                    disabled={isSettingDefault}
                    onClick={() => onSetDefault(card.id)}
                    className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                >
                    Set default
                </button>
            )}
            <button
                type="button"
                disabled={isDeleting}
                onClick={() => onDelete(card.id)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                aria-label="Remove card"
            >
                <Trash2 size={13} />
            </button>
        </div>
    );
}

// ── Add-card form (must live inside <Elements>) ───────────────────────────────

function AddCardInner({
    clientSecret,
    onSuccess,
    onCancel,
    canCancel,
}: {
    clientSecret: string;
    onSuccess: () => void;
    onCancel: () => void;
    canCancel: boolean;
}): JSX.Element {
    const stripe = useStripe();
    const elements = useElements();
    const queryClient = useQueryClient();
    const savePaymentMethod = useSavePaymentMethod();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!stripe || !elements) return;
        setIsPending(true);
        setError(null);

        const { error: stripeError } = await stripe.confirmSetup({
            elements,
            confirmParams: { return_url: `${window.location.origin}/profile` },
            redirect: "if_required",
        });

        if (stripeError) {
            setIsPending(false);
            setError(stripeError.message ?? "Failed to save card.");
            return;
        }

        const { setupIntent } = await stripe.retrieveSetupIntent(clientSecret);
        const paymentMethodId = setupIntent?.payment_method as string | null;

        if (!paymentMethodId) {
            setIsPending(false);
            setError("Could not retrieve saved card — please try again.");
            return;
        }

        try {
            await savePaymentMethod.mutateAsync({ payment_method_id: paymentMethodId, set_as_default: false });
        } catch (err) {
            setIsPending(false);
            setError((err as { message?: string })?.message ?? "Failed to save card.");
            return;
        }

        setIsPending(false);
        queryClient.invalidateQueries({ queryKey: ["player", "payment-methods"] });
        onSuccess();
    }, [stripe, elements, clientSecret, savePaymentMethod, queryClient, onSuccess]);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock size={11} />
                Secure &amp; encrypted
            </div>

            <PaymentElement options={{ layout: "tabs" }} />

            {error && (
                <AlertToast title={error} variant="error" onClose={() => setError(null)} />
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
                {canCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn-outline px-4 text-sm"
                        disabled={isPending}
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void handleSubmit()}
                    className="btn-cta flex items-center justify-center gap-2 px-4 text-sm"
                >
                    {isPending ? (
                        <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                            Saving…
                        </>
                    ) : (
                        "Save card"
                    )}
                </button>
            </div>
        </div>
    );
}

// ── Main payment view ─────────────────────────────────────────────────────────

export function ProfilePaymentView(): JSX.Element {
    const { data: methods, isLoading, error } = useListPaymentMethods();
    const createSetupIntent = useCreateSetupIntent();
    const deleteMutation = useDeletePaymentMethod();
    const setDefaultMutation = useSetDefaultPaymentMethod();

    const [showAddCard, setShowAddCard] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [setupError, setSetupError] = useState<string | null>(null);

    const hasCards = !isLoading && !error && !!methods && methods.length > 0;
    const isAddCardOpen = showAddCard || (!isLoading && !error && !hasCards);

    // Auto-init setup intent when add card form should open
    useEffect(() => {
        if (!isAddCardOpen || clientSecret) return;
        let cancelled = false;

        createSetupIntent.mutateAsync()
            .then((intent) => { if (!cancelled) setClientSecret(intent.client_secret); })
            .catch((err) => { if (!cancelled) setSetupError((err as { message?: string })?.message ?? "Unable to set up card."); });

        return () => { cancelled = true; };
        // intentionally run only when isAddCardOpen flips to true
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAddCardOpen]);

    const handleDelete = useCallback((id: string) => { deleteMutation.mutate(id); }, [deleteMutation]);
    const handleSetDefault = useCallback((id: string) => { setDefaultMutation.mutate(id); }, [setDefaultMutation]);

    const handleAddDone = useCallback(() => {
        setShowAddCard(false);
        setClientSecret(null);
        setSetupError(null);
    }, []);

    const handleOpenAdd = useCallback(() => {
        setSetupError(null);
        setClientSecret(null);
        setShowAddCard(true);
    }, []);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Payment methods</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Cards used for booking payments.</p>
                </div>
                {hasCards && !showAddCard && (
                    <button
                        type="button"
                        onClick={() => void handleOpenAdd()}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                    >
                        <Plus size={12} />
                        Add card
                    </button>
                )}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center gap-2 py-3">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-xs text-muted-foreground">Loading…</span>
                </div>
            )}

            {/* List error */}
            {!isLoading && error && (
                <p className="text-xs text-destructive">Failed to load payment methods.</p>
            )}

            {/* Saved cards */}
            {hasCards && (
                <div className="space-y-2">
                    {methods!.map((card) => (
                        <CardRow
                            key={card.id}
                            card={card}
                            onDelete={handleDelete}
                            onSetDefault={handleSetDefault}
                            isDeleting={deleteMutation.isPending && deleteMutation.variables === card.id}
                            isSettingDefault={setDefaultMutation.isPending && setDefaultMutation.variables === card.id}
                        />
                    ))}
                </div>
            )}

            {/* Add card panel */}
            {isAddCardOpen && (
                <div className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-foreground">Add card</h4>
                        {hasCards && (
                            <button
                                type="button"
                                onClick={handleAddDone}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                aria-label="Close"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {setupError && (
                        <AlertToast title={setupError} variant="error" onClose={() => setSetupError(null)} />
                    )}

                    {!clientSecret && !setupError && (
                        <div className="flex items-center gap-2 py-4">
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-xs text-muted-foreground">Preparing…</span>
                        </div>
                    )}

                    {clientSecret && (
                        <Elements
                            stripe={stripePromise}
                            options={{
                                clientSecret,
                                appearance: { theme: "stripe", variables: { borderRadius: "8px" } },
                            }}
                        >
                            <AddCardInner
                                clientSecret={clientSecret}
                                onSuccess={handleAddDone}
                                onCancel={handleAddDone}
                                canCancel={hasCards}
                            />
                        </Elements>
                    )}
                </div>
            )}
        </div>
    );
}
